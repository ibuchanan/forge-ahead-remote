# Isolate zod to the A2A subpath

`zod` is acceptable for A2A Contract Validation, but it should be associated
with the future A2A Subpath rather than the root Remote Authentication surface.
The existing package already uses subpaths to isolate dependency-heavy behavior;
the same shape should keep auth-first consumers from treating remote-agent
protocol validation dependencies as part of the core request-authentication API.
