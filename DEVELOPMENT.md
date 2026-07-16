# Development

This covers the local development loop for `@forge-ahead/remote` itself. See
[README.md](README.md) for package purpose, first use, and documentation links.

## Setup

Use Node 22 or newer and npm for the local package workflow:

```sh
npm install
npm run build
```

## Common Scripts

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

- `src/index.ts` is the root package entrypoint. It re-exports the pure `jwt`
  and `context` APIs alongside root-only verification helpers from
  `src/verify.ts`.
- `src/jwt.ts` backs `@forge-ahead/remote/jwt` with JWT parsing and inspection
  helpers that do not verify signatures.
- `src/context.ts` backs `@forge-ahead/remote/context` with the pure
  `ForgeRemoteContext` builder and related types.
- `src/invocation.ts` backs `@forge-ahead/remote/invocation` with Remote
  Invocation Contract types, presets, and validation.
- `src/a2a/` backs `@forge-ahead/remote/a2a` with task-state, stream-response,
  signal-mapping, and A2A-scoped JSON-RPC helpers.
- `src/rovo.ts` backs `@forge-ahead/remote/rovo` with Jira/Rovo remote-agent
  method narrowing and response formatting.
- `test/*.test.ts` and `test/a2a/*.test.ts` cover behavior, import boundaries,
  and package boundaries that lock the public API.
- `tsdown.config.ts` builds each package entrypoint.
- `CONTEXT.md` and `docs/adr/` carry the domain glossary and design decisions
  that test and API names should match.
- `docs/tutorials/`, `docs/how-to-guides/`, `docs/reference/`, and
  `docs/explanation/` hold Diataxis-shaped user documentation.
- `specs/` holds planning and reference material: the extraction design doc,
  ticket definitions, and vendored reference implementations that informed this
  package's API and tests. It is excluded from build, lint, and test.

## Public Boundaries

Keep each public entrypoint narrow:

- Root exports stay focused on Forge Remote authentication plus the pure JWT and
  context helpers already re-exported from `src/index.ts`.
- `@forge-ahead/remote/jwt` and `@forge-ahead/remote/context` stay
  dependency-light and do not import `jose`, `zod`, framework packages, Forge
  packages, logging, verification, invocation, A2A, or Rovo code.
- `@forge-ahead/remote/invocation` does not perform request authentication and
  does not import `jose`, `zod`, or `src/verify.ts`.
- `@forge-ahead/remote/a2a` does not depend on Forge Remote Context,
  invocation contracts, Rovo, storage, route handlers, or framework types.
- `@forge-ahead/remote/rovo` may depend on A2A helpers, but it does not depend
  on Forge Remote Context, invocation contracts, storage, route handlers,
  framework packages, Forge packages, or logging.
- Framework adapters, logging integrations, storage abstractions, product API
  clients, and SSE transport writers belong in callers, examples, or future
  extension packages.

## Documentation Maintenance

Keep `README.md` as the front door. It should summarize capabilities and link
to deeper docs without duplicating full tutorials, how-to guides, reference
tables, or architecture explanations.

When adding or changing a public capability:

1. Update the source and package-boundary tests.
2. Update [docs/reference/public-api.md](docs/reference/public-api.md) for new
   entrypoints, exports, presets, or intentionally absent surfaces.
3. Add or update a focused tutorial, how-to guide, or explanation page only when
   the reader need is not already covered.
4. Update the README capability map or documentation routing table when the new
   capability changes first-time evaluation.
5. Refresh the codebase index with `ccc index`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.
