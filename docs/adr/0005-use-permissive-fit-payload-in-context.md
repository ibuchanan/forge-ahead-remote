# Use Permissive FIT Payload in Context

`validateAuthHeader()` will keep returning generic `JwtPayload` for compatibility,
but the new Forge Remote Context API will expose `fit` as a permissive
`ForgeInvocationTokenPayload`. This gives later helpers access to Forge-specific
claims such as app, cloud, principal, and isolated-cloud metadata without making
the first extraction responsible for enforcing an exact FIT schema across every
Forge Remote invocation path.
