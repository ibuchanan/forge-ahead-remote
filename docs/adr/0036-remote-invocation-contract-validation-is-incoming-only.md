# Remote invocation contract validation is incoming-only

Remote Invocation Contract Validation will check incoming authentication and
forwarded-token requirements, but it will not build, inspect, or enforce
outgoing HTTP responses. Contracts may document expected acknowledgement shapes
such as async `202` responses, but transport enforcement belongs in framework
adapters, examples, or route code rather than the pure remote core.
