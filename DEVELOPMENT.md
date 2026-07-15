# Development

This covers the local development loop for `@forge-ahead/remote` itself.
See [README.md](README.md) for package usage.

## Setup

Use Node 22 or newer and npm for the local package workflow:

```sh
npm install
npm run build
```

## Common scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the ESM package with `tsdown`. |
| `npm run dev` | Rebuild with `tsdown --watch`. |
| `npm run check` | Run format, lint, TypeScript, and test checks. |
| `npm run format` | Format files with Biome. |
| `npm run lint:fix` | Apply Biome lint fixes. |
| `npm test` | Run the Vitest test suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run Vitest with coverage reporting. |
| `npm run changelog` | Generate changelog output with `git cliff`. |

## Project Layout

- `src/index.ts` is the root package entrypoint; it re-exports the pure
  `jwt` and `context` APIs alongside the root-only verification helpers.
  `src/jwt.ts` and `src/context.ts` back the `jwt` and `context` subpaths;
  `src/verify.ts` owns the `jose`-backed verification shell.
- `test/*.test.ts` covers each capability, including import-boundary and
  package-boundary tests that lock the public API.
- `tsdown.config.ts` builds each package entrypoint.
- `CONTEXT.md` and `docs/adr/` carry the domain glossary and design
  decisions that test and API names should match.
- `specs/` holds planning and reference material: the extraction design doc,
  ticket definitions, and vendored reference implementations that informed
  this package's API and tests. It is excluded from build, lint, and test.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.
