# A2A contract layer includes shallow runtime validation

The A2A Contract Layer will include targeted runtime validators in addition to
TypeScript types and pure task-state helpers. These validators should protect
protocol boundaries, such as stream-response variant exclusivity and legal task
state transitions, while avoiding deep validation of provider-specific payloads,
artifact metadata, or route-level business rules.
