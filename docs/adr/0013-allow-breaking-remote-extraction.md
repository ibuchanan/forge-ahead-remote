# Allow Breaking Remote Extraction

The `@forge-ahead/remote` extraction may break old `forge-ahead/remote` helper
contracts when doing so improves the long-term sans-io API shape. The known
consumer is vendored into this repository's `specs/` references, so preserving
legacy positional calls and compatibility subpaths is less valuable than
starting the standalone package with coherent root, `jwt`, and `context`
entrypoints.
