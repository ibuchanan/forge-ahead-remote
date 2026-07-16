# Contract validation returns narrowed matches

Successful Remote Invocation Contract Validation should return a narrowed
contract-specific match value rather than the unchanged Forge Remote Context.
The match value should carry the original context plus typed guarantees such as
required forwarded tokens being present, so route code does not repeat defensive
checks immediately after validation succeeds.
