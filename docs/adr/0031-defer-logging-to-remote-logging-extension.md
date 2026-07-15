# Defer Logging to Remote Logging Extension

The auth-first `@forge-ahead/remote` package will not include Forge Remote
Context summary or logging helpers. Logging is a good next slice as an optional
Remote Logging Extension built on `@forge-ahead/logging`, where safe context
summaries and demo narrative logging can illustrate Forge Remote behavior without
making the core package depend on logging or guess which fields are safe for all
callers. The extension's package ownership, export shape, and concrete API are
deferred until that slice starts.
