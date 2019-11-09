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

const Deployer = require('aeproject-lib').Deployer;
const ECDH_CONTRACT_PATH = "./contracts/ECDH.aes";

describe('ECDH Contract', () => {

    let deployer, alice, bob, ecdhInstance;
    let ownerKeyPair = wallets[0];
    
    before(async () => {
        deployer = new Deployer('local', ownerKeyPair.secretKey)
    })

    it('Deploying Example Contract', async () => {
        ecdhInstance = await deployer.deploy(ECDH_CONTRACT_PATH)
        assert.ok(ecdhInstance, 'Could not deploy the ECDH');
    })

    describe('Generate participants', () => {
        it('should generate Alice', async () => {
            alice = wallets[1];
            assert.ok(alice.hasOwnProperty("publicKey"), "Public key not found")
        })

        it('should generate Bob', async () => {
            bob = wallets[2];
            assert.ok(bob.hasOwnProperty("publicKey"), "Public key not found")
        })
    })

    describe('Place data', () => {
        it('shold place encrypted data on-chain', async () => {

        })
    })

    describe('Claim', () => {
        it('should ask for decryption key', async () => {
            
        })
    })

    describe('Unlock', () => {
        it('should provide the encrypted ecryption key', async () => {

        })
    })

    describe('Take', () => {
        it('should take the data and decryption key', async () => {

        })
    })

    describe('Verify',() => {
        it('should decrypt data propery', async () => {

        })
    })
})