# Cross-cutting standards

Rules live in `guidelines/` (one owner per topic, see `guidelines/README.md`). This file only adds process rules.

## Process rules

- Read the relevant guideline file before generating code, and cite the rule ID (`BE-03`, `FE-02`, ...) in review notes.
- Review every AI-generated artifact against the guidelines before it is committed. Record each violation in `guidelines/violation-report.md` with the rule broken and the fix.
- Record each refinement round (before, prompt, after, evidence) in the feature's `CHANGELOG.md`.
- Run `python scripts/check_guidelines.py` and `python scripts/check_traceability.py` before a commit.
- Do not implement behaviour that is not in an acceptance criterion. Add the criterion first.

## Where the non-negotiables live

- Secrets and configuration: BE-10. Authentication and authorization: BE-07, BE-08, FE-05.
- Validation: BE-04 (server), FE-08 (client convenience). Error handling: BE-05, BE-06, FE-07.
- Browser exposure: FE-11. Data integrity: DB-01 to DB-06.
