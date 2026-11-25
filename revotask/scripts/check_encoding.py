"""Fail if any tracked text file is not valid UTF-8 (catches editors or shells that write cp1252)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", ".venv", ".next", "__pycache__", ".git", "e2e-report", "test-results", "playwright-report", "screenshots", ".ruff_cache", ".pytest_cache"}
SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".zip", ".woff", ".woff2", ".db", ".pyc", ".ico", ".pdf"}


def main() -> int:
    bad = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or SKIP_DIRS & set(path.parts) or path.suffix in SKIP_SUFFIXES:
            continue
        try:
            path.read_bytes().decode("utf-8")
        except UnicodeDecodeError as error:
            bad.append(f"{path.relative_to(ROOT).as_posix()}: byte {error.start} is not valid UTF-8")
    for line in bad:
        print(line)
    print(f"{len(bad)} file(s) with invalid UTF-8" if bad else "All text files are valid UTF-8.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
