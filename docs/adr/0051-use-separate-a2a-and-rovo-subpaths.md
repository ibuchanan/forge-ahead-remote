# Use separate A2A and Rovo subpaths

Remote-agent helpers should use separate public entrypoints:
`@forge-ahead/remote/a2a` for the A2A Contract Layer and Remote Agent Signal
Mapping, and `@forge-ahead/remote/rovo` for Rovo Agent Connector behavior. The
Rovo subpath may depend on A2A and JSON-RPC helpers, but the A2A subpath should
not depend on Rovo.
