# Audience Derivation Receives Unverified FIT Payload

`deriveAudience()` will receive the decoded unverified
`ForgeInvocationTokenPayload`, not a generic `JwtPayload`. The hook exists for
Forge-specific verification policy, but its input is not trusted; callers may
use it only to choose verification parameters such as expected audience, not to
authorize the request or trust tenant, app, user, or cloud identity.
