# Remote Health Checks

**Status:** ready-for-agent

## Problem Statement

Hybrid Atlassian Forge apps run across two runtimes with very different health needs. Forge Native is a short-lived, serverless FaaS environment managed by Atlassian; it has no long-running process or TCP port to probe. Forge Remote is a vendor-hosted, persistent Node.js backend that is expected to answer standard liveness and readiness probes, degrade gracefully when dependencies are unhealthy, and keep probes fast enough to avoid Atlassian execution timeouts.

Today the `@forge-ahead/remote` package only authenticates inbound Forge Remote requests. It provides no vocabulary for liveness, readiness, or dependency checks. As a result every backend reinvents `/livez` and `/readyz`, invents its own report shape, misuses timeouts, and risks leaking PII, raw tokens, or raw request headers in health responses. The package needs a small, framework-neutral health-check API that fits the same Sans-IO core style as the existing authentication and invocation slices.

## Solution

Add a health-check slice to `@forge-ahead/remote` as a new public subpath, `@forge-ahead/remote/health`. The subpath provides:

- A shared value vocabulary for `HealthStatus`, `ComponentHealth`, and `SystemHealthReport`.
- A way to register named async checks with per-check timeouts and liveness/readiness classification.
- A `HealthMonitor` that runs the registered checks concurrently, enforces timeouts, caches readiness results, and returns a plain `SystemHealthReport` value.
- A data-only HTTP response mapper that turns a report into a status code and JSON body.
- A thin framework adapter for Express in the existing `@forge-ahead/remote/express` subpath, so callers can mount `/livez` and `/readyz` without writing route handlers.

The core health API remains Sans-IO: it does not start a server, write a response, or import a framework. FIT-protected health endpoints, support-bundle generators, Forge Native diagnostics, logging, and storage helpers stay out of this slice and belong in extension packages or application code.

## User Stories

1. As a backend operator, I want a `/livez` endpoint that returns `pass` when the process is running, so that my orchestrator can detect crashed containers without depending on external systems.
2. As a backend operator, I want a `/readyz` endpoint that returns a cached dependency report within one to two seconds, so that probes do not trigger Forge execution timeouts.
3. As a backend maintainer, I want to register custom checks for my database, cache, and product API dependencies, so that the readiness report reflects real runtime dependencies.
4. As a backend maintainer, I want each check to run with its own timeout and not block other checks, so that a slow dependency does not mask other failures or blow the whole probe budget.
5. As a backend maintainer, I want the health monitor to cache the last readiness result, so that repeated probe requests are fast and stable under load.
6. As a backend maintainer, I want the health monitor to be a plain value object with no Express/Fastify/Hono request attached, so that I can call it from tests, cron jobs, admin endpoints, or background tasks.
7. As a backend maintainer, I want a data-only function that maps the report to an HTTP status code and JSON body, so that my framework adapter stays a thin pass-through.
8. As an Express backend maintainer, I want an adapter that wires `/livez` and `/readyz` to the monitor, so that I do not have to write route handlers myself.
9. As a security reviewer, I want health responses to contain no PII, raw tokens, raw headers, or unverified FIT claims, so that anonymous probe responses are safe to return from any route.
10. As a library maintainer, I want the `@forge-ahead/remote/health` subpath to import no `jose`, `zod`, `express`, or logging packages, so that the core remains dependency-light and framework-neutral.
11. As a diagnostics UI developer, I want a Forge Native resolver to call a remote `/readyz` endpoint with a short timeout and a FIT, so that an admin page can display the remote health status.
12. As a diagnostics UI developer, I want that remote health endpoint to reuse the existing FIT validation path, so that health data is only exposed to authenticated Forge requests.
13. As a site admin, I want the health report to carry an anonymized `siteHash` rather than a raw `cloudId`, so that support artifacts do not leak tenant identity.
14. As a support engineer, I want the health report shape to be stable and JSON-serializable, so that a future diagnostics extension can turn it into a support bundle without re-parsing private data.
15. As a backend maintainer, I want the health endpoint to distinguish `pass`, `warn`, and `fail` in the report body, so that I can alert on degradation before a dependency fully fails.
16. As a backend maintainer, I want to mark a check as liveness-only or readiness-only, so that `/livez` stays cheap while `/readyz` runs deeper dependency checks.
17. As a library consumer, I want to inject a fake clock and fake checks, so that I can test timeout, caching, and aggregation behavior deterministically.
18. As a backend maintainer, I want check failures to be captured as a component-level `error` string rather than thrown, so that the overall report can still contain partial results.
19. As a backend maintainer, I want to supply a `fetchImpl`, storage client, or other I/O seam through the check context, so that the core monitor does not own those dependencies.
20. As a product API maintainer, I want health checks to consume the existing opaque forwarded Forge token values without decoding them, so that the health slice does not add new token-introspection code.

## Implementation Decisions

- **New subpath:** add `@forge-ahead/remote/health` as a public entrypoint. The root `@forge-ahead/remote` entrypoint may re-export the report types and the monitor builder, but it must not export framework route wiring.
- **Report contract:** keep the existing `SystemHealthReport` type from the initial sketch as the public contract. It is the boundary between the health core, HTTP mapping, framework adapters, and any future diagnostics package:
  - `HealthStatus = "pass" | "warn" | "fail"`
  - `ComponentHealth = { name, status, latencyMs, error?, details? }`
  - `SystemHealthReport = { appVersion, environment, siteHash?, timestamp, overallStatus, checks: Record<string, ComponentHealth> }`
- **Check definition:** a health check is an async function `(context: HealthCheckContext) => Promise<ComponentHealth>`. The context carries only safe, explicit values (`appVersion`, `environment`, `siteHash?`, and an optional `signal` for cancellation). It does not receive raw request headers, raw FIT payloads, or framework objects.
- **Check registration:** expose `defineHealthCheck(options)` where callers provide a `name`, the `check` function, an optional `timeoutMs`, and a `mode` array classifying whether the check runs for liveness, readiness, or both.
- **Monitor creation:** expose `createHealthMonitor(options)` that stores the check registry, an optional per-check default timeout, an optional readiness cache TTL, and fixed report metadata (`appVersion`, `environment`, `siteHash?`).
- **Running checks:** expose `runHealthMonitor(monitor, { mode, force? })` that returns a `SystemHealthReport`. Checks run concurrently, each capped by its own timeout. Errors become `fail` components with a string `error`. `overallStatus` is the worst status among all components in that mode (`fail` > `warn` > `pass`). When `mode` is `ready` and a non-stale cached report exists, the cached value is returned unless `force` is true.
- **HTTP mapping:** expose `toHealthHttpResponse(report)` that returns `{ status: 200 | 503, body: SystemHealthReport }`. `pass` and `warn` map to `200`; `fail` maps to `503`. The body is the full report so operators can see the degradation details. Load balancers can use the status code; dashboards can use `overallStatus`.
- **Express adapter:** extend the existing `@forge-ahead/remote/express` subpath with a `createHealthRouter(monitor)` factory that mounts `/livez` and `/readyz`. The adapter uses the HTTP mapper and does not re-implement check logic. It is a Remote Extension Package, not part of the core health subpath.
- **FIT-protected health:** the health core does not authenticate. If a route needs a FIT (for example, an admin diagnostic page), the caller composes the existing `forgeRemoteAuthMiddleware` or `validateForgeRemoteRequest` before the health handler. No new authentication code is added.
- **Tenant privacy:** the core does not extract `cloudId` from FIT claims. The caller may pass an anonymized `siteHash` to the monitor. The health report must not include emails, profile data, token values, or raw headers.
- **No new dependencies:** the health subpath does not add `jose`, `zod`, framework packages, logging, storage, or product API clients. It may use `@forge-ahead/errors` if needed, but it should avoid depending on it for simple report construction.
- **Subpath boundaries:** follow the existing package layout in `package.json` and `tsdown.config.ts`. Add a `./health` export analogous to `./invocation` and `./a2a`.

## Testing Decisions

- The primary seam is the public `@forge-ahead/remote/health` subpath. Tests run through the monitor, register fake checks, and assert the returned `SystemHealthReport` values.
- The secondary seam is the Express adapter in the existing `@forge-ahead/remote/express` subpath. Tests use mocked `req`/`res` objects or a minimal Express router to keep the adapter testable without a full HTTP server.
- The HTTP response mapper is tested for each `overallStatus` mapping.
- Import-boundary tests verify that `@forge-ahead/remote/health` does not import `jose`, `zod`, `express`, logging, storage, or other framework-specific packages.
- Fake checks and fake timers are used to test timeout, concurrent execution, caching, and error handling deterministically.
- Prior art for this style: `test/context.test.ts`, `test/invocation.test.ts`, and `test/verify.test.ts` for pure builders and async behavior; `test/express.test.ts` for framework adapter tests; and the package-boundary tests for subpath isolation.

## Out of Scope

- A separate `@forge-ahead/diagnostics` package for Forge Native: `DiagnosticRunner`, admin-page resolvers, synthetic functional checks, and `SupportBundleGenerator`.
- Logging integration or OTLP formatting. This slice stays logging-neutral; a future Remote Logging Extension may consume `SystemHealthReport` values.
- Product API access helpers, system-token lifecycle, Forge storage access, and regional/isolated-cloud endpoint resolution. Those are covered by tickets 11-14.
- Circuit-breaking, graceful shutdown, SIGTERM handling, or runtime orchestration.
- Generic health libraries such as `@godaddy/terminus`, `health-probes`, or `@fastify/under-pressure`. Callers may use those, but the core does not wrap them.
- Deep validation of `details` payloads in `ComponentHealth`.
- Readiness caches backed by shared storage. The cache is process-local.

## Further Notes

- This slice is a good next candidate after the invocation and A2A/Rovo slices (tickets 17-24) because it is small, mostly additive, and reuses the existing framework-neutral value style.
- The health report shape should be treated as a long-lived contract. Future work (diagnostics, logging, monitoring dashboards) should consume this shape rather than inventing a new one.
- The existing `extractCloudId` helper can be used by application code to derive a `cloudId` before hashing it into `siteHash`, but the health core does not require or perform that transformation.
- The `warn` status is intentionally preserved in the report body. It signals that a check is degraded but not yet failing, which is useful for dashboards and alerting without necessarily failing a load balancer.
