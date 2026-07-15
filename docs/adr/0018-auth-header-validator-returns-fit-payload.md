# Auth Header Validator Returns FIT Payload

`validateAuthHeader()` will return a permissive `ForgeInvocationTokenPayload`,
not a generic `JwtPayload`. The package is Forge Remote-specific and this helper
is a request-boundary Forge auth validator; generic verified payload access
remains available through `verifyAndParseJwt()`.
