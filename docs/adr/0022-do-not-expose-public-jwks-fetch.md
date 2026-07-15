# Do Not Expose Public JWKS Fetch

The standalone package will not expose `fetchAtlassianJwks()` as public API. The
preferred public seam is `createJwksKeyStore()` plus injected `jwks`, `jwksUrl`,
or `fetch` where needed for implementation and tests; a one-shot raw JWKS fetch
helper encourages per-request fetching and does not create a useful long-term
dependency boundary.
