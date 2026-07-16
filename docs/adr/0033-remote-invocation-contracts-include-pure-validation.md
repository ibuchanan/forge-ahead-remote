# Remote invocation contracts include pure validation

Remote Invocation Contracts will be more than static names for Forge Remote
route categories: they will include pure, framework-neutral validation helpers
that check whether a Forge Remote Context satisfies the contract's incoming
authentication and forwarded-token requirements. This keeps trigger-specific
guarantees close to the domain model while leaving Express middleware, response
sending, queueing, and protocol-specific handling to extension packages or route
code.
