# Provide Data-Only HTTP Auth Failure Mapping

Remote Authentication will expose a tiny framework-neutral HTTP Auth Failure
Mapping helper that converts auth Problem Details into `{ status, body }`, while
still deferring Express, Fastify, Hono, and other middleware adapters. This
standardizes the 401 versus 502 response boundary without making the first auth
slice responsible for any HTTP framework integration.
