# Use Options Object for Auth Header Validation

`validateAuthHeader()` will take a single named input object instead of the old
`authHeader, options` pair. This keeps request-boundary validation consistent
with options-object verification APIs and gives the standalone package room to
add future inputs without positional overloads.
