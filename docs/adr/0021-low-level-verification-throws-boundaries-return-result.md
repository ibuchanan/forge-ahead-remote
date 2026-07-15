# Low-Level Verification Throws, Boundaries Return Result

`verifyJwt()` and `verifyAndParseJwt()` will reject on verification failures like
normal async `jose` wrappers. `validateAuthHeader()` and
`validateForgeRemoteRequest()` are the request-boundary validators that convert
missing, malformed, invalid, and infrastructure failures into
`Result<..., ProblemDetails>` values with 401 or 502 status classification.
