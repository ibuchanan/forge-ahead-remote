export interface JwtHeader {
  [claim: string]: unknown;
}

export interface JwtPayload {
  [claim: string]: unknown;
}

export interface JwtToken {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
}

export class JwtParseError extends Error {}

function decodeBase64UrlJson(segment: string): Record<string, unknown> {
  const json = Buffer.from(segment, "base64url").toString("utf-8");
  try {
    return JSON.parse(json);
  } catch (cause) {
    throw new JwtParseError("Invalid JWT: segment is not valid JSON", {
      cause,
    });
  }
}

export function parseJwt(jwt: string): JwtToken {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new JwtParseError(
      `Invalid JWT: expected 3 parts, got ${parts.length}`,
    );
  }
  const [headerSegment, payloadSegment, signature] = parts;
  const header = decodeBase64UrlJson(headerSegment);
  const payload = decodeBase64UrlJson(payloadSegment);
  return { header, payload, signature };
}

export function getKeyIdFromToken(jwt: string): string | undefined {
  const { header } = parseJwt(jwt);
  return typeof header.kid === "string" ? header.kid : undefined;
}

export function isJwtExpired(jwt: string, nowEpochSeconds: number): boolean {
  const { payload } = parseJwt(jwt);
  return typeof payload.exp === "number" && nowEpochSeconds >= payload.exp;
}
