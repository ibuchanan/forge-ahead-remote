# Forwarded Tokens Remain Opaque

Forwarded OAuth token objects will expose only `kind` and `token` in the first
auth slice. The context builder will not decode, inspect, or trust forwarded
token claims; those tokens are distinct from the Forge Invocation Token and need
separate explicit helpers if later slices require expiry or claim inspection.
