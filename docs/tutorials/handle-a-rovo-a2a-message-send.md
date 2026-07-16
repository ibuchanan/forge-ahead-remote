# Handle a Rovo A2A Message Send

In this tutorial, we will build a local script that accepts a Jira/Rovo
`message/send` request, maps remote-agent signals into A2A events, and formats a
Rovo connector response.

## Prepare the package

Install dependencies and build the package:

```sh
npm install
npm run build
```

You will have compiled entrypoints in `dist/`.

## Create the walkthrough script

Create `tmp/rovo-a2a-message-send.mjs`:

```js
import {
  createA2aResponseEnvelope,
  encodeA2aStreamEnvelope,
  isValidStreamResponse,
  mapRemoteAgentSignal,
} from "../dist/a2a.mjs";
import {
  formatRovoAgentConnectorResponse,
  isRovoAgentConnectorRequest,
} from "../dist/rovo.mjs";

const request = {
  jsonrpc: "2.0",
  id: "request-1",
  method: "message/send",
  params: {
    message: {
      role: "user",
      parts: [{ kind: "text", text: "Create the Jira issue summary." }],
      messageId: "user-message-1",
      kind: "message",
    },
  },
};

if (!isRovoAgentConnectorRequest(request)) {
  throw new Error("Expected a valid Rovo message/send request.");
}

console.log(`accepted ${request.method}`);

const taskId = "task-1";
const contextId = "context-1";
let messageNumber = 1;
let timestampNumber = 1;

const task = {
  id: taskId,
  contextId,
  status: {
    state: "submitted",
    message: agentMessage("Queued."),
    timestamp: nextTimestamp(),
  },
  kind: "task",
};

function nextTimestamp() {
  const suffix = String(timestampNumber++).padStart(3, "0");
  return `2026-07-16T00:00:00.${suffix}Z`;
}

function agentMessage(text) {
  return {
    role: "agent",
    parts: [{ kind: "text", text }],
    messageId: `agent-message-${messageNumber++}`,
    taskId,
    contextId,
    kind: "message",
  };
}

function streamResponseFromMappedEvent(event) {
  if (event.kind === "content-update") {
    return { message: agentMessage(event.message) };
  }

  if (event.kind === "artifact-update") {
    return {
      artifactUpdate: {
        taskId,
        contextId,
        artifact: event.artifact,
        append: event.append,
        lastChunk: event.lastChunk,
        kind: "artifact-update",
      },
    };
  }

  const timestamp = nextTimestamp();
  task.status = {
    state: event.state,
    message: agentMessage(event.message ?? event.state),
    timestamp,
  };

  return {
    statusUpdate: {
      taskId,
      contextId,
      status: { state: event.state, timestamp },
      message: task.status.message,
      kind: "status-update",
      final: event.final,
    },
  };
}

const signals = [
  { category: "runtime-started" },
  { category: "thinking-process", summary: "Reading the Jira issue." },
  { category: "tool-use", detail: "Checking repository files." },
  {
    category: "artifact-produced",
    artifact: {
      artifactId: "implementation-summary",
      name: "Implementation summary",
      parts: [{ kind: "text", text: "Added the first route skeleton." }],
    },
    lastChunk: true,
  },
  { category: "completed", summary: "Ready for Jira." },
];

for (const signal of signals) {
  const event = mapRemoteAgentSignal(signal);
  const streamResponse = streamResponseFromMappedEvent(event);

  if (!isValidStreamResponse(streamResponse)) {
    throw new Error(`Invalid stream response for ${signal.category}.`);
  }

  const envelope = createA2aResponseEnvelope(request.id, streamResponse);
  console.log(encodeA2aStreamEnvelope(envelope).trim());
}

const finalResponse = formatRovoAgentConnectorResponse(
  request.id,
  task,
  contextId,
);

console.log(JSON.stringify(finalResponse, null, 2));
```

This script keeps storage and HTTP transport out of the walkthrough.

## Run the script

Run:

```sh
node tmp/rovo-a2a-message-send.mjs
```

The first line will be:

```txt
accepted message/send
```

The next lines will start with SSE-shaped A2A chunks:

<!-- markdownlint-disable MD013 -->

```txt
data: {"jsonrpc":"2.0","id":"request-1","result":{"statusUpdate":{"taskId":"task-1","contextId":"context-1","status":{"state":"working"
data: {"jsonrpc":"2.0","id":"request-1","result":{"message":{"role":"agent","parts":[{"kind":"text","text":"Reading the Jira issue."}]
```

<!-- markdownlint-enable MD013 -->

The final JSON-RPC response will end with a completed task:

```json
{
  "jsonrpc": "2.0",
  "id": "request-1",
  "result": {
    "id": "task-1",
    "contextId": "context-1",
    "status": {
      "state": "completed",
      "message": {
        "role": "agent",
        "parts": [
          {
            "kind": "text",
            "text": "Ready for Jira."
          }
        ],
        "messageId": "agent-message-5",
        "taskId": "task-1",
        "contextId": "context-1",
        "kind": "message"
      },
      "timestamp": "2026-07-16T00:00:00.003Z"
    },
    "kind": "task"
  }
}
```

## Break the request method

Change the request method:

```js
  method: "tasks/list",
```

Run the script again:

```sh
node tmp/rovo-a2a-message-send.mjs
```

It will throw:

```txt
Expected a valid Rovo message/send request.
```

## Restore the request method

Change the request method back:

```js
  method: "message/send",
```

Run the script one final time:

```sh
node tmp/rovo-a2a-message-send.mjs
```

You should see the accepted request, stream chunks, and completed task response
again.
