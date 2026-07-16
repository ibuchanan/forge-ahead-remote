# Keep contract validation separate from request authentication

`validateForgeRemoteRequest()` will remain responsible for authenticating the
request and building Forge Remote Context, while Remote Invocation Contract
Validation will be a second explicit step for route-specific guarantees. This
keeps authentication failures separate from contract mismatches and avoids
making every request-authentication caller select an invocation contract.
