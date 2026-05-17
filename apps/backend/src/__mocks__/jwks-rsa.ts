// Automatic mock for jwks-rsa.
// jwks-rsa depends on jose (ESM) which ts-jest cannot process in CJS mode.
// This stub replaces the entire module for all Jest test suites.

const jwksRsa = jest.fn(() => ({
  getSigningKey: jest.fn(
    (_kid: string, cb: (err: Error | null, key: { getPublicKey: () => string } | null) => void) => {
      cb(null, { getPublicKey: () => 'mock-public-key' });
    }
  ),
}));

export default jwksRsa;
module.exports = jwksRsa;
