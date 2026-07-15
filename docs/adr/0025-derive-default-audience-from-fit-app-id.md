# Derive Default Audience from FIT App ID

Request-boundary validators will choose audience in this order: explicit
`audience`, caller-provided `deriveAudience(decodedPayload)`, then decoded FIT
`app.id`. If no audience can be derived, validation returns a 401 Problem
Details before attempting signature verification. This matches current reference
behavior while leaving deployment-specific app policy outside the core library.
