import * as jose from "jose";

export interface TestKeyPair {
  kid: string;
  privateKey: jose.CryptoKey;
  jwks: jose.JWTVerifyGetKey;
  publicJwk: jose.JWK;
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
    publicJwk: jwk,
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

/**
 * Flips the first character of the signature segment. The last base64url
 * character of a signature can encode padding bits that decoding ignores,
 * so tampering there sometimes leaves the decoded bytes unchanged; the
 * first character never has that ambiguity.
 */
export function tamperSignature(token: string): string {
  const [header, payload, signature] = token.split(".");
  const tamperedFirstChar = signature[0] === "A" ? "B" : "A";
  const tamperedSignature = `${tamperedFirstChar}${signature.slice(1)}`;
  return `${header}.${payload}.${tamperedSignature}`;
}

/**
 * Builds a classic "alg: none" unsigned JWT: a well-formed three-part
 * token with an empty signature segment, used to prove verification
 * rejects it rather than accepting or misclassifying it.
 */
export function createUnsignedJwt(payload: jose.JWTPayload): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}
