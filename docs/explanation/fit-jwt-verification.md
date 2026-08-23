# Forge Invocation Token JWT Verification

A Forge Invocation Token (FIT) is the Bearer token
that Forge sends to a remote backend.
It is a JSON Web Token (JWT):
three dot-separated parts containing a header, a payload, and a signature.
The payload holds named values called claims,
such as the token's issuer, audience, and expiry.
The header and payload can be decoded by anyone who has the token.
Decoding them does **not** prove
that Forge created the token
or that its contents are safe to use.

A remote may use FIT data for
identity,
tenant context,
and application context
only after it has verified the token's signature and required claims.

## What `RS256` means for a FIT

The FIT header contains `alg`,
the algorithm the token says was used to sign it.
This package accepts only `RS256` for Forge FITs.
`RS256` means an RSA public-key signature checked with SHA-256.

This is an explicit policy,
not just a compatibility setting.
The header is untrusted until the signature succeeds,
so it must not choose which kinds of signatures the remote is willing to accept.
The package first rejects every algorithm other than `RS256`,
then resolves a key for `RS256`.
That prevents a token signed with another scheme
from being treated as a Forge FIT.

Forge documents the broader contract:
it sends the FIT in the Bearer Authorization header,
and remote backends must validate it
against Forge's JWKS for their application audience.
See [Forge Remote essentials: verifying remote requests](https://developer.atlassian.com/platform/forge/remote/essentials/)
and the [Forge Remote invocation contract](https://developer.atlassian.com/platform/forge/forge-remote-invocation-contract/).
Those documents establish the Forge-specific transport and verification responsibility.
The exact meaning of `RS256`
and the reason to pin accepted algorithms
come from the JSON Web Signature (JWS) and JSON Web Algorithms (JWA) standards
cited in the [Public API Reference](../reference/public-api.md).

## How Forge's public key is selected

Forge publishes public signing keys as a JSON Web Key Set (JWKS).
A key set can contain several keys during normal key rotation.
The FIT header's `kid` value is the key identifier:
it tells the resolver which published public key to try.
The request validators require a non-empty `kid`.

Selecting a key is not the same as trusting the token.
After selecting the matching RSA public key,
the package verifies the FIT signature with RSA-SHA256.
Only a successful signature check
proves that Forge signed the header and payload together.

The library must read some unverified information before that point.
It reads the header to enforce `RS256` and find `kid`;
it may also decode the payload to select expected audience or issuer values.
This data is only an input to verification.
It is never
authorization,
tenant identity,
user identity,
or trusted application context
on its own.

## What is verified, and in what sense

After signature verification,
the package checks the claims that constrain
how the FIT may be used:

- **Issuer** identifies the expected token issuer.
  Request validators default it to `forge/invocation-token`.
- **Audience** identifies the Forge application that may accept the token.
- **Expiry** prevents a previously valid token from being reused indefinitely.

A token is acceptable only when its signature and these checks all succeed.
A valid signature alone is not enough:
a correctly signed token for another app,
or one that has expired,
must still be rejected.

## Why the failures are different

A `401` means the remote received a token it cannot trust.
The package reports safe distinctions
between a malformed token,
an unsupported algorithm,
a missing key ID,
an unknown key,
an invalid signature,
an expired token,
and forbidden claims.
The response deliberately does not include
the FIT,
its claims,
or key material.

A `502` means the remote could not complete verification.
For example,
because it could not reach the configured JWKS.
This is different from an untrusted FIT:
the request has not been authenticated,
but the immediate problem is the remote's ability
to obtain the verification key.

For operational diagnosis,
see [Debug Forge Invocation Token validation](../how-to-guides/debug-forge-invocation-token-validation.md).
For the API contract, standards, and isolated-cloud JWKS routing,
see the [Public API Reference](../reference/public-api.md).
