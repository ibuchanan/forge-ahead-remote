# @forge-ahead/remote

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

A Forge Remote Helper Library for externally hosted services that receive
requests through Atlassian Forge Remote. The first implementation slice is
Remote Authentication: parsing and verifying Forge Invocation Tokens,
resolving Atlassian signing keys, and turning request-boundary authentication
failures into structured results.

This package is currently private (`"private": true` in `package.json`), so
use it from this repository or a configured private workspace rather than
installing it from the public npm registry.

The package is published as ESM and targets Node 22 or newer.

## Status

This is the standalone package baseline. The `jwt`, `context`, and root
verification APIs described in [`specs/remote-auth-tickets.md`](specs/remote-auth-tickets.md)
are being built ticket by ticket. See [`CONTEXT.md`](CONTEXT.md) for the
domain glossary and [`docs/adr/`](docs/adr/) for the design decisions behind
this package's shape.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup, package scripts, and
project layout. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.

## License

Apache-2.0. See [LICENSE](LICENSE).
