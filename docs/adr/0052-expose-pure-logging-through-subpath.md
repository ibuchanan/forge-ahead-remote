# Expose Pure Logging Helpers Through a Dedicated Subpath

ADR 0031 deferred logging while the auth-first core stabilized. The first logging slices now provide pure, whitelist-only record builders with no logger, framework, or I/O dependency.

Expose those helpers from `@forge-ahead/remote/logging`, implemented by `src/logging.ts`, using the same dedicated-subpath pattern as `@forge-ahead/remote/a2a`. Keep them out of the root export so authentication and verification consumers do not acquire logging API surface accidentally.

The subpath remains sink-neutral: it returns data only, never writes logs, and must not recursively log a `ForgeRemoteContext`, raw request, token, or arbitrary FIT claim. A future integration with a concrete logger belongs outside this package or behind a separately chosen adapter.
