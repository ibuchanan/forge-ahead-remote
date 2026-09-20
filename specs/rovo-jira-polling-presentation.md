# Specification: Jira polling presentation policy

<!-- cspell:ignore a2aproject -->

## Status

**Proposed additive API.** This specification records a downstream consumer
regression and defines the minimal, pure presentation policy needed to prevent
it. It is a library-internal product specification, not a replacement for the
A2A protocol or SDK reference documentation.

## Purpose

Add a small Jira/Rovo-specific presentation policy to `@forge-ahead/remote`.
When a consumer synchronously returns a paused A2A task during Jira polling,
the policy must retain the first source task-status event while compacting
eligible transient progress text into the following pause.

The policy is deliberately framework-neutral. It does not own an A2A server,
HTTP or SSE writes, task storage, an executor, or application logging.

## Consumer evidence

This specification was extracted from the `explore-rovo-agent-connector`
simulator on 2026-08-24. It contains the evidence required to implement the
change without access to that repository or its runtime logs.

### Observed failure

Jira sent a normal A2A JSON-RPC `SendMessage` request through Forge Remote.
Jira reported a generic technical error while its backend logged an
`A2AClientHTTPError: Request failed with HTTP 500`. The error originated from
`org.a2aproject.sdk.client.transport.jsonrpc.JSONRPCTransport`.

The remote service used:

- `@a2a-js/sdk` `^1.0` for the A2A JSON-RPC server and task-event delivery;
- `@forge-ahead/remote` for Forge Invocation Token authentication and request
  context; and
- a transport-aware scenario projection intended to make polling prompts less
  noisy.

The regression transformed this initial sequence:

```text
working("Progress")
input-required("Continue")
```

into:

```text
input-required("Progress\n\nContinue")
```

The transform removed the first published task event. In the normal Jira
polling `SendMessage` flow, the SDK did not complete the HTTP response and Jira
eventually treated the request as a 500.

### Reproduction evidence

The consumer's complete remote test suite initially hung at a polling
Markdown/checkpoint case. The request was dispatched but never produced the
server's `request completed` log. The test exercised the actual
`@a2a-js/sdk` server stack, not a mocked response formatter.

Restoring the initial `working` event made the request finish with HTTP 200.
The consumer's compiled remote suite then passed: **38 tests, 0 failures**.

```text
working("Progress")
input-required("Progress\n\nContinue")
```

The prompt retains compacted text while the SDK receives the initial task event
it requires.

### Scope qualification

This evidence does **not** claim that A2A universally forbids an initial
`input-required` task. The consumer has an immediate-return,
initial-input-required scenario that passes. The unsafe observed case is a
normal Jira polling send where a presentation transform removed the first task
update from an otherwise active task flow.

Streaming was not affected because the consumer preserves its original event
sequence.

## Public API

Expose the policy from the existing `@forge-ahead/remote/rovo` subpath. It must
accept the SDK's exported `TaskStatusUpdateEvent` type directly; it must not
introduce a generic event abstraction, a `RemoteAgentSignal` input, or a new
transport selector.

```ts
import type { TaskStatusUpdateEvent } from "@forge-ahead/remote/a2a";

export type RovoPollingPresentationOptions = {
  /**
   * Enables Jira polling compaction when the consumer will synchronously return
   * a paused task response. Omit or set to false to preserve every update.
   */
  readonly returnImmediately?: boolean;
};

/**
 * Projects A2A task-status updates for Jira/Rovo polling presentation.
 *
 * This is a pure, immutable sequence transform. It never writes a response,
 * invokes an A2A handler, or validates task-state transitions.
 */
export function projectRovoTaskStatusUpdates(
  events: readonly TaskStatusUpdateEvent[],
  options?: RovoPollingPresentationOptions,
): TaskStatusUpdateEvent[];
```

`returnImmediately` defaults to `false`. In that mode, the result is a new
array containing the original event references in the original order. No event
or nested value is cloned or modified because no presentation transformation
occurs.

The helper is intentionally polling-specific. Streaming consumers must not
call it: their existing sequence is already the desired presentation.

## Terms

| Term | Meaning |
| --- | --- |
| **Source sequence** | The ordered `TaskStatusUpdateEvent` values supplied by the consumer. |
| **Projected sequence** | The ordered values returned by `projectRovoTaskStatusUpdates`. |
| **Initial event** | The source sequence item at index `0`. It is never omitted. |
| **Eligible pair** | Two adjacent source events where the first state is `working`, the second state is `input-required` or `auth-required`, both status messages are mergeable, and the second message has not already been marked as compacted. |
| **Mergeable message** | A status message containing exactly one text part whose text is a non-empty string. A whitespace-only string is not mergeable. |
| **Pause event** | An eligible pair's second event. Its state and all fields other than its cloned message metadata and text are preserved. |

## Required behavior

### Activation and passthrough

1. If `options.returnImmediately` is not `true`, return a shallow copy of the
   source sequence without compacting, cloning, adding metadata, or changing
   event references.
2. If `options.returnImmediately` is `true`, apply the projection algorithm
   below.
3. An empty sequence returns an empty, distinct array.

### Eligible-pair projection

For every eligible pair in source order:

1. Keep the pause event's task ID, context ID, state, final flag, timestamps,
   and all other event fields.
2. Clone the pause event and its status message; do not mutate a source value.
3. Replace the pause message's sole text value with:

   ```text
   <working text>\n\n<pause text>
   ```

4. Preserve all existing message metadata entries and add the library-owned
   idempotence marker described in [Idempotence](#idempotence).
5. If the `working` event is the initial event, emit it unchanged and then emit
   the cloned pause event. The initial event is never omitted.
6. Otherwise, omit the later `working` event and emit the cloned pause event in
   its place.

The policy applies to both `working → input-required` and
`working → auth-required` pairs. It does not compact any other state pair.

Example with an initial progress event:

```text
source:
  working("Progress")
  input-required("Continue")
  completed("Done")

projected:
  working("Progress")
  input-required("Progress\n\nContinue")
  completed("Done")
```

Example with a later transient progress event:

```text
source:
  working("Starting")
  input-required("Need a repository")
  working("Checking access")
  auth-required("Authorize GitHub")

projected:
  working("Starting")
  input-required("Starting\n\nNeed a repository")
  auth-required("Checking access\n\nAuthorize GitHub")
```

### Ineligible pairs and lifecycle preservation

Leave events unchanged, in order, when any of the following is true:

- the candidate updates are not adjacent;
- the first update is not `working`;
- the second update is not `input-required` or `auth-required`;
- either update has no status message;
- either message has zero, multiple, non-text, empty-text, or whitespace-only
  parts;
- the pause message is already marked as compacted;
- the pair spans a terminal state or any other state; or
- the sequence contains artifacts or other non-status events outside this
  helper's input contract.

The helper does not insert a `working` event. In particular, an explicit
initial `input-required` or `auth-required` response remains initial and is
not changed merely because `{ returnImmediately: true }` was selected.

The helper does not validate, repair, or otherwise reinterpret A2A task-state
transitions. Existing task-state transition validation remains authoritative.

### Idempotence

The function must be idempotent:

```ts
const once = projectRovoTaskStatusUpdates(source, { returnImmediately: true });
const twice = projectRovoTaskStatusUpdates(once, { returnImmediately: true });
// `twice` is semantically equivalent to `once`; progress text is not duplicated.
```

To achieve this, the cloned pause message must contain a namespaced,
library-owned marker in its A2A message metadata. The implementation must use a
stable key owned by this package, such as
`forge-ahead/rovo-jira-polling-presentation`, with a versioned value that
identifies the message as compacted by this policy. It must preserve all
unrelated metadata entries. A marked pause message is not eligible for another
merge.

The exact metadata value and key should be exported only if consumers need to
inspect it. The initial implementation should keep this implementation detail
private while making its behavioral consequence—idempotence—public and tested.

### Safety and immutability

The implementation must:

- return a new array for every call;
- never mutate source events, source status objects, source messages, message
  parts, or source metadata;
- clone only the transformed pause event and its nested values necessary to
  change text and metadata;
- preserve task IDs, context IDs, state, final flags, timestamps, and all
  untouched fields;
- retain the source order of every emitted event; and
- omit only a permitted, non-initial `working` event from an eligible pair.

## Algorithm

Use a single left-to-right pass over the source sequence.

```text
result = []
index = 0

while index < events.length:
  current = events[index]
  next = events[index + 1]

  if returnImmediately is true and current + next form an eligible pair:
    projectedPause = clone next with merged text and compacted metadata marker

    if index is 0:
      append current unchanged

    append projectedPause
    index += 2
    continue

  append current unchanged
  index += 1

return result
```

This algorithm consumes each eligible pair exactly once. It preserves index `0`
by emitting `current` before its merged pause. Because each projected pause is
marked, a subsequent invocation treats it as ineligible and cannot duplicate
its progress text.

## Non-goals

This addition must not:

- wrap `@a2a-js/sdk` request handlers;
- own Express, HTTP responses, SSE, or JSON-RPC dispatch;
- persist or retrieve tasks;
- select polling versus streaming from a Forge manifest;
- define universal A2A semantics beyond Jira/Rovo compatibility;
- transform artifacts, messages, or heterogeneous SDK stream events;
- infer the consumer's response strategy from global state, HTTP request
  objects, or SDK internals; or
- hide protocol errors by fabricating arbitrary task states.

Those concerns remain with the consuming service, the A2A SDK, or the product
integration.

## Implementation boundaries

1. Reuse the `TaskStatusUpdateEvent` type exported by `@a2a-js/sdk`.
2. Add the pure projector in the `rovo` module alongside existing Rovo
   formatting helpers; re-export it from `src/rovo.ts` only.
3. Keep the `a2a` subpath focused on provider-neutral A2A utilities. Do not
   move this Jira/Rovo presentation policy there.
4. Do not add package dependencies, SDK server-runtime dependencies, HTTP
   framework dependencies, or persistent state.
5. Use only the message metadata facility supplied by the supported SDK type;
   verify the exact SDK v1 metadata field and value shape during implementation.
6. Add TSDoc that states the Jira/Rovo polling scope, the explicit opt-in, the
   first-event invariant, and the fact that streaming is outside this helper's
   contract.

## Acceptance criteria

### Unit tests in `@forge-ahead/remote`

Add focused tests that demonstrate all of the following:

1. The `rovo` subpath exports the function and options type without widening the
   root or `a2a` public APIs.
2. An omitted options object, `{}`, and `{ returnImmediately: false }` each
   return a distinct array with the same event references and values.
3. An empty input returns an empty, distinct array.
4. An initial `working → input-required` pair retains the original `working`
   event and emits a cloned input-required event with merged text.
5. An initial `working → auth-required` pair follows the same preservation and
   text-merge rule.
6. A later eligible `working → input-required` pair omits only that later
   working event and retains the cloned pause event in order.
7. A later eligible `working → auth-required` pair follows the same rule.
8. Multiple eligible pairs are processed left-to-right without crossing pair
   boundaries.
9. Non-adjacent pairs, incorrect states, missing messages, zero-part messages,
   multipart messages, non-text parts, empty/whitespace-only text, terminal
   states, and already-marked pauses pass through unchanged.
10. An explicit initial `input-required` or `auth-required` update is preserved
    and never gains an invented `working` update.
11. The projector does not mutate the original array, events, statuses,
    messages, parts, or metadata.
12. The compacted pause retains all fields and unrelated metadata entries, adds
    the namespaced marker, and contains the expected blank-line text separator.
13. Applying the projector twice produces a sequence semantically equivalent to
    the once-projected sequence and does not duplicate progress text.
14. Type and package-boundary tests confirm no HTTP, Express, storage, or SDK
    server runtime is imported by the helper.

### Consumer compatibility test

Retain or add an integration test outside the pure library that sends an actual
`@a2a-js/sdk` JSON-RPC `SendMessage` request using Jira-compatible normal
polling settings. It must assert that an initial
`working → input-required` source plan projected with
`{ returnImmediately: true }`:

- resolves within a bounded test timeout;
- returns HTTP 200;
- reports the paused task state; and
- presents the merged progress text in the paused message.

Keep this black-box test after consumer migration. It protects the boundary
where the defect occurred and complements, rather than replaces, pure-library
unit tests.

## Documentation to ship

Update the public API reference with the `rovo` export and add a concise note
covering:

- this policy is specific to Jira/Rovo polling presentation;
- compaction is opt-in via `{ returnImmediately: true }`;
- a normal polling sequence never loses its initial task-status update;
- only eligible single-text-part `working → input-required` and
  `working → auth-required` pairs are compacted;
- repeated projection is safe but callers should normally project source events
  once; and
- streaming preserves and owns its original event sequence outside this helper.

Do not present this as a universal A2A lifecycle rule. A valid A2A transition
alone does not prove that every Jira request/response interaction completes
correctly.

## Rollout

1. Release this helper as an additive `rovo` subpath export; do not implicitly
   change existing response formatting.
2. Migrate consumer-local polling-compaction logic to this helper, passing
   `{ returnImmediately: true }` only for the corresponding synchronous paused
   response path.
3. Retain the consumer-level black-box SDK/Jira polling test after migration.
4. If Jira or the A2A SDK behavior changes, update this specification and the
   compatibility test from fresh observed evidence. Do not broaden the rule
   speculatively.
