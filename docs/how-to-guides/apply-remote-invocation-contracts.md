# Apply Remote Invocation Contracts

This guide shows how to validate a route's forwarded-token guarantees after a
Forge Remote request has been authenticated.

Prerequisites: a route handler, access to the incoming request headers, and a
known Forge Remote request category for that route.

## Choose the contract

Select the preset that matches the route:

| Route category | Preset |
| --- | --- |
| Custom UI resolver call | `customUiInvocation` |
| Backend function invocation | `backendFunctionInvocation` |
| Async event invocation | `asyncEventInvocation` |
| Scheduled trigger invocation | `scheduledTriggerInvocation` |
| External Remote invocation | `externalRemoteInvocation` |

## Validate authentication first

Authenticate the Forge Remote request at the request boundary:

```ts
import {
  toHttpAuthFailureResponse,
  validateForgeRemoteRequest,
} from "@forge-ahead/remote";

const authResult = await validateForgeRemoteRequest({
  headers: {
    authorization: request.headers.authorization,
    appSystemToken: request.headers["x-forge-oauth-system"],
    appUserToken: request.headers["x-forge-oauth-user"],
  },
});

if (authResult.isErr()) {
  const { status, body } = toHttpAuthFailureResponse(authResult.error);
  return sendResponse(status, body);
}
```

## Validate the route contract

Pass the verified context to the selected contract:

```ts
import {
  customUiInvocation,
  validateRemoteInvocationContract,
} from "@forge-ahead/remote/invocation";

const contractResult = validateRemoteInvocationContract(
  authResult.value,
  customUiInvocation,
);

if (contractResult.isErr()) {
  return sendResponse(contractResult.error.status, contractResult.error);
}
```

## Use the narrowed forwarded tokens

Read forwarded tokens from the contract match:

```ts
const { forwardedTokens } = contractResult.value;

await handleCustomUiWork({
  systemToken: forwardedTokens.system?.token,
  userToken: forwardedTokens.user?.token,
});
```

If the selected contract requires a token and the incoming request did not
include it, `validateRemoteInvocationContract` returns a `400` Problem Details
result before route-specific work begins.

## Handle async acknowledgement separately

For `asyncEventInvocation`, read the acknowledgement metadata from the contract
and send the route response from application code:

```ts
const { acknowledgement } = contractResult.value.contract;

if (acknowledgement !== undefined) {
  return sendResponse(acknowledgement.status, { status: "accepted" });
}
```

The package describes acknowledgement expectations; it does not send framework
responses.
