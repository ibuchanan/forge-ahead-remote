# Add Context-Returning Validation API

Remote Authentication will preserve the existing `validateAuthHeader()` payload
return shape for source compatibility, and add a separate context-returning
validation API for new callers. That lets the first extraction stay compatible
with `forge-ahead/remote` while giving later Forge Remote helpers one stable
Forge Remote Context shape for verified FIT claims and forwarded OAuth token
headers.
