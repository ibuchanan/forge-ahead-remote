# Keep Auth Header Validator Public

`validateAuthHeader()` will remain a public lower-level request-boundary helper
even though `validateForgeRemoteRequest()` is the preferred context-returning API
for new Forge Remote callers. Some consumers only need a verified FIT payload,
and keeping this API public preserves a useful sans-io-adjacent composition point
without retaining the old positional call shape.
