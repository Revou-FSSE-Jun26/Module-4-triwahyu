"""Shared parsing for the per-feature specs in .kiro/specs (used by build_specs and check_traceability)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = ROOT / ".kiro" / "specs"

REQ_HEADING = re.compile(r"^###\s+(REQ-[A-Z0-9]+-\d+)\b(.*)$", re.MULTILINE)
AC_LINE = re.compile(r"^-\s+\*\*(AC-([A-Z0-9]+-\d+)\.\d+)\*\*", re.MULTILINE)
TASK_LINE = re.compile(r"^-\s+\[(?P<done>[ xX])\]\s+\*\*(?P<id>T-[A-Z0-9]+-\d+)\*\*(?P<body>.*)$", re.MULTILINE)
REQ_ID = re.compile(r"REQ-[A-Z0-9]+-\d+")
ROUTE = re.compile(r"`((?:GET|POST|PATCH|PUT|DELETE)(?:/(?:GET|POST|PATCH|PUT|DELETE))* )(/api/[^`\s?]*)")
PAGE_FILE = re.compile(r"`(app/(?:[^`\s]*/)?page\.tsx)")

# Source locations that may reference a requirement to prove it is implemented or tested.
CODE_GLOBS = [
    "backend/app/**/*.py",
    "backend/tests/**/*.py",
    "frontend/src/**/*.ts",
    "frontend/src/**/*.tsx",
    "frontend/e2e/**/*.ts",
    "scripts/*.py",
    ".github/workflows/*.yml",
]


@dataclass
class Requirement:
    id: str
    title: str
    acs: list[str] = field(default_factory=list)


@dataclass
class Feature:
    folder: Path
    requirements: list[Requirement]
    tasks: dict[str, list[str]]  # REQ id -> task ids
    task_text: str
    design_text: str

    @property
    def name(self) -> str:
        return self.folder.name


def feature_dirs() -> list[Path]:
    return sorted(p for p in SPECS.glob("[0-9][0-9]-*") if p.is_dir())


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def parse_requirements(text: str) -> list[Requirement]:
    headings = list(REQ_HEADING.finditer(text))
    requirements: list[Requirement] = []
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        block = text[match.end() : end]
        acs = [m.group(1) for m in AC_LINE.finditer(block) if m.group(2) == match.group(1)[len("REQ-") :]]
        requirements.append(Requirement(match.group(1), match.group(2).strip(" ·:-"), acs))
    return requirements


def parse_tasks(text: str) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for match in TASK_LINE.finditer(text):
        for req in sorted(set(REQ_ID.findall(match.group("body")))):
            mapping.setdefault(req, []).append(match.group("id"))
    return mapping


def load_features() -> list[Feature]:
    features = []
    for folder in feature_dirs():
        tasks_text = read(folder / "tasks.md")
        features.append(
            Feature(
                folder=folder,
                requirements=parse_requirements(read(folder / "requirements.md")),
                tasks=parse_tasks(tasks_text),
                task_text=tasks_text,
                design_text=read(folder / "design.md"),
            )
        )
    return features


def source_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in CODE_GLOBS:
        files.update(p for p in ROOT.glob(pattern) if p.is_file() and "node_modules" not in p.parts)
    return sorted(files)


def find_references(req_ids: set[str]) -> dict[str, list[str]]:
    """Map each requirement id to the repo-relative source files that mention it."""
    found: dict[str, set[str]] = {req: set() for req in req_ids}
    for path in source_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for req in set(REQ_ID.findall(text)) & req_ids:
            found[req].add(path.relative_to(ROOT).as_posix())
    return {req: sorted(paths) for req, paths in found.items()}


def design_routes(design_text: str) -> list[tuple[str, str]]:
    """(METHOD, path) pairs named in a design table, expanding `GET/POST /api/x` shorthand."""
    routes = []
    for match in ROUTE.finditer(design_text):
        for method in match.group(1).strip().split("/"):
            routes.append((method, match.group(2)))
    return sorted(set(routes))
