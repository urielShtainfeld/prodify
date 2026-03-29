# OpenCode Support

## Goal
Define the compatibility target for OpenCode.

## Compatibility Mapping
- Status: `experimental`
- Canonical source: `.prodify/AGENTS.md`
- Expected generated target: `.opencode/AGENTS.md`

## Generation Behavior
- Default design: direct copy with generated header.
- Read `.prodify/AGENTS.md`.
- Prepend the standard generated-file header for target `opencode`.
- Write to `.opencode/AGENTS.md` only when the user explicitly opts into the experimental target.

## Limitations
- The target path is provisional until a live OpenCode integration confirms the contract.
- Experimental support should never be enabled implicitly.
- If the integration contract differs, Prodify must surface that mismatch instead of silently adapting.

## Placeholder Strategy
- Document the target and generation rule now.
- Keep CLI support opt-in and clearly labeled experimental.
- Prefer “not yet validated” over claiming full support before the integration is confirmed.
