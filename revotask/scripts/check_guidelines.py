"""REQ-NFR-5 guideline checker. Mechanically enforces the rules in guidelines/ that a script can see.

Each check is tied to a rule ID. Result per check: PASS, FAIL, or N/A (the code it inspects does not exist).
Usage: python scripts/check_guidelines.py [--root PATH] [--json]
Exit code 1 when any check fails. `--root` runs the same checks against the saved scaffold baseline.
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

DEFAULT_ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS = ["auth", "boards", "columns", "cards", "comments", "notifications", "analytics", "users", "health"]
EXCLUDED_DIRS = {"node_modules", ".venv", ".next", "__pycache__", "migrations"}
REQUEST_SCHEMA = re.compile(r"(Create|Update|Write|Add|Position|Query|Register|Login|Reorder)\w*Schema$")
IDENTITY_FIELDS = ("user_id", "author_id", "owner_id", "created_by")

Predicate = Callable[[Path, str], list[str]]


@dataclass
class Result:
    rule: str
    description: str
    status: str = "PASS"  # PASS | FAIL | N/A
    findings: list[str] = field(default_factory=list)


class Checker:
    def __init__(self, root: Path):
        self.root = root
        self.results: list[Result] = []

    def files(self, pattern: str) -> list[Path]:
        return sorted(p for p in self.root.glob(pattern) if p.is_file() and not EXCLUDED_DIRS & set(p.parts))

    def text(self, path: Path) -> str:
        return path.read_text(encoding="utf-8", errors="ignore")

    def rel(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    def add(self, rule: str, description: str, findings: list[str], applicable: bool = True) -> None:
        status = "N/A" if not applicable else ("FAIL" if findings else "PASS")
        self.results.append(Result(rule, description, status, findings))

    def check_files(self, rule: str, description: str, files: list[Path], predicate: Predicate) -> None:
        findings = [f"{self.rel(p)}: {msg}" for p in files for msg in predicate(p, self.text(p))]
        self.add(rule, description, findings, applicable=bool(files))

    # --- backend -------------------------------------------------------------------------
    def backend(self) -> None:
        app = "backend/app"
        blueprints = self.root / app / "blueprints"
        folders = [blueprints / name for name in BLUEPRINTS if (blueprints / name).is_dir()]

        findings = []
        for folder in folders:
            content = {"routes.py": r"^@\w+\.(get|post|patch|put|delete)\(", "service.py": r"^def \w+", "schema.py": r"^class \w+"}
            for name, pattern in content.items():
                path = folder / name
                if not path.exists():
                    findings.append(f"{self.rel(folder)}: missing {name}")
                elif folder.name != "health" or name != "schema.py":
                    if not re.search(pattern, self.text(path), re.M):
                        findings.append(f"{self.rel(path)}: placeholder, defines nothing")
        self.add("BE-01", "every blueprint has routes.py, service.py and schema.py with real content", findings, bool(folders))

        db_use = re.compile(r"\bdb\.session\b|\.query\b|from \.+extensions import|from sqlalchemy")
        self.check_files(
            "BE-03", "routes.py and schema.py never touch the database",
            self.files(f"{app}/blueprints/*/routes.py") + self.files(f"{app}/blueprints/*/schema.py"),
            lambda p, t: ["touches the database layer"] if db_use.search(t) else [],
        )

        self.check_files(
            "BE-05", "jsonify is used only in common/ (one envelope, no ad-hoc responses)",
            [p for p in self.files(f"{app}/**/*.py") if "common" not in p.parts],
            lambda p, t: ["calls jsonify outside common/"] if re.search(r"\bjsonify\(", t) else [],
        )

        secret = re.compile(r"""(SECRET_KEY|JWT_SECRET_KEY)\s*[=:]\s*["'][^"']{3,}["']""")
        db_literal = re.compile(r"""SQLALCHEMY_DATABASE_URI\s*[=:]\s*["'][^"']+["']""")
        self.check_files(
            "BE-10", "no literal secrets or database URLs in application code",
            self.files(f"{app}/**/*.py"),
            lambda p, t: (["hardcoded secret literal"] if secret.search(t) else [])
            + (["hardcoded database URI literal"] if db_literal.search(t) else []),
        )

        self.check_files(
            "BE-10b", "only config.py reads os.environ",
            [p for p in self.files(f"{app}/**/*.py") if p.name != "config.py"],
            lambda p, t: ["reads os.environ outside config.py"] if re.search(r"os\.(environ|getenv)", t) else [],
        )

        def identity_in_request_schemas(_p: Path, t: str) -> list[str]:
            out = []
            for chunk in re.split(r"^class ", t, flags=re.M)[1:]:
                name = chunk.split("(")[0]
                if REQUEST_SCHEMA.search(name):
                    out += [f"{name} accepts `{f}` from the client" for f in IDENTITY_FIELDS if re.search(rf"^\s*{f}\s*=", chunk, re.M)]
            return out

        self.check_files("BE-07", "request schemas never accept caller identity", self.files(f"{app}/blueprints/*/schema.py"), identity_in_request_schemas)

        self.check_files(
            "BE-04", "no schema opts out of unknown-field rejection",
            self.files(f"{app}/blueprints/*/schema.py"),
            lambda p, t: ["sets unknown = EXCLUDE/INCLUDE"] if re.search(r"unknown\s*=\s*(EXCLUDE|INCLUDE)", t) else [],
        )

        models = [p for p in self.files(f"{app}/models/*.py") if "db.Model" in self.text(p)]
        uuid_pk = r"id\s*=\s*db\.Column\(db\.Uuid,\s*primary_key=True"
        self.check_files(
            "DB-01", "every model has a UUID primary key", models,
            lambda p, t: [] if re.search(uuid_pk, t) else ["no `id = db.Column(db.Uuid, primary_key=True, ...)`"],
        )

        def timestamps(_p: Path, t: str) -> list[str]:
            out = []
            for chunk in re.split(r"^class ", t, flags=re.M)[1:]:
                for col in ("created_at", "updated_at"):
                    if not re.search(rf"^\s*{col}\s*=\s*db\.Column\(db\.DateTime\(timezone=True\)", chunk, re.M):
                        out.append(f"{chunk.split('(')[0]} lacks timezone-aware {col}")
            return out

        self.check_files("DB-02", "every model declares timezone-aware created_at and updated_at", models, timestamps)

        self.check_files(
            "DB-03", "content models carry deleted_at",
            [p for p in models if p.stem in {"board", "column", "card", "comment"}],
            lambda p, t: [] if "deleted_at" in t else ["no deleted_at"],
        )

        card = self.root / app / "models" / "card.py"
        needed = {"order (db.Float)": r"order\s*=\s*db\.Column\(db\.Float", "UUID id": uuid_pk, "created_at": r"created_at\s*=\s*db\.Column",
                  "updated_at": r"updated_at\s*=\s*db\.Column", "deleted_at": r"deleted_at\s*=\s*db\.Column"}
        findings = [f"card.py: missing {label}" for label, pattern in needed.items() if card.exists() and not re.search(pattern, self.text(card))]
        self.add("DB-04", "Card has a UUID id, created_at, updated_at, deleted_at and a Float order", findings, card.exists())

        def calls_create_all(_p: Path, t: str) -> list[str]:
            try:
                tree = ast.parse(t)
            except SyntaxError:
                return []
            calls = (n for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute))
            return ["calls create_all()"] if any(c.func.attr == "create_all" for c in calls) else []

        self.check_files("DB-08", "db.create_all() is not called in application code", self.files(f"{app}/**/*.py"), calls_create_all)

    # --- frontend ------------------------------------------------------------------------
    def frontend(self) -> None:
        src = self.root / "frontend" / "src"
        sources = [p for p in self.files("frontend/src/**/*.ts*") if ".test." not in p.name]

        self.check_files(
            "FE-02", "only lib/apiClient.ts calls fetch",
            [p for p in sources if p.name != "apiClient.ts"],
            lambda p, t: ["calls fetch directly"] if re.search(r"(?<![\w.])fetch\(", t) else [],
        )
        self.check_files(
            "FE-03", "no raw <button> outside components/shared",
            [p for p in sources if "shared" not in p.parts],
            lambda p, t: ["raw <button> element"] if re.search(r"<button[\s>]", t) else [],
        )
        self.check_files("FE-01", "no `any` types", sources, lambda p, t: ["uses `any`"] if re.search(r":\s*any\b|\bas any\b|<any>", t) else [])
        self.check_files("FE-11", "no dangerouslySetInnerHTML", sources, lambda p, t: ["uses dangerouslySetInnerHTML"] if "dangerouslySetInnerHTML" in t else [])

        button = src / "components/shared/BaseButton.tsx"
        defaults = re.search(r"type\s*\?\?\s*[\"']button[\"']|type\s*=\s*[\"']button[\"']", self.text(button)) if button.exists() else None
        self.add("FE-03b", 'BaseButton defaults to type="button"', [] if defaults else ['BaseButton.tsx: no default type="button"'], button.exists())

        # Tailwind resolves conflicting utilities by stylesheet order, so these silently lose against BaseButton's own.
        owned = re.compile(r"^(justify-|items-|p[xytrbl]?-|rounded|text-(xs|sm|base|lg|xl|left|center|right)$|font-|border|bg-|shadow-|min-h-|h-\d)")
        tag = re.compile(r"<BaseButton\b(?:[^>]|=>)*?\bclassName=\"([^\"]*)\"")

        def overrides_owned_classes(_p: Path, t: str) -> list[str]:
            bad = {name for m in tag.finditer(t) for name in m.group(1).split() if owned.match(name)}
            return [f"className overrides BaseButton-owned utility `{name}`; use the variant, size or align prop" for name in sorted(bad)]

        self.check_files("FE-03d", "BaseButton callers do not override its variant, size or alignment utilities",
                         [p for p in sources if "shared" not in p.parts and "<BaseButton" in self.text(p)], overrides_owned_classes)

        shared = ["BaseButton", "BaseBadge", "BaseModal"]
        missing = [f"components/shared/{n}.tsx missing" for n in shared if not (src / f"components/shared/{n}.tsx").exists()]
        self.add("FE-03c", "shared BaseButton, BaseBadge and BaseModal exist", missing)

        provider = src / "context/AuthContext.tsx"
        problems = []
        if provider.exists():
            if "AuthContext.Provider" not in self.text(provider):
                problems.append("AuthContext.tsx: AuthProvider never renders AuthContext.Provider, so useAuth always throws")
            if not (src / "middleware.ts").exists():
                problems.append("src/middleware.ts missing: no route protection")
        self.add("FE-05", "AuthProvider renders its context and middleware protects routes", problems, provider.exists())

        handler = src / "hooks/useErrorHandler.ts"
        uses_status = handler.exists() and re.search(r"statusCode|messageForStatus", self.text(handler))
        self.add("FE-07", "useErrorHandler maps ApiError status codes", [] if uses_status else ["useErrorHandler.ts: ignores statusCode and shows raw error.message"], handler.exists())

        modal = src / "components/shared/BaseModal.tsx"
        problems = []
        if modal.exists():
            body = self.text(modal)
            if 'id="modal-title"' in body:
                problems.append('BaseModal.tsx: hardcoded id="modal-title" (duplicate ids when dialogs stack)')
            if "Escape" not in body:
                problems.append("BaseModal.tsx: does not close on Escape")
        self.add("FE-09", "BaseModal has a unique title id and closes on Escape", problems, modal.exists())

        pages = [src / "app" / p for p in ("page.tsx", "login/page.tsx", "register/page.tsx", "my-tasks/page.tsx", "profile/page.tsx", "boards/[id]/page.tsx")]
        placeholder = re.compile(r"Implementation pending|Starter scaffold")
        problems = [f"{self.rel(p)}: still a placeholder" for p in pages if p.exists() and placeholder.search(self.text(p))]
        self.add("FE-04", "pages are implemented, not placeholders", problems, any(p.exists() for p in pages))

    # --- tests ---------------------------------------------------------------------------
    def tests(self) -> None:
        specs = self.files("frontend/e2e/**/*.spec.ts")
        self.check_files("FE-14a", "no waitForTimeout in Playwright specs", specs, lambda p, t: ["uses waitForTimeout"] if "waitForTimeout" in t else [])

        def assertionless(_p: Path, t: str) -> list[str]:
            out = []
            for match in re.finditer(r"\btest\(\s*[\"'`](.+?)[\"'`]\s*,\s*async\b.*?=>\s*\{", t, re.S):
                depth, i = 1, match.end()
                while i < len(t) and depth:
                    depth += {"{": 1, "}": -1}.get(t[i], 0)
                    i += 1
                if "expect(" not in t[match.end() : i]:
                    out.append(f'test "{match.group(1)}" has no assertion')
            return out

        self.check_files("FE-14b", "every Playwright test asserts something", specs, assertionless)

        def no_assert(_p: Path, t: str) -> list[str]:
            bodies = re.findall(r"^def (test_\w+)\([^)]*\):\n((?:[ \t]+.*\n|\n)+)", t, re.M)
            return [f"{name} has no assertion" for name, body in bodies if not re.search(r"\bassert\b|pytest\.raises|\bcheck\(|\bupgrade\(", body)]

        self.check_files("BE-12", "every pytest test asserts something", self.files("backend/tests/test_*.py"), no_assert)

    # --- docs ----------------------------------------------------------------------------
    def docs(self) -> None:
        contract = self.root / "docs/contracts/error-contract.md"
        bad = contract.exists() and re.search(r'"error"\s*:\s*\{', self.text(contract))
        self.add("BE-05b", "error contract defines `error` as a string",
                 ["error-contract.md: `error` is an object, contradicting guideline BE-05 and the assignment"] if bad else [], contract.exists())

        files = [self.root / "guidelines" / n for n in ("backend.md", "database.md", "frontend.md")]
        findings = []
        for path in (p for p in files if p.exists()):
            for chunk in re.split(r"^## ", self.text(path), flags=re.M)[1:]:
                title = chunk.splitlines()[0]
                findings += [f"{self.rel(path)}: '{title}' lacks {label}" for label in ("**Rule:**", "**Rationale:**", "**Example:**") if label not in chunk]
        self.add("GL-1", "every guideline has a Rule, Rationale and Example", findings, all(p.exists() for p in files))

    def run(self) -> list[Result]:
        self.backend()
        self.frontend()
        self.tests()
        self.docs()
        return self.results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    results = Checker(args.root.resolve()).run()
    failed = [r for r in results if r.status == "FAIL"]
    if args.json:
        print(json.dumps([asdict(r) for r in results], indent=2))
    else:
        for r in results:
            print(f"[{r.status:4}] {r.rule:7} {r.description}")
            for finding in r.findings[:6]:
                print(f"         - {finding}")
            if len(r.findings) > 6:
                print(f"         ... and {len(r.findings) - 6} more")
        counts = {s: sum(1 for r in results if r.status == s) for s in ("PASS", "FAIL", "N/A")}
        print(f"\n{len(results)} checks: {counts['PASS']} pass, {counts['FAIL']} fail, {counts['N/A']} n/a ({sum(len(r.findings) for r in failed)} finding(s))")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
