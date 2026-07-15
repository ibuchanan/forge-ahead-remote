# Context Excludes Raw Request Headers

`ForgeRemoteContext` will contain normalized values only: verified FIT payload,
verification metadata, and explicitly wrapped forwarded tokens. It will not
retain raw request headers or framework request objects, reducing accidental
logging and leakage risk while keeping the core value-oriented and independent
from HTTP transport details.
