# Forwarded Tokens Include Kind

Forwarded Forge Token objects will include a `kind` field of `"system"` or
`"user"` even though they are also stored under `forwardedTokens.system` and
`forwardedTokens.user`. This redundancy keeps token values self-describing when
future helpers receive them independently from the full context and helps avoid
mixing user and system token semantics.
