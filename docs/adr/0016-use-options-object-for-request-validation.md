# Use Options Object for Request Validation

`validateForgeRemoteRequest()` will take a single named input object containing
framework-neutral request headers and verification options. This keeps all
public verification and validation APIs on named inputs, avoids mixed call
styles, and leaves room for future request-boundary fields without introducing
overloads.
