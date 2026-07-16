# Separate Rovo agent connector layer from A2A

Rovo/Jira remote-agent method narrowing will sit in a separate Rovo Agent
Connector Layer built on top of the A2A Contract Layer. A2A should own task,
message, artifact, stream-response, and state-transition concepts; Rovo-specific
method names, Jira parameter quirks, and connector response formatting should
not be baked into the generic A2A Subpath.
