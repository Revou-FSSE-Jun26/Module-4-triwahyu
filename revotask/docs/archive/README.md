# Archive

## `scaffold-baseline-2026-11-24.zip`

The AI-generated starter scaffold exactly as it was before any refinement (147 files, taken 2026-11-24). It is the "before" in [`guidelines/before-after-comparison.md`](../../guidelines/before-after-comparison.md).

Reproduce the baseline measurement:

```bash
# from the repository root
python -c "import zipfile; zipfile.ZipFile('docs/archive/scaffold-baseline-2026-11-24.zip').extractall('/tmp/scaffold-baseline')"
python scripts/check_guidelines.py --root /tmp/scaffold-baseline
# 28 checks: 11 pass, 11 fail, 6 n/a (47 finding(s))
```

Use a temporary folder as shown; the archive contains a full project tree and is not meant to be extracted inside the repository.

Superseded specs or notes may also be placed here with a date and reason. Prefer Git tags for complete historical snapshots.
