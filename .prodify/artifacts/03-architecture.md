# 03-architecture

## Dependency Rules
- Domain rules for the product lifecycle belong to compiled contracts, runtime state handling, and the canonical `.prodify` runtime model; documentation and examples must describe that behavior, not redefine it.
- Application-layer flow definitions such as `.prodify/tasks/` may depend on the contract model, but they must use the same artifact names, step order, and validation semantics as the compiled contracts.
- Infrastructure assets such as `assets/presets/default/canonical/` and the checked-in repo-root `.prodify/` workspace may extend the canonical runtime footprint, but they must not contradict the default lifecycle documented in `README.md` and enforced by tests.
- Interface-layer materials such as `README.md`, `.prodify/AGENTS.md`, and user-facing docs may explain contributor-only root files, but they must not present them as product-required runtime behavior when the default flow is `.prodify`-first.

## Policy Checks
- Flag mixed concerns explicitly.
- Keep Domain dependencies pointing inward only.

## Proposed Structure
- Current pattern classification: layered tooling architecture with clean-architecture intent, confidence `0.76`.
- Target structure for Task 65:
- Domain: compiled contracts, runtime state invariants, stage ordering, and artifact naming rules.
- Application: task execution protocol, preset loading, validation orchestration, and flow-state transitions.
- Infrastructure: preset asset trees, checked-in self-hosted `.prodify/`, filesystem layout, and test fixtures.
- Interface: CLI output, `README.md`, `.prodify/AGENTS.md`, and product-facing documentation.
- Required boundary rule: interface and infrastructure layers must conform to the domain-owned `.prodify`-first lifecycle instead of preserving legacy compatibility-file narratives.
- Required clarity rule: the repo-root `AGENTS.md` may remain only as repository-local contributor guidance, explicitly outside the default Prodify product lifecycle.

## Success Criteria
- The target structure is explicit.
- Architecture violations are listed clearly.

## Tradeoffs
- Keeping forward-looking compatibility-target docs is acceptable only if they are clearly marked as future or non-default behavior; otherwise they act as conflicting runtime guidance.
- Keeping the self-hosted repo-root `.prodify/` workspace is valuable for dogfooding, but it must be labeled as canonical runtime layout plus repo-specific artifacts rather than an exact mirror of `prodify init`.
- Removing every historical artifact immediately would reduce drift fastest, but targeted clarification and test coverage is safer where files still serve repository-development purposes.
