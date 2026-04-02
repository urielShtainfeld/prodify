# OpenCode Support

## Goal
Define the current OpenCode bootstrap path and the experimental compatibility-file surface.

## Current Supported Behavior
- Bootstrap path: `.prodify/AGENTS.md`
- Root or `.opencode/` compatibility file: not part of the default lifecycle

## Experimental Compatibility Surface
- Status: `experimental`
- Canonical source: `.prodify/AGENTS.md`
- Future target path if enabled: `.opencode/AGENTS.md`
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
- Prefer “not yet validated” over claiming current default support for compatibility-file generation.
