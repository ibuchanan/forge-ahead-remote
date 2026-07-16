# Contract validation returns Problem Details results

Remote Invocation Contract Validation will return the existing
`Result<..., ProblemDetails>` shape instead of throwing or returning booleans.
Contract mismatches, such as a missing required forwarded token on an otherwise
verified request, should use a distinct problem type so callers can tell them
apart from Forge Invocation Token verification failures.
