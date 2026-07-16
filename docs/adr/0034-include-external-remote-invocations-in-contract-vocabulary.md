# Include external remote invocations in contract vocabulary

Remote Invocation Contracts will include external/public remote routes that do
not carry a Forge Invocation Token, because the reference implementation shows
those routes still belong to the same remote-backend operating surface. The
contract vocabulary may describe that FIT is absent, authentication is
caller-owned, an installation identifier is required, and a system token may be
rehydrated later, but this slice will not implement Basic auth, shared-secret
handling, storage, or token rehydration.
