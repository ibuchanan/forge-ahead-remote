# Safe Remote Logging

`@forge-ahead/remote/logging` provides structured, sink-neutral records for a Forge Remote request lifecycle. It does not select a logger, write to a transport, retain records, or decide application logging policy.

This boundary keeps authentication and protocol helpers usable in any runtime while letting an application choose its own logger, correlation strategy, retention policy, sampling, and authorization-aware content policy.

## A whitelist is the security boundary

A Forge Invocation Token payload is intentionally permissive: it may contain claims that an application must not disclose. Logging therefore uses allowlisted summaries rather than copying a `ForgeRemoteContext` or recursively redacting an arbitrary request object.

A remote-context summary includes only:

- verification audience and issuer;
- FIT application ID and principal subject when each is a string; and
- booleans that indicate whether forwarded system and user tokens are present.

It never includes forwarded-token values, raw authorization headers, unknown FIT claims, request bodies, message parts, artifacts, error causes, or stack traces. Problem summaries are limited to standard Problem Details fields.

## Request-lifecycle records

The package defines records that make a request story observable without creating a second event system:

| Layer | Event | Meaning |
| --- | --- | --- |
| Authentication | `remote.auth.accepted` | Forge request validation succeeded. |
| Authentication | `remote.auth.rejected` | Validation produced safe Problem Details. |
| Invocation | `remote.invocation.matched` | The verified context satisfied the route contract. |
| Invocation | `remote.invocation.mismatched` | The verified context did not meet the contract. |
| A2A | `remote.a2a.signal.mapped` | A provider-neutral signal was mapped to an A2A event. |
| A2A | `remote.a2a.stream.encoded` | An A2A stream envelope was encoded. |
| A2A | `remote.a2a.completed` | A task reached a terminal outcome. |

The logging helpers accept optional request, trace, and span identifiers. Applications can generate these at the HTTP boundary or derive a request identifier from a JSON-RPC ID.

## Application ownership remains explicit

An application decides when to build and emit records. `emitRemoteLogRecord` is a small adapter to an application-owned levelled logger; it does not introduce a logger dependency. Applications also remain responsible for whether intentionally safe, local demonstration data warrants additional logging.

This separation prevents the package from making deployment-specific decisions about log destinations or sensitive content. A valid FIT authenticates a Forge invocation; it does not make all request-associated data safe to log.

For exported types and record-builder signatures, see the [Public API Reference](../reference/public-api.md). For the unresolved reference-app adoption work, see the logging handoff in `specs/LOGGING.md`.
