# Sequence Remote Authentication First

The Forge Remote Helper Library will start with Remote Authentication because
every Forge-originated remote endpoint needs trustworthy FIT verification before
later helpers can safely use request context, forwarded OAuth tokens, storage, or
agent protocols. This is a sequencing decision, not an auth-only product scope:
the package design should avoid blocking later extraction of middleware,
token-forwarding, storage, regionality, and remote-agent helpers demonstrated by
the reference implementations.
