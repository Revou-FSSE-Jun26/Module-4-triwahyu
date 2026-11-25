# Agent entry point

Read `.kiro/steering/product.md`, `tech.md`, `structure.md` and `coding-standards.md` first.
Rules are in `guidelines/` (backend, database, frontend); behaviour contracts are in `docs/contracts/`.
Feature source of truth: `.kiro/specs/NN-*/`; the root `specs/` folder is generated, never edited.
Before committing, run `python scripts/check_guidelines.py`, `check_traceability.py` and `build_specs.py --check`.
Review generated output, log violations in `guidelines/violation-report.md`, and record each refinement in the slice `CHANGELOG.md`.
