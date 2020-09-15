const assert = require('chai').assert
const {readFileRelative} = require('aeproject-utils/utils/fs-utils');
const {defaultWallets: wallets} = require('aeproject-config/config/node-config.json');

const {Universal, MemoryAccount, Node, Crypto} = require('@aeternity/aepp-sdk');
const CONTRACT_SOURCE = readFileRelative('./contracts/ECDH.aes', 'utf-8');

const config = {
  url: 'http://localhost:3001/',
  internalUrl: 'http://localhost:3001/',
  compilerUrl: 'http://localhost:3080'
};

describe('ECDH Contract', () => {

  let deployer, alice, bob, ecdhInstance;
  const dummy_data = 'crypto is awesome';
  const data_encryption_key = 'secret';
  let client;

  before(async () => {
    client = await Universal({
      nodes: [
        {
          name: 'devnetNode',
          instance: await Node(config),
        },
      ],
      accounts: [
        MemoryAccount({
          keypair: wallets[0],
        }),
        MemoryAccount({
          keypair: wallets[1],
        }),
        MemoryAccount({
          keypair: wallets[2],
        }),
      ],
      networkId: 'ae_devnet',
      compilerUrl: config.compilerUrl,
    });
  });

  it('Deploying Example Contract', async () => {
    ecdhInstance = await client.getContractInstance(CONTRACT_SOURCE);
    const init = await ecdhInstance.deploy([]);
    assert.equal(init.result.returnType, 'ok');
  });

  describe('Type conversions', () => {
    it('should convert properly the data', async () => {
      const encrypted = Buffer.from(
        Crypto.encryptPrivateKey(data_encryption_key, Buffer.from(dummy_data)),
      ).toString('hex');
      assert.equal(
        encrypted,
        '637c8860ccdb26e43e410834eb445377637c8860ccdb26e43e410834eb4453779a01dfb55335be15de2ed8dda08d5e62630d906962d954bc1d43543eebf36783',
        'Unable to encrypt data',
      );

      const decrypted = Crypto.decryptPrivateKey(
        data_encryption_key,
        Buffer.from(encrypted, 'hex'),
      ).toString();
      assert.ok(decrypted.indexOf(dummy_data), 'Unable to decrypt data');
    });
  });

  describe('Generate participants', () => {
    it('should generate Alice keypair', async () => {
      alice = wallets[1];
      assert.ok(alice.hasOwnProperty('publicKey'), 'Public key not found');
    });

    it('should generate Bob keypair', async () => {
      bob = wallets[2];
      assert.ok(bob.hasOwnProperty('publicKey'), 'Public key not found');
    });
  });

  describe('Place data', () => {
    it('shold place encrypted data on-chain', async () => {
      const encrypted = Buffer.from(
        Crypto.encryptPrivateKey(data_encryption_key, Buffer.from(dummy_data)),
      ).toString('hex');

      const result = await ecdhInstance.methods.place(encrypted, {
        onAccount: bob.publicKey,
      });

      assert.ok(result, 'Unable to place data');
    });
  });

  describe('Claim', () => {
    it('should ask for decryption key', async () => {
      const result = await ecdhInstance.methods.claim(0, {
        onAccount: alice.publicKey,
      });
      assert.ok(result, 'Unable to claim data');
    });
  });

  describe('Unlock', () => {
    it('should provide the encrypted decryption key', async () => {
      const take = await ecdhInstance.methods.take(0, {
        onAccount: bob.publicKey,
      });

      let decryption_keys = [];

      take.decodedResult.requests.forEach((requester) => {
        let asymetric_data_decryption_key = Buffer.from(
          JSON.stringify(
            Crypto.encryptData(
              data_encryption_key,
              requester[0], // requester pub key
            ),
          ),
        ).toString('hex');

        decryption_keys.push([requester[0], asymetric_data_decryption_key]);
      });

      const result = await ecdhInstance.methods.unlock(0, decryption_keys, {
        onAccount: bob.publicKey,
      });
      assert.ok(result, 'Unable to unlock data');

      const take_again = await ecdhInstance.methods.take(0, {
        onAccount: bob.publicKey,
      });
      assert.deepEqual(
        take_again.decodedResult.requests,
        decryption_keys,
        'Provided data is not matching',
      );
    });
  });

  describe('Take', () => {
    it('should take the data and decryption key', async () => {
      const result = await ecdhInstance.methods.take(0, {
        onAccount: alice.publicKey,
      });
      assert.ok(result, 'Unable to take data');
    });
  });

  describe('Verify', () => {
    it('should decrypt data propery', async () => {
      const take = await ecdhInstance.methods.take(0, {
        onAccount: alice.publicKey,
      });
      assert.ok(take, 'Unable to take data');

      const encrypted = Buffer.from(take.decodedResult.data, 'hex');
      const data_encryption_key = Crypto.decryptData(
        alice.secretKey,
        JSON.parse(
          Buffer.from(
            take.decodedResult.requests[0][1], // encrypted decryption key
            'hex',
          ),
        ),
      ).toString();

      const decrypted = Crypto.decryptPrivateKey(
        data_encryption_key,
        Buffer.from(encrypted, 'hex'),
      ).toString();
      assert.ok(decrypted.indexOf(dummy_data), 'Unable to decrypt data');
    });
  });
});