# Start remote-agent work at the A2A contract layer

The first remote-agent helper slice should start at the A2A Contract Layer
rather than shipping generic JSON-RPC helpers as an isolated capability. JSON-RPC
envelope helpers may be included when needed to support A2A integration, but the
library should not present itself as a general JSON-RPC utility package before
it has delivered Forge Remote agent value.
