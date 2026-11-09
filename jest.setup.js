// Mock expo-crypto with real Node.js crypto implementations for Jest tests
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: {
      SHA1: 'SHA-1',
      SHA256: 'SHA-256',
      SHA384: 'SHA-384',
      SHA512: 'SHA-512',
      MD5: 'MD5',
    },
    CryptoEncoding: {
      HEX: 'hex',
      BASE64: 'base64',
    },
    digestStringAsync: jest.fn(async (algorithm, str, options) => {
      let algo = 'sha256';
      if (algorithm === 'SHA-1') algo = 'sha1';
      else if (algorithm === 'SHA-384') algo = 'sha384';
      else if (algorithm === 'SHA-512') algo = 'sha512';
      else if (algorithm === 'MD5') algo = 'md5';
      const encoding = (options && options.encoding) === 'base64' ? 'base64' : 'hex';
      return nodeCrypto.createHash(algo).update(str, 'utf8').digest(encoding);
    }),
    getRandomBytesAsync: jest.fn(async (byteCount) => {
      return new Uint8Array(nodeCrypto.randomBytes(byteCount));
    }),
    randomUUID: jest.fn(() => nodeCrypto.randomUUID()),
  };
});
