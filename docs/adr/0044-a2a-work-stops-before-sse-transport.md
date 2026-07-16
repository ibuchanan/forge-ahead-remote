# A2A work stops before SSE transport

The remote-agent/A2A capability may build and encode stream response values, but
it will not own SSE transport behavior in the first slice. Setting headers,
flushing, writing chunks, closing connections, and handling disconnects belong in
examples, route code, or a later adapter, not in the pure A2A Contract Layer or
Rovo Agent Connector Layer.
