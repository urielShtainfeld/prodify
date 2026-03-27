# Rule 04 — Architecture Rules

## Purpose
Define the architectural posture Prodify should favor.

## Default Target
When feasible, prefer **Modular Clean Architecture** with these layers:
1. Domain
2. Application
3. Infrastructure
4. Interface

## Dependency Rules
- Dependencies should point inward toward Domain.
- Domain must not depend on Infrastructure or Interface.
- Application may depend on Domain.
- Infrastructure may depend on Application and Domain only when necessary for implementation.
- Interface may depend on Application and Domain-facing contracts, not infrastructure internals directly.

## Exceptions
- If the repository is a small CLI or utility library, avoid forcing heavyweight layering.
- Tailor the target architecture to the project type and tech stack.

## Violation Patterns
- controllers/routes calling repositories directly
- domain logic importing framework-specific modules
- infrastructure concerns embedded in UI or interface layer
