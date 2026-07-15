# Distinguish Auth Rejections from Infrastructure Failures

Remote Authentication will classify missing, malformed, expired, wrong-issuer,
wrong-audience, and bad-signature FITs as `401` Problem Details, but classify
JWKS fetch, TLS, and network failures as `502` Problem Details. Reference
consumer code already had to infer this distinction with string matching; moving
the distinction into the library gives callers better operational semantics
without requiring every framework adapter to repeat that logic.
