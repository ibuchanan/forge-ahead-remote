# Wrap Forwarded Forge Tokens

Forge Remote Context will expose forwarded OAuth tokens as named token objects
rather than raw strings. This adds a small amount of ceremony in the first auth
slice, but it preserves room for later token metadata such as expiry, decoded
claims, provenance, and lifecycle handling without breaking the context shape.
