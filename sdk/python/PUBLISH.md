# Publishing the Python SDK to PyPI

Just like `npm publish` for Node.js — but for Python.

---

## Step 1 — Create a PyPI Account

Go to **https://pypi.org/account/register/** and sign up.

> ✅ Verify your email before continuing. PyPI requires it to publish.

---

## Step 2 — Check if the package name is free

Open this URL in your browser:

```
https://pypi.org/project/ai-control-plane/
```

- If it shows **"404 Not Found"** → name is free ✅
- If it's taken → edit `name = "..."` in `pyproject.toml` (e.g. `"ai-control-plane-sdk"`)

---

## Step 3 — Install build tools

Run this in your terminal **once**:

```bash
cd sdk/python
pip install build twine --break-system-packages
```

> `build` creates the package files, `twine` uploads them to PyPI.

---

## Step 4 — Build the package

```bash
cd sdk/python
python3 -m build
```

This creates a `dist/` folder with two files:

```
dist/
  ai_control_plane-1.0.0.tar.gz        ← source distribution
  ai_control_plane-1.0.0-py3-none-any.whl  ← wheel (what pip installs)
```

---

## Step 5 — Test on TestPyPI first (Recommended)

TestPyPI is a safe sandbox — publish here first to make sure everything looks right.

```bash
# Upload to TestPyPI
twine upload --repository testpypi dist/*
```

You'll be prompted for your PyPI username and password.

Then test installing from TestPyPI:

```bash
pip install --index-url https://test.pypi.org/simple/ ai-control-plane
```

Check it works:

```bash
python3 -c "from ai_control_plane import ControlPlaneSDK; print('✅ Import OK')"
```

---

## Step 6 — Publish to Real PyPI

Once TestPyPI looks good:

```bash
twine upload dist/*
```

Enter your username and password when prompted.

Your package is now live at:

```
https://pypi.org/project/ai-control-plane/
```

Anyone can now install it with:

```bash
pip install ai-control-plane
```

---

## Step 7 — Use an API Token (More Secure — Recommended)

Instead of username/password, use a PyPI API token:

1. Go to **https://pypi.org/manage/account/token/**
2. Click **"Add API token"**
3. Name it (e.g. `ai-control-plane-publish`)
4. Scope: the specific project
5. Copy the token (starts with `pypi-`)

Then upload with the token:

```bash
twine upload dist/* -u __token__ -p pypi-YOUR_TOKEN_HERE
```

Or save it so you never type it again:

```bash
# Create ~/.pypirc
cat > ~/.pypirc << EOF
[pypi]
username = __token__
password = pypi-YOUR_TOKEN_HERE
EOF

# Now just run:
twine upload dist/*
```

---

## Publishing Future Versions

When you update the SDK:

1. Bump the version in **two places**:
   - `sdk/python/pyproject.toml` → `version = "1.0.1"`
   - `sdk/python/ai_control_plane/__init__.py` → `__version__ = "1.0.1"`

2. Rebuild and upload:
   ```bash
   cd sdk/python
   rm -rf dist/          # clean old builds
   python3 -m build
   twine upload dist/*
   ```

---

## Quick Reference (All Steps)

```bash
# One-time setup
pip install build twine --break-system-packages

# Every release
cd sdk/python
rm -rf dist/
python3 -m build
twine upload dist/*

# Verify
pip install ai-control-plane
python3 -c "from ai_control_plane import ControlPlaneSDK; print('✅')"
```

---

## After Publishing — Update Your README

Add this badge to your main `README.md`:

```markdown
[![PyPI version](https://badge.fury.io/py/ai-control-plane.svg)](https://pypi.org/project/ai-control-plane/)
```

And add the PyPI link to `sdk/python/README.md`:

```markdown
**PyPI**: https://pypi.org/project/ai-control-plane/
```
