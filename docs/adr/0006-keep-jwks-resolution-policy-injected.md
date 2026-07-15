# Keep JWKS Resolution Policy Injected

The first Remote Authentication slice will support default Atlassian JWKS
verification plus caller injection of a key store or concrete JWKS URL, but it
will not own app allowlists, isolated-cloud label validation, or app-to-JWKS
routing templates. Reference implementations show those policies matter, but
they are deployment-specific enough that the first helper should expose an
injection boundary rather than baking in routing behavior.
