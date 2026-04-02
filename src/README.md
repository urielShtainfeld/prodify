# Source Layout

The `src/` tree is organized by subsystem ownership.

- `commands/`: thin CLI orchestration entrypoints only
- `contracts/`: source parsing, schema ownership, compilation, and freshness
- `core/`: runtime state, workspace health, status/doctor/update orchestration, and stage validation
- `presets/`: canonical preset loading and version metadata
- `scoring/`: local repository scoring after validated execution

If a behavior changes the product model, its owning subsystem should be obvious from this layout before you read implementation details.
