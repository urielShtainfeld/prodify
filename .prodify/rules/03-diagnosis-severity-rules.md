# Rule 03 — Diagnosis Severity Rules

## Purpose
Standardize issue severity so results remain actionable.

## Severity Definitions

### Critical
Use only when the issue materially threatens:
- correctness
- operability
- security
- architectural integrity

Examples:
- circular dependencies in core execution paths
- unvalidated external input at critical boundaries
- direct mixing of core business logic with infrastructure in high-centrality modules

### High
Use when the issue significantly increases maintenance or failure risk.

Examples:
- very large files in central modules
- core functions with missing error handling
- obvious mixed concerns across important boundaries

### Medium
Use when the issue is harmful but not immediately destabilizing.

Examples:
- dense TODO/FIXME clusters
- duplicated logic in non-critical paths
- naming inconsistencies that reduce readability

### Low
Use for minor cleanliness or consistency issues.

## Rules
- Prefer under-classifying over exaggerating.
- Every non-low issue must reference concrete files.
- Avoid noisy reports that overwhelm the plan.
