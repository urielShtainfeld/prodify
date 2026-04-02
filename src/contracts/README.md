# Contracts Subsystem

This directory owns the contract pipeline end to end.

- `parser.ts`: parses Markdown plus YAML frontmatter into a source document.
- `source-schema.ts`: validates source-contract fields and normalizes them into the runtime shape.
- `compiled-schema.ts`: validates checked-in compiled JSON before runtime uses it.
- `compiler.ts`: compiles source contracts and writes runtime JSON contracts.
- `freshness.ts`: computes whether compiled runtime contracts are fresh relative to source contracts.
- `index.ts`: public entrypoint for the contract subsystem.
