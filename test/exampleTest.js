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
  const dummy_data = "crypto is awesome";
  const data_encryption_key = "secret";
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

  describe('Type conversions', () => {
    it('should convert properly the data', async () => {
      const encrypted = 
        Buffer.from(
          Crypto.encryptPrivateKey(
            data_encryption_key,
            Buffer.from(
              dummy_data
            )
          )
        )
        .toString('hex');
      assert.equal(encrypted, "637c8860ccdb26e43e410834eb445377637c8860ccdb26e43e410834eb4453779a01dfb55335be15de2ed8dda08d5e62630d906962d954bc1d43543eebf36783", "Unable to encrypt data")

      const decrypted = 
        Crypto.decryptPrivateKey(
          data_encryption_key,
          Buffer.from(
            encrypted,
            'hex'
          )
        )
        .toString();
      assert.ok(decrypted.indexOf(dummy_data), "Unable to decrypt data")
    })
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
      const encrypted = 
        Buffer.from(
          Crypto.encryptPrivateKey(
            data_encryption_key,
            Buffer.from(
              dummy_data
            )
          )
        )
        .toString('hex');
      const result = await ecdhInstance.methods.place(encrypted, { onAccount: bob.publicKey })
      assert.ok(result, "Unable to place data")
    })
  })

  describe('Claim', () => {
    it('should ask for decryption key', async () => {
      const result = await ecdhInstance.methods.claim(0, { onAccount: alice.publicKey })
      assert.ok(result, "Unable to claim data")
    })
  })

  describe('Unlock', () => {
    it('should provide the encrypted decryption key', async () => {
      const take = await ecdhInstance.methods.take(0, { onAccount: bob.publicKey})
      const asymetric_data_decryption_key = 
        Buffer.from(
          JSON.stringify(
            Crypto.encryptData(
              data_encryption_key,
              take.decodedResult.requester // requester pub key
            )
          )
        )
        .toString('hex')
      const result = await ecdhInstance.methods.unlock(0, asymetric_data_decryption_key, { onAccount: bob.publicKey })
      assert.ok(result, "Unable to unlock data")
    })
  })

  describe('Take', () => {
    it('should take the data and decryption key', async () => {
      const result = await ecdhInstance.methods.take(0, { onAccount: alice.publicKey })
      assert.ok(result, "Unable to take data")
    })
  })

  describe('Verify',() => {
    it('should decrypt data propery', async () => {
      const take = await ecdhInstance.methods.take(0, { onAccount: alice.publicKey })
      assert.ok(take, "Unable to take data")

      const encrypted = Buffer.from(take.decodedResult.data, 'hex');
      const data_encryption_key = 
        Crypto.decryptData(
          alice.secretKey,
          JSON.parse(
            Buffer.from(
              take.decodedResult.decryption_key, // encrypted decryption key
              'hex'
            )
          )
        )
        .toString();

      const decrypted = 
        Crypto.decryptPrivateKey(
          data_encryption_key,
          Buffer.from(
            encrypted,
            'hex'
          )
        )
        .toString();
      assert.ok(decrypted.indexOf(dummy_data), "Unable to decrypt data")
    })
  })
})