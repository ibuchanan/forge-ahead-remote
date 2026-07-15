# Default Issuer Only at Request Boundary

`validateAuthHeader()` and `validateForgeRemoteRequest()` will default issuer to
`forge/invocation-token` because they are Forge Remote request-boundary
validators. Low-level `verifyJwt()` and `verifyAndParseJwt()` will only enforce
issuer when `VerifyJwtOptions.issuer` is supplied, keeping those helpers useful
for explicit verification tests and lower-level JWT verification flows.
