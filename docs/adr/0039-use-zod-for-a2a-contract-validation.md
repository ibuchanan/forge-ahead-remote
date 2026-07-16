# Use zod for A2A contract validation

A2A Contract Validation will use `zod` for shallow runtime protocol checks
rather than hand-written validators. The prior reference implementation found
manual checks verbose and less readable, while `zod` expresses the domain rules
around stream variants and payload shape more directly; the added dependency is
acceptable for the remote-agent helper surface.
