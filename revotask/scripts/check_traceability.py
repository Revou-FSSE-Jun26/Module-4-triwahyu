"""REQ-NFR-5 traceability gate: requirement -> acceptance criterion -> design -> task -> code or test.

Fails (exit 1) when any link is missing. Unlike the scaffold version, finding zero requirements is a failure.
Usage: python scripts/check_traceability.py [--matrix]   (--matrix prints the table)
"""

from __future__ import annotations

import sys

from specs_lib import ROOT, find_references, load_features, design_routes, PAGE_FILE


def main() -> int:
    features = load_features()
    problems: list[str] = []
    rows: list[tuple[str, str, int, str, str, int]] = []

    all_reqs = {r.id for f in features for r in f.requirements}
    if not all_reqs:
        problems.append("No REQ-IDs found in .kiro/specs/*/requirements.md (nothing to trace).")
    refs = find_references(all_reqs)

    for feature in features:
        if not feature.requirements:
            problems.append(f"{feature.name}: requirements.md defines no REQ-IDs.")
        for req in feature.requirements:
            tasks = feature.tasks.get(req.id, [])
            if not req.acs:
                problems.append(f"{req.id}: no acceptance criteria.")
            if req.id not in feature.design_text:
                problems.append(f"{req.id}: not mapped in {feature.name}/design.md.")
            if not tasks:
                problems.append(f"{req.id}: no task in {feature.name}/tasks.md.")
            if not refs[req.id]:
                problems.append(f"{req.id}: not referenced by any code or test file.")
            rows.append((req.id, feature.name, len(req.acs), ", ".join(tasks), "yes" if refs[req.id] else "NO", len(refs[req.id])))

        # Every route and page named in the design needs a task that names it.
        for method, path in design_routes(feature.design_text):
            if path not in feature.task_text:
                problems.append(f"{feature.name}: route {method} {path} has no task naming it.")
        for page in sorted(set(PAGE_FILE.findall(feature.design_text))):
            if page not in feature.task_text:
                problems.append(f"{feature.name}: page {page} has no task naming it.")

    if "--matrix" in sys.argv:
        print("| REQ | Slice | ACs | Tasks | Referenced | Files |")
        print("|---|---|---:|---|---|---:|")
        for req, name, acs, tasks, ok, count in rows:
            print(f"| {req} | {name} | {acs} | {tasks} | {ok} | {count} |")

    if problems:
        print(f"Traceability FAILED ({len(problems)} problem(s)):")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    ac_total = sum(len(r.acs) for f in features for r in f.requirements)
    print(f"Traceability OK: {len(all_reqs)} requirements, {ac_total} acceptance criteria, all mapped to design, tasks and code/tests.")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT / "scripts"))
    raise SystemExit(main())
