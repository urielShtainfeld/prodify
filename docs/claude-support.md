# Claude Support

## Goal
Define the current Claude bootstrap path and the still-planned compatibility-file surface.

## Current Supported Behavior
- Bootstrap path: `.prodify/AGENTS.md`
- Root compatibility file: not part of the default lifecycle

## Planned Compatibility Surface
- Status: `planned`
- Canonical source: `.prodify/AGENTS.md`
- Future target path if enabled: `CLAUDE.md`

## Direct Copy vs Transformation
- Planned behavior: direct copy with generated header.
- Future option: minor title normalization if Claude-specific naming proves useful.
- No semantic reduction should occur unless a later design explicitly defines it.

## Limitation
- The bootstrap path is already `.prodify`-first.
- The compatibility file remains design-only until explicitly implemented.
