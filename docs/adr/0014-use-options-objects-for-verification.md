# Use Options Objects for Verification

`verifyJwt()` and `verifyAndParseJwt()` will take named options objects instead
of preserving the old positional `token, audience, jwks` shape. This is a
deliberate breaking extraction choice: the standalone API can make injected
dependencies, expected issuer, JWKS URL, and future verification inputs explicit
without growing positional overloads.
