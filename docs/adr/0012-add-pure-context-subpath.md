# Add Pure Context Subpath

`@forge-ahead/remote` will expose `@forge-ahead/remote/context` for Forge Remote
Context types and pure builders, alongside `@forge-ahead/remote/jwt` for pure JWT
helpers. The root entrypoint can re-export both plus verification helpers, but
non-verifying callers should be able to model context without importing `jose`,
JWKS, fetch, or request-boundary validation code.
