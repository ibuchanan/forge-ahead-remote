# Provide remote invocation contract presets and a builder

Remote Invocation Contracts will expose named presets for the Forge Remote
request categories evidenced by the reference implementations, while also
providing a low-level builder for caller-defined variants. Presets keep the
common route contracts concrete and testable, and the builder avoids treating
today's reference apps as the complete set of future Forge Remote invocation
forms.
