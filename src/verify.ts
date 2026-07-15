import * as jose from "jose";
import type { JwtPayload } from "./jwt";

export const ATLASSIAN_FORGE_JWKS_URL =
  "https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json";

export interface CreateJwksKeyStoreOptions {
  jwksUrl?: string | URL;
}

export function createJwksKeyStore(
  options: CreateJwksKeyStoreOptions = {},
): jose.JWTVerifyGetKey {
  return jose.createRemoteJWKSet(
    new URL(options.jwksUrl ?? ATLASSIAN_FORGE_JWKS_URL),
  );
}

export interface VerifyJwtOptions {
  token: string;
  audience: string;
  jwks?: jose.JWTVerifyGetKey;
  jwksUrl?: string | URL;
  issuer?: string;
}

function resolveKeyStore(options: VerifyJwtOptions): jose.JWTVerifyGetKey {
  return options.jwks ?? createJwksKeyStore({ jwksUrl: options.jwksUrl });
}

export async function verifyJwt(
  options: VerifyJwtOptions,
): Promise<jose.JWTVerifyResult> {
  const keyStore = resolveKeyStore(options);
  return jose.jwtVerify(options.token, keyStore, {
    audience: options.audience,
    issuer: options.issuer,
  });
}

export async function verifyAndParseJwt(
  options: VerifyJwtOptions,
): Promise<JwtPayload> {
  const { payload } = await verifyJwt(options);
  return payload;
}
