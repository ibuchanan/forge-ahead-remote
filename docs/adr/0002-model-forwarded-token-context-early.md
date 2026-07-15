# Model Forwarded Forge Token Context Early

Remote Authentication will verify FITs first, but its public model should leave
room for Forwarded Forge Token Context because reference implementations
immediately combine verified FIT claims with `x-forge-oauth-system` and
`x-forge-oauth-user` headers. The first slice should not manage token storage,
refresh, or product API calls, but it should avoid forcing later helpers to
re-parse raw request headers or define a competing request-context shape.
