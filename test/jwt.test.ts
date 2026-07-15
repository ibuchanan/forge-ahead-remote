import { describe, expect, it } from "vitest";
import { getKeyIdFromToken, isJwtExpired, parseJwt } from "../src/jwt";

// https://jwt.io well-known example token: header {"alg":"HS256","typ":"JWT"},
// payload {"sub":"1234567890","name":"John Doe","iat":1516239022}.
const KNOWN_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// header {"alg":"RS256","typ":"JWT","kid":"test-key-id"}, payload {}.
const JWT_WITH_KID =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0." +
  "e30." +
  "sig";

// header {"alg":"HS256","typ":"JWT"}, payload {"exp":1000}.
const JWT_EXPIRING_AT_1000 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "eyJleHAiOjEwMDB9." + "sig";

describe("parseJwt", () => {
  it("parses a valid three-part JWT into header, payload, and signature", () => {
    const token = parseJwt(KNOWN_JWT);

    expect(token.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(token.payload).toEqual({
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    });
    expect(token.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  });

  it("throws a clear error when the token does not have three parts", () => {
    expect(() => parseJwt("only.two")).toThrow(/expected 3 parts, got 2/i);
  });

  it("throws a clear error when a segment is not valid base64url JSON", () => {
    const notJson = Buffer.from("not-json", "utf-8").toString("base64url");

    expect(() => parseJwt(`${notJson}.${notJson}.sig`)).toThrow(/invalid jwt/i);
  });
});

describe("getKeyIdFromToken", () => {
  it("reads the kid claim from the token header", () => {
    expect(getKeyIdFromToken(JWT_WITH_KID)).toBe("test-key-id");
  });
});

describe("isJwtExpired", () => {
  it("is false when the injected epoch time is before exp", () => {
    expect(isJwtExpired(JWT_EXPIRING_AT_1000, 999)).toBe(false);
  });

  it("is true when the injected epoch time is at or after exp", () => {
    expect(isJwtExpired(JWT_EXPIRING_AT_1000, 1000)).toBe(true);
  });
});
