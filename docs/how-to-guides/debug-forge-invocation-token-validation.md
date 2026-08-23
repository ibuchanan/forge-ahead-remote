# Debug Forge Invocation Token Validation

Use this guide
when a Forge Remote request is rejected
before application work starts.
It assumes the route already calls
`validateAuthHeader`,
`validateForgeRemoteRequest`,
or `forgeRemoteAuthMiddleware`.

## Return the library's Problem Details response

Map the result directly at the HTTP boundary.
Do not replace its `detail` with a generic authentication error.

```ts
import {
  toHttpAuthFailureResponse,
  validateForgeRemoteRequest,
} from "@forge-ahead/remote";

const result = await validateForgeRemoteRequest({
  headers: { authorization: request.headers.authorization },
});

if (result.isErr()) {
  const { status, body } = toHttpAuthFailureResponse(result.error);
  return sendResponse(status, body);
}
```

Record the response status,
Problem Details `type`,
and `detail` in your request telemetry.
Do not record the Authorization header,
the FIT,
decoded claims,
or JWKS key material.

## Emit the safe request narrative

Use record builders from `@forge-ahead/remote/logging` and send their output to
your application-owned logger. Do not manually choose fields from a request or
`ForgeRemoteContext`.

```ts
import {
  createRemoteAuthAcceptedRecord,
  createRemoteAuthRejectedRecord,
  createRemoteInvocationMatchedRecord,
  createRemoteInvocationMismatchedRecord,
  emitRemoteLogRecord,
} from "@forge-ahead/remote/logging";

const correlation = { requestId, traceId, spanId };

if (result.isErr()) {
  emitRemoteLogRecord(
    logger,
    createRemoteAuthRejectedRecord({ ...correlation, problem: result.error }),
  );
} else {
  emitRemoteLogRecord(
    logger,
    createRemoteAuthAcceptedRecord({ ...correlation, context: result.value }),
  );
}
```

For an accepted request, continue the same correlation through the route:

1. `remote.auth.accepted` or `remote.auth.rejected`
2. `remote.invocation.matched` or `remote.invocation.mismatched`
3. `remote.a2a.signal.mapped` and `remote.a2a.stream.encoded`, when applicable
4. `remote.a2a.completed` when the task reaches a terminal state

Use the `createRemoteA2a*Record` builders for the final two stages. The adapter
selects `debug`, `info`, or `warn` from the record level; logger selection,
sinks, retention, and sampling remain application-owned.

## Diagnose the reported failure

| Status and detail                                                      | Check                                                                                                                                | Likely owner                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `401` — `Missing or malformed Authorization header`                    | Confirm the route is a Forge Remote invocation and receives `Authorization: Bearer <FIT>`.                                           | Route or Forge invocation configuration     |
| `401` — `Forge Invocation Token is not a well-formed JWT`              | Check header forwarding or request mutation. A FIT must have three compact-JWT segments.                                             | Proxy or caller                             |
| `401` — `Forge Invocation Token uses an unsupported signing algorithm` | Confirm the caller sends a Forge `RS256` FIT. Do not broaden the library allowlist.                                                  | Caller or Forge integration                 |
| `401` — `Forge Invocation Token is missing a key ID`                   | Confirm the token is a Forge-issued FIT; key rotation requires a `kid`.                                                              | Caller or Forge integration                 |
| `401` — `Forge Invocation Token signing key is unknown`                | Check that the configured JWKS URL is Forge's JWKS and that the remote can refresh it. Retry only with a newly issued request.       | Forge integration or JWKS configuration     |
| `401` — `Forge Invocation Token signature is invalid`                  | Check for token alteration, the wrong JWKS environment, or a non-Forge caller.                                                       | Proxy, environment configuration, or caller |
| `401` — `Forge Invocation Token has expired`                           | Check remote clock synchronization and request delay. Obtain a new Forge invocation rather than reusing the token.                   | Remote runtime or caller                    |
| `401` — `Forge Invocation Token claims are not permitted`              | Compare configured issuer and audience with the Forge invocation. Check explicit `audience`, `issuer`, and `deriveAudience` options. | Remote configuration                        |
| `502` — `Forge Invocation Token verification could not complete`       | Check DNS, TLS, egress, and reachability for the configured JWKS URL.                                                                | Remote infrastructure                       |

## Isolate the verification boundary

To distinguish an application issue
from a library issue,
reproduce the request validation without your route's business logic.
Supply the same non-sensitive validation configuration
and a test JWKS resolver.

```ts
const result = await validateAuthHeader({
  authorization: `Bearer ${testFit}`,
  audience: "ari:cloud:ecosystem::app/your-app-id",
  issuer: "forge/invocation-token",
  jwks: testJwks,
});
```

A valid `RS256` FIT
whose RSA public JWK has the matching `kid` should return an `ok` result.
A test token using `ES256`,
a missing `kid`,
a different RSA key,
an expired `exp`,
or a forbidden issuer/audience
should return the corresponding safe `401` diagnostic.
A resolver that cannot fetch or return a key should produce `502`.

If that minimal reproduction does not follow the table,
retain only redacted configuration
and the safe Problem Details result
when reporting a library bug.
Do not attach production FITs or JWKS responses.

## Continue after authentication succeeds

A successful result means the FIT is verified;
it does not establish a route's forwarded-token requirements or application authorization.
Apply a [Remote Invocation Contract](apply-remote-invocation-contracts.md)
next when the route requires forwarded Forge tokens.
