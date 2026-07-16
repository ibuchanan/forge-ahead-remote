# A2A and Rovo helpers do not require Forge Remote Context

A2A and Rovo protocol helpers should be usable without a Forge Remote Context.
They validate and format protocol values, while route code or framework adapters
compose request authentication, Remote Invocation Contract Validation, and
protocol handling. This keeps remote-agent helpers pure, independently testable,
and usable in contexts where authentication has already happened elsewhere.
