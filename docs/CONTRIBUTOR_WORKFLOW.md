# Complete Contributor Workflow - Step by Step

## Scenario: A contributor wants to add a new feature to your project

Let me show you EXACTLY how the code flow works with Docker Compose.

---

## Step-by-Step Process

### Step 1: Contributor Clones Your Repository

```bash
# On contributor's computer
git clone https://github.com/ayush/ai-control-plane.git
cd ai-control-plane
```

**What they have now:**

```
/home/contributor/ai-control-plane/
├── control-plane/
│   ├── app/
│   │   ├── main.py           ← Real Python files on their computer
│   │   └── functions/
│   └── Dockerfile
├── demo-service/
│   ├── server.js             ← Real JavaScript files on their computer
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

These are **REAL files on their computer**, not in Docker yet!

---

### Step 2: Start Docker Compose

```bash
docker-compose up
```

**What happens:**

1. **Docker reads docker-compose.yml**
2. **Creates 3 containers:**
   - PostgreSQL container
   - Control Plane container
   - Demo Service container

3. **Volume mounting happens** (the magic part):

```yaml
# docker-compose.yml
services:
  control-plane:
    volumes:
      - ./control-plane:/app # Links their local folder to container
```

**This creates a LINK:**

```
Contributor's Computer          Docker Container
─────────────────────          ────────────────
/home/contributor/              /app/
ai-control-plane/               (inside container)
control-plane/
├── app/                   ←──→ ├── app/
│   └── main.py                 │   └── main.py (SAME FILE!)
└── requirements.txt            └── requirements.txt
```

**They are the SAME files!** Not copied, but **linked**.

---

### Step 3: Contributor Edits Code

Contributor opens VS Code:

```bash
code .
```

They edit `control-plane/app/main.py`:

```python
# Before (original code)
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}

# After (contributor adds new endpoint)
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}

@app.get("/api/health")  # ← NEW CODE
async def health():
    return {"status": "healthy", "version": "1.0.0"}
```

**Where is this file?**

- ✅ On contributor's computer: `/home/contributor/ai-control-plane/control-plane/app/main.py`
- ✅ In Docker container: `/app/app/main.py` (same file, linked!)

---

### Step 4: Changes Reflect Automatically

Because of the `--reload` flag in the Dockerfile:

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--reload"]
#                                                      ^^^^^^^^
#                                                      Watches for file changes!
```

**What happens:**

1. Contributor saves `main.py` in VS Code
2. File changes on their computer
3. Docker container sees the change (because of volume mount)
4. Uvicorn detects the change (because of --reload)
5. FastAPI automatically restarts
6. New endpoint is available!

**All in 1-2 seconds!** ⚡

---

### Step 5: Test the Changes

Contributor tests in their browser or terminal:

```bash
# Test the new endpoint
curl http://localhost:8000/api/health

# Response:
{
  "status": "healthy",
  "version": "1.0.0"
}
```

✅ **It works!**

---

### Step 6: Commit and Push

Now the contributor wants to submit their changes:

```bash
# Check what changed
git status

# Output:
# modified:   control-plane/app/main.py

# Stage the changes
git add control-plane/app/main.py

# Commit
git commit -m "Add health check endpoint"

# Push to their fork
git push origin add-health-endpoint
```

**Important**: They're committing the **real files on their computer**, not anything inside Docker!

---

### Step 7: Create Pull Request

Contributor goes to GitHub and creates a Pull Request:

```
From: contributor/ai-control-plane (add-health-endpoint branch)
To:   ayush/ai-control-plane (main branch)

Title: Add health check endpoint
Description: Added /api/health endpoint for monitoring
```

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Contributor's Computer (Host Machine)                       │
│                                                              │
│  /home/contributor/ai-control-plane/                        │
│  ├── control-plane/                                         │
│  │   └── app/                                               │
│  │       └── main.py  ← Contributor edits this in VS Code   │
│  │                                                           │
│  └── docker-compose.yml                                     │
│                                                              │
│  [VS Code] ─── edits ───▶ main.py                          │
│                              │                               │
│                              │ (file saved)                  │
│                              ▼                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               │ Volume Mount (linked!)
                               │
┌──────────────────────────────┼───────────────────────────────┐
│ Docker Container             │                               │
│                              ▼                               │
│  /app/                                                       │
│  └── app/                                                    │
│      └── main.py  ← SAME FILE (linked via volume)          │
│                                                              │
│  [Uvicorn] ─── detects change ───▶ auto-restart            │
│                                                              │
│  [FastAPI] ─── new endpoint available ───▶ :8000/api/health│
└─────────────────────────────────────────────────────────────┘
                               │
                               │
                               ▼
                    ┌──────────────────┐
                    │  Browser/Curl    │
                    │  Tests endpoint  │
                    │  ✅ Works!       │
                    └──────────────────┘
```

---

## Complete Example: Adding a Feature

Let's trace through a complete example:

### Initial State

**Contributor's file system:**

```
/home/contributor/ai-control-plane/control-plane/app/main.py
```

**Docker container:**

```
/app/app/main.py (linked to contributor's file)
```

**They are the SAME file!**

---

### Contributor Makes Changes

**Step 1: Edit in VS Code**

```python
# File: control-plane/app/main.py
# Contributor adds this:

@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_signals = db.query(models.Signal).count()
    return {"total_signals": total_signals}
```

**Step 2: Save file (Ctrl+S)**

**Step 3: Watch Docker logs**

```bash
docker-compose logs -f control-plane

# Output:
# control-plane | INFO:     Detected file change, reloading...
# control-plane | INFO:     Application startup complete.
```

**Step 4: Test immediately**

```bash
curl http://localhost:8000/api/stats

# Response:
{"total_signals": 42}
```

✅ **Works immediately!**

---

### Contributor Commits Changes

```bash
# The file that changed is on their computer
git diff control-plane/app/main.py

# Shows the changes they made

# Commit
git add control-plane/app/main.py
git commit -m "Add stats endpoint"

# Push to their fork
git push origin feature/stats-endpoint
```

---

## Key Points

### 1. **Files are on Contributor's Computer**

```
✅ Real files: /home/contributor/ai-control-plane/
✅ Editable in VS Code
✅ Tracked by Git
✅ Can be committed and pushed
```

### 2. **Docker Just Provides Runtime**

```
✅ PostgreSQL (database)
✅ Python environment
✅ Node.js environment
✅ All dependencies installed
```

### 3. **Volume Mount Links Them**

```
Local File ←──────────────▶ Container File
(editable)    (same file)    (runs in container)
```

### 4. **Hot Reload Makes It Fast**

```
Edit → Save → Auto-restart → Test
(1 second total!)
```

---

## What Gets Committed to Git?

**Only the source code files:**

```bash
git status

# Shows:
modified:   control-plane/app/main.py
modified:   demo-service/server.js
```

**NOT committed:**

- Docker containers (they're temporary)
- node_modules (in .gitignore)
- **pycache** (in .gitignore)
- Database data (in Docker volume)

---

## Comparison: Docker vs No Docker

### Without Docker

```bash
# Contributor needs to:
1. Install PostgreSQL
2. Install Python 3.11
3. Create virtual environment
4. Install dependencies
5. Set up database
6. Run migrations
7. Start server manually

# Edit code
8. Edit main.py
9. Restart server manually
10. Test

# Commit
11. git add, commit, push
```

### With Docker

```bash
# Contributor needs to:
1. docker-compose up

# Edit code
2. Edit main.py (auto-restarts!)
3. Test

# Commit
4. git add, commit, push
```

**Much simpler!** 🎉

---

## Common Questions

### Q: Where is the code stored?

**A:** On the contributor's computer, in the cloned repository folder.

### Q: Can they edit the code?

**A:** Yes! They edit it normally in VS Code on their computer.

### Q: How does Docker see the changes?

**A:** Volume mounting links their local folder to the container.

### Q: Do they commit Docker containers?

**A:** No! They only commit the source code files.

### Q: What if they stop Docker?

**A:** The code is still on their computer. They can restart Docker anytime.

### Q: Can they use Git normally?

**A:** Yes! Git works exactly the same. Docker doesn't affect Git.

---

## Summary

**The workflow is:**

1. **Clone** → Code is on their computer
2. **docker-compose up** → Starts services (PostgreSQL, etc.)
3. **Edit code** → In VS Code on their computer
4. **See changes** → Auto-reload in container (volume mount)
5. **Test** → Visit localhost:8000
6. **Commit** → Git add/commit the files on their computer
7. **Push** → Push to GitHub
8. **PR** → Create pull request

**Docker is just providing the runtime environment (database, Python, Node.js). The code is always on their computer and can be edited, committed, and pushed normally!**

Does this make sense now? The key is **volume mounting** - it links the files on their computer to the files in the container, so editing one edits both!
