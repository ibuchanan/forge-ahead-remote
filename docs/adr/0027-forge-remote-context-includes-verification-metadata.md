# Forge Remote Context Includes Verification Metadata

`ForgeRemoteContext` will include a small `verification` object containing the
audience and issuer that the request was verified against. This gives diagnostics
and future extension helpers the relevant verification facts without coupling the
core to logging, HTTP frameworks, raw headers, or unverified claim bags.
