# Keep Core Sans-IO and Framework-Neutral

The Forge Remote Helper Library will keep its core value-oriented and
framework-neutral: parse, classify, verify, and model Forge Remote data through
plain inputs, outputs, and injected dependencies. The root package may provide
thin authoritative conveniences around `jose`, JWKS, and injected `fetch`, but
web-framework middleware, request mutation, storage, logging, and runtime
orchestration belong in applications or optional Remote Extension Packages.
