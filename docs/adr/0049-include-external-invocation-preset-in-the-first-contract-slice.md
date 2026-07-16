# Include external invocation preset in the first contract slice

The first Remote Invocation Contract slice should include the
`externalRemoteInvocation` preset so the contract taxonomy covers the evidenced
Forge Remote backend shapes. Its validator behavior should remain minimal
because external invocations do not have a Forge Remote Context; authentication,
installation lookup, storage, and system-token rehydration remain outside this
slice.
