# Defer forge-ahead Consumer Migration

This repository will document a migration path from the legacy `forge-ahead`
Remote Authentication shape to `@forge-ahead/remote` in `MIGRATION.md`, rather
than editing or removing the duplicate implementation in `forge-ahead` itself.
This repository only has a vendored, read-only reference snapshot of one
legacy consumer (`specs/explore-jira-agent-assignment/packages/forge-ahead/src/forge/remote.ts`)
for API-shape evidence; it is not a live checkout of `forge-ahead` that this
extraction can safely edit. `MIGRATION.md` gives `forge-ahead` maintainers a
concrete before/after mapping so the actual consumer migration and duplicate
removal can happen as a follow-up change in that repository.
