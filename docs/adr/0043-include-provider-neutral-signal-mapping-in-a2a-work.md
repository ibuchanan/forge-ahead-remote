# Include provider-neutral signal mapping in A2A work

Remote Agent Signal Mapping belongs in the remote-agent/A2A capability because
it is pure domain translation from application or agent-runtime progress signals
into A2A-visible events. It should remain separate from runtime/session code: no
task identifiers, context identifiers, timestamps, storage, route handling, or
wire encoding should be required to use the mapper.
