# Keep Verification APIs Root-Only

Verification APIs will live on the root `@forge-ahead/remote` entrypoint rather
than a separate `@forge-ahead/remote/verify` subpath. The package already has
dependency-light `jwt` and `context` subpaths; a verification subpath would still
pull in `jose`, JWKS behavior, and `@forge-ahead/errors`, so it would add API
surface without creating a meaningful dependency boundary.
