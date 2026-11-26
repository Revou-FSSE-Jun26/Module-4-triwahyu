"""Run the full API sequence against any deployment and print a pass/fail table.

  python scripts/api_smoke.py http://127.0.0.1:5000/api
  python scripts/api_smoke.py https://<api-project>.vercel.app/api

Registers a fresh user each run, so it is safe to repeat. Exit code 1 if any step fails. Uses only the standard library.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from api_steps import BLUEPRINT_FOLDERS, STEPS  # noqa: E402


def fill(value, variables: dict):
    if isinstance(value, str):
        for key, replacement in variables.items():
            value = value.replace("{" + key + "}", str(replacement))
        return value
    if isinstance(value, dict):
        return {k: fill(v, variables) for k, v in value.items()}
    if isinstance(value, list):
        return [fill(v, variables) for v in value]
    return value


def dig(data, dotted: str):
    for part in dotted.split("."):
        data = data[int(part)] if part.isdigit() else data[part]
    return data


def call(base: str, step: dict, variables: dict) -> tuple[int, dict | None]:
    body = fill(step.get("body"), variables) if "body" in step else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if step.get("auth", True) and "token" in variables:
        headers["Authorization"] = f"Bearer {variables['token']}"
    request = urllib.request.Request(
        base.rstrip("/") + fill(step["path"], variables), data=json.dumps(body).encode() if body is not None else None,
        headers=headers, method=step["method"],
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read() or b"null")
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, json.loads(raw) if raw[:1] in (b"{", b"[") else None


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    base = sys.argv[1]
    variables = {"email": f"smoke-{int(time.time())}@example.com"}
    failures, reached = 0, set()
    print(f"API smoke test against {base}\n")
    for step in STEPS:
        started = time.perf_counter()
        try:
            status, payload = call(base, step, variables)
        except Exception as error:  # noqa: BLE001 - report network failures as a failed step
            status, payload = 0, {"error": str(error)}
        ok = status == step["status"]
        envelope_ok = isinstance(payload, dict) and ("data" in payload or "error" in payload)
        ok = ok and envelope_ok
        if ok:
            reached.add(step["folder"])
            for name, path in step.get("save", {}).items():
                variables[name] = dig(payload, path)
        failures += not ok
        elapsed = (time.perf_counter() - started) * 1000
        print(f"{'PASS' if ok else 'FAIL'}  {step['method']:6} {step['path']:48} -> {status} (want {step['status']})  {elapsed:5.0f} ms  [{step['folder']}]")
        if not ok:
            print(f"      body: {json.dumps(payload)[:200]}")
    missing = [f for f in BLUEPRINT_FOLDERS if f not in reached]
    print(f"\n{len(STEPS) - failures}/{len(STEPS)} steps passed. Blueprints reached: {len(BLUEPRINT_FOLDERS) - len(missing)}/{len(BLUEPRINT_FOLDERS)}"
          + (f" (missing: {', '.join(missing)})" if missing else ""))
    return 1 if failures or missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
