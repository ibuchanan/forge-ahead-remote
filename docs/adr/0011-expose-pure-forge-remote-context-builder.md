# Expose Pure Forge Remote Context Builder

The root package will expose a pure Forge Remote Context Builder in addition to
the verification-backed request validator. This keeps context construction
testable without `jose`, JWKS, fetch, clocks, or HTTP framework objects, while
letting `validateForgeRemoteRequest()` remain a convenient shell that verifies a
FIT and then delegates to the same builder.
