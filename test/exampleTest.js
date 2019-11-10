/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */


const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const Crypto = AeSDK.Crypto;
const MemoryAccount = AeSDK.MemoryAccount;
const ECDH_CONTRACT_PATH = "./contracts/ECDH.aes";
const CONTRACT_SOURCE = utils.readFileRelative(ECDH_CONTRACT_PATH, 'utf-8');

describe('ECDH Contract', () => {

    let deployer, alice, bob, ecdhInstance;
    let dummy_data = "crypto is awesome";
    let data_encryption_key = "secret";
    let ownerKeyPair = wallets[0];
    let client;
    
    before(async () => {
        client = await Universal({
            url: "http://localhost:3001",
            internalUrl: "http://localhost:3001/internal",
            accounts: [
                MemoryAccount({ keypair: { secretKey: wallets[0].secretKey, publicKey: wallets[0].publicKey } }),
                MemoryAccount({ keypair: { secretKey: wallets[1].secretKey, publicKey: wallets[1].publicKey } }),
                MemoryAccount({ keypair: { secretKey: wallets[2].secretKey, publicKey: wallets[2].publicKey } })
            ],
            networkId: "ae_devnet",
            compilerUrl: "http://localhost:3080"
        })
    })

    it('Deploying Example Contract', async () => {
        ecdhInstance = await client.getContractInstance(CONTRACT_SOURCE);
        const init = await ecdhInstance.deploy([]);
        assert.equal(init.result.returnType, 'ok');
    })

    describe('Generate participants', () => {
        it('should generate Alice keypair', async () => {
            alice = wallets[1];
            assert.ok(alice.hasOwnProperty("publicKey"), "Public key not found")
        })

        it('should generate Bob keypair', async () => {
            bob = wallets[2];
            assert.ok(bob.hasOwnProperty("publicKey"), "Public key not found")
        })
    })

    describe('Place data', () => {
        it('shold place encrypted data on-chain', async () => {
            let encrypted_data = Buffer.from(JSON.stringify(Crypto.encryptPrivateKey(data_encryption_key, Buffer.from(dummy_data)))).toString('hex');
            let result = await ecdhInstance.methods.place(encrypted_data, { onAccount: bob.publicKey })
            assert.ok(result, "Unable to place data")
        })
    })

    describe('Claim', () => {
        it('should ask for decryption key', async () => {
            let result = await ecdhInstance.methods.claim(0, { onAccount: alice.publicKey })
            assert.ok(result, "Unable to claim data")
        })
    })

    describe('Unlock', () => {
        it('should provide the encrypted decryption key', async () => {
            let take = await ecdhInstance.methods.take(0, { onAccount: bob.publicKey})
            let requester_pub_key = take.decodedResult.r;
            let encrypted_decryption_key = Buffer.from(JSON.stringify(Crypto.encryptData(data_encryption_key, requester_pub_key))).toString('hex')
            let result = await ecdhInstance.methods.unlock(0, encrypted_decryption_key, { onAccount: bob.publicKey })
            assert.ok(result, "Unable to unlock data")
        })
    })

    describe('Take', () => {
        it('should take the data and decryption key', async () => {
            let result = await ecdhInstance.methods.take(0, { onAccount: alice.publicKey })
            assert.ok(result, "Unable to take data")
        })
    })

    describe('Verify',() => {
        it('should decrypt data propery', async () => {
            let take = await ecdhInstance.methods.take(0, { onAccount: alice.publicKey })
            assert.ok(take, "Unable to take data")

            let data = Buffer.from(take.decodedResult.d, 'hex');
            console.log(JSON.parse(data))

            let encrypted_decryption_key = Buffer.from(take.decodedResult.dk).toString();
            let decryption_key = Crypto.decryptData(alice.secretKey, JSON.parse(Buffer.from(encrypted_decryption_key, 'hex')))

            let decryption_key_to_string = decryption_key.toString();
            let decrypted_data = Crypto.decryptPrivateKey(decryption_key_to_string, data);
            console.log(decrypted_data);
        })
    })
})