# Add invocation subpath for remote invocation contracts

Remote Invocation Contracts should live in a future
`@forge-ahead/remote/invocation` subpath. They depend on Forge Remote Context but
are not context construction, and their Problem Details result shape should not
be folded into the dependency-light context entrypoint; the root package can
re-export the capability later if that remains the package convention.
