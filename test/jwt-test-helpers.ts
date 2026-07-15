import * as jose from "jose";

export interface TestKeyPair {
  kid: string;
  privateKey: jose.CryptoKey;
  jwks: jose.JWTVerifyGetKey;
}

export async function generateTestKeyPair(kid: string): Promise<TestKeyPair> {
  const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
  const jwk = await jose.exportJWK(publicKey);
  jwk.kid = kid;
  jwk.alg = "RS256";
  return {
    kid,
    privateKey,
    jwks: jose.createLocalJWKSet({ keys: [jwk] }),
  };
}

export interface SignTestJwtOptions {
  audience?: string;
  issuer?: string;
  expiresIn?: string;
}

export async function signTestJwt(
  keyPair: TestKeyPair,
  payload: jose.JWTPayload,
  options: SignTestJwtOptions = {},
): Promise<string> {
  let jwt = new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: keyPair.kid })
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h");
  if (options.audience !== undefined) {
    jwt = jwt.setAudience(options.audience);
  }
  if (options.issuer !== undefined) {
    jwt = jwt.setIssuer(options.issuer);
  }
  return jwt.sign(keyPair.privateKey);
}
