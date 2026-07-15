# FIT Payload Belongs to Context Subpath

`ForgeInvocationTokenPayload` will live in `@forge-ahead/remote/context`, not in
`@forge-ahead/remote/jwt`. The `jwt` subpath should remain generic JWT parsing
and inspection, while the context subpath owns Forge Remote domain types and can
import `JwtPayload` as its generic base.
