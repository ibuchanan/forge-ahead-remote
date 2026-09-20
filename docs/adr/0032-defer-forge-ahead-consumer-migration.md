# Defer forge-ahead Consumer Migration

This repository does not edit or remove the duplicate Remote Authentication
implementation in `forge-ahead`. It only has a vendored, read-only reference
snapshot of one legacy consumer
(`specs/explore-jira-agent-assignment/packages/forge-ahead/src/forge/remote.ts`)
for API-shape evidence; it is not a live checkout that this extraction can
safely change. Consumer migration and duplicate removal therefore remain
follow-up work in the owning repository.
