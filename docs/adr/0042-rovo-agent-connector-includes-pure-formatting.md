# Rovo agent connector includes pure formatting

The Rovo Agent Connector Layer will include pure JSON-RPC response builders and
formatters for Jira remote-agent expectations. These helpers should transform
A2A task and stream values into connector-ready values, but they should not write
HTTP responses, emit SSE chunks, load task snapshots from storage, or otherwise
own route/runtime behavior.
