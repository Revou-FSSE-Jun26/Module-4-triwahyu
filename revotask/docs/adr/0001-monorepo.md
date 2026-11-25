# ADR 0001: Use a Monorepo

- Status: Accepted
- Decision: Keep backend, frontend, specs, contracts, and CI in one repository.
- Rationale: one shared agent context, one traceability workflow, coordinated API changes, and one CI entry point.
- Consequences: root tooling must coordinate Python and Node workflows; ownership boundaries remain explicit by directory.
