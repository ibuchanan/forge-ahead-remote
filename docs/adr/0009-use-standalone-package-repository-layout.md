# Use Standalone Package Repository Layout

`@forge-ahead/remote` will live as the root package of this repository rather
than under a `packages/remote` workspace. The repo was created from another
standalone Forge Ahead package, so matching that shape reduces setup churn while
still allowing `ranch-forge/packages/forge-ahead` to consume the package and
provide compatibility re-exports during migration.
