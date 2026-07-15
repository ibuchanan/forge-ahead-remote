# JWKS Key Store Factory Only Accepts URL

`createJwksKeyStore()` will accept an optional `jwksUrl`, but not public `fetch`
or transport injection. Deterministic tests and non-standard resolution should
use injected `jwks` key stores on verification and validation inputs; the key
store factory remains a thin convenience around `jose.createRemoteJWKSet`.
