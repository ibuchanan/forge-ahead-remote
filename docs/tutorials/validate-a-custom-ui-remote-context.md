# Validate a Custom UI Remote Context

In this tutorial, we will build a small local script that creates a verified
Forge Remote context shape and checks it against the Custom UI invocation
contract.

## Prepare the package

Install dependencies and build the package:

```sh
npm install
npm run build
```

You will have compiled entrypoints in `dist/`.

## Create the walkthrough script

Create `tmp/custom-ui-contract.mjs`:

```js
import { buildForgeRemoteContext } from "../dist/context.mjs";
import {
  customUiInvocation,
  validateRemoteInvocationContract,
} from "../dist/invocation.mjs";

const context = buildForgeRemoteContext({
  fit: {
    sub: "ari:cloud:jira::site/example-user",
    app: { id: "app-1" },
  },
  verification: {
    audience: "app-1",
    issuer: "forge/invocation-token",
  },
  forwardedSystemToken: "system-token",
  forwardedUserToken: "user-token",
});

const result = validateRemoteInvocationContract(context, customUiInvocation);

if (result.isErr()) {
  throw new Error(JSON.stringify(result.error));
}

console.log(result.value.contract.name);
console.log(Object.keys(result.value.forwardedTokens).sort().join(","));
```

This script uses only local values, so it does not need a real Forge request.

## Run the script

Run:

```sh
node tmp/custom-ui-contract.mjs
```

The output will be:

```txt
custom-ui-invocation
system,user
```

## Remove the user token

Delete the `forwardedUserToken` line from `tmp/custom-ui-contract.mjs`, then run
the script again:

```sh
node tmp/custom-ui-contract.mjs
```

This time the script throws a contract mismatch because the Custom UI invocation
contract requires both forwarded token kinds.

## Restore the script

Put the `forwardedUserToken` line back:

```js
  forwardedUserToken: "user-token",
```

Run the script one final time:

```sh
node tmp/custom-ui-contract.mjs
```

You should see the successful output again.
