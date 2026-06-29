# Career Track (Domain Prep) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a role-first "Career Prep" entry point where a user picks a domain, an AI generates a structured roadmap, and each step deep-links into the existing Code/Interview/Coach/Chat tools pre-loaded for that domain.

**Architecture:** A domain becomes a synthetic `job` object (`role_profile`) shaped exactly like what the existing tools already consume. One new backend endpoint generates a validated roadmap JSON; the frontend stores it + progress in `localStorage` and hands off into existing pages via the existing `InterviewContext` (`setCurrentJob` / `setResumeText`), exactly as the Jobs feed already does.

**Tech Stack:** FastAPI + Groq (`llama-3.3-70b` via `services/claude.py`), pytest; React 18 + react-router + Vite + Tailwind.

## Global Constraints

- Roadmap generation uses Groq via `services.claude.get_client()` / `MODEL` — same pattern as `services/agents.py`. Never call any other provider.
- Step `tool` values are restricted to exactly: `code`, `interview`, `coach`, `chat`. Nothing else is launchable.
- Persistence is browser `localStorage` only — key `placements_career`. No backend DB, no auth (consistent with `useTracker.js` / key `placements_tracker`).
- The resume stays client-side only; it is NOT sent to `/career/roadmap`. It is applied at step-launch via `setResumeText`.
- Hand-off reuses the existing `InterviewContext` pattern: `setCurrentJob(job); navigate(path)`. Do not invent a new global store.
- Backend changes are TDD with pytest (mirror `tests/test_agents.py`). Frontend has no test tooling in this repo; frontend tasks end with a manual run-the-app verification, matching the existing convention.
- JSON parsing/cleanup mirrors `services/agents.py::_parse_json` (strip ```` ``` ```` fences).

---

### Task 1: Roadmap generation service

**Files:**
- Create: `placementos/services/career.py`
- Test: `placementos/tests/test_career.py`

**Interfaces:**
- Consumes: `services.claude.get_client`, `services.claude.MODEL` (existing).
- Produces:
  - `ALLOWED_TOOLS: set[str]` = `{"code", "interview", "coach", "chat"}`
  - `async generate_roadmap(domain: str, level: str) -> dict` — returns a validated roadmap dict with keys `domain`, `level`, `role_profile` (`{title, company, description}`), and `modules` (list of `{id, title, steps:[{id, title, description, tool, config}]}`). Raises `ValueError` if a valid roadmap cannot be produced after one retry.

- [ ] **Step 1: Write the failing tests**

Create `placementos/tests/test_career.py`:

```python
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


def _mock_groq(*contents):
    """AsyncGroq mock whose create() returns the given contents in sequence."""
    def _resp(text):
        choice = MagicMock()
        choice.message.content = text
        resp = MagicMock()
        resp.choices = [choice]
        return resp
    client = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=[_resp(c) for c in contents])
    return client


VALID = json.dumps({
    "role_profile": {"title": "Data Analyst", "company": "", "description": "A " + ("x" * 130)},
    "modules": [
        {"id": "m1", "title": "Foundations", "steps": [
            {"id": "m1s1", "title": "Practice SQL", "description": "do it", "tool": "code", "config": {"focus": "joins"}},
            {"id": "m1s2", "title": "Mock round", "description": "do it", "tool": "interview", "config": {}},
        ]},
        {"id": "m2", "title": "Polish", "steps": [
            {"id": "m2s1", "title": "Coach", "description": "do it", "tool": "coach", "config": {}},
        ]},
    ],
})


@pytest.mark.asyncio
async def test_generate_roadmap_valid():
    with patch("services.career.get_client", return_value=_mock_groq(VALID)):
        from services.career import generate_roadmap
        result = await generate_roadmap("Data Analyst", "Fresher")
    assert result["domain"] == "Data Analyst"
    assert result["level"] == "Fresher"
    assert result["role_profile"]["description"]
    assert result["modules"][0]["steps"][0]["tool"] == "code"


@pytest.mark.asyncio
async def test_generate_roadmap_retries_then_succeeds():
    bad = json.dumps({"modules": []})  # invalid: empty modules
    with patch("services.career.get_client", return_value=_mock_groq(bad, VALID)):
        from services.career import generate_roadmap
        result = await generate_roadmap("Data Analyst", "Fresher")
    assert len(result["modules"]) == 2


@pytest.mark.asyncio
async def test_generate_roadmap_rejects_invalid_tool():
    bad_tool = json.dumps({
        "role_profile": {"title": "X", "company": "", "description": "y" * 130},
        "modules": [{"id": "m1", "title": "M", "steps": [
            {"id": "s1", "title": "T", "description": "d", "tool": "video", "config": {}}]}],
    })
    with patch("services.career.get_client", return_value=_mock_groq(bad_tool, bad_tool)):
        from services.career import generate_roadmap
        with pytest.raises(ValueError):
            await generate_roadmap("Data Analyst", "Fresher")


@pytest.mark.asyncio
async def test_generate_roadmap_malformed_json_raises():
    with patch("services.career.get_client", return_value=_mock_groq("not json", "still not json")):
        from services.career import generate_roadmap
        with pytest.raises(ValueError):
            await generate_roadmap("Data Analyst", "Fresher")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd placementos && python -m pytest tests/test_career.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'services.career'`

- [ ] **Step 3: Write the implementation**

Create `placementos/services/career.py`:

```python
import json
import re
from services.claude import get_client, MODEL

ALLOWED_TOOLS = {"code", "interview", "coach", "chat"}

ROADMAP_PROMPT = """\
You are a career-prep mentor. Build a structured interview-prep roadmap for someone targeting this role.

Target domain: {domain}
Experience level: {level}

Each step must map to ONE practice tool the app provides:
- "code": coding / SQL practice problems
- "interview": a mock interview round
- "coach": resume + skill-gap coaching against the role
- "chat": a guided Q&A / concept-learning conversation

Return ONLY valid JSON — no markdown, no explanation:
{{
  "role_profile": {{
    "title": "{domain}",
    "company": "",
    "description": "a realistic 120-200 word job description for a {level} {domain}, covering core responsibilities, required skills, and tools"
  }},
  "modules": [
    {{
      "id": "m1",
      "title": "short module name",
      "steps": [
        {{
          "id": "m1s1",
          "title": "short actionable step title",
          "description": "one sentence on what to do and why",
          "tool": "code",
          "config": {{ "focus": "topic for code steps", "prompt": "seed question for chat steps" }}
        }}
      ]
    }}
  ]
}}

Rules:
- 3 to 5 modules, each with 2 to 4 steps.
- Order modules from fundamentals to advanced to behavioral/final prep.
- Every step.tool MUST be exactly one of: code, interview, coach, chat.
- Include at least one "interview" step and at least one "coach" step.
- For "code" steps set config.focus; for "chat" steps set config.prompt; other tools may use an empty config object.
"""


def _parse_json(raw: str):
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw.strip())


def _validate(roadmap) -> bool:
    if not isinstance(roadmap, dict):
        return False
    profile = roadmap.get("role_profile")
    if not isinstance(profile, dict) or not profile.get("description"):
        return False
    modules = roadmap.get("modules")
    if not isinstance(modules, list) or not modules:
        return False
    for m in modules:
        if not isinstance(m, dict) or not m.get("id") or not m.get("title"):
            return False
        steps = m.get("steps")
        if not isinstance(steps, list) or not steps:
            return False
        for s in steps:
            if not isinstance(s, dict) or not s.get("id") or not s.get("title"):
                return False
            if s.get("tool") not in ALLOWED_TOOLS:
                return False
    return True


async def _call(prompt: str, max_tokens: int = 2048) -> str:
    client = get_client()
    r = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return r.choices[0].message.content


async def generate_roadmap(domain: str, level: str) -> dict:
    prompt = ROADMAP_PROMPT.format(domain=domain[:120], level=level[:40])
    for _ in range(2):
        raw = await _call(prompt)
        try:
            roadmap = _parse_json(raw)
        except Exception:
            continue
        if _validate(roadmap):
            roadmap["domain"] = domain
            roadmap["level"] = level
            return roadmap
    raise ValueError("Could not generate a valid roadmap")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd placementos && python -m pytest tests/test_career.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add placementos/services/career.py placementos/tests/test_career.py
git commit -m "feat: add career roadmap generation service"
```

---

### Task 2: Roadmap API endpoint

**Files:**
- Create: `placementos/routers/career.py`
- Modify: `placementos/main.py:12` (import) and `:32-39` (register router)
- Test: append to `placementos/tests/test_career.py`

**Interfaces:**
- Consumes: `services.career.generate_roadmap` (Task 1).
- Produces: `POST /career/roadmap` accepting body `{"domain": str, "level": str}` → roadmap JSON (200), `400` if domain blank, `502` if generation fails.

- [ ] **Step 1: Write the failing tests**

Append to `placementos/tests/test_career.py`:

```python
from fastapi.testclient import TestClient


def test_roadmap_endpoint_success():
    with patch("routers.career.generate_roadmap", new=AsyncMock(return_value={"ok": True})):
        from main import app
        client = TestClient(app)
        r = client.post("/career/roadmap", json={"domain": "Data Analyst", "level": "Fresher"})
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_roadmap_endpoint_blank_domain():
    from main import app
    client = TestClient(app)
    r = client.post("/career/roadmap", json={"domain": "   ", "level": "Fresher"})
    assert r.status_code == 400


def test_roadmap_endpoint_generation_failure():
    with patch("routers.career.generate_roadmap", new=AsyncMock(side_effect=ValueError("boom"))):
        from main import app
        client = TestClient(app)
        r = client.post("/career/roadmap", json={"domain": "Data Analyst"})
    assert r.status_code == 502
```

(The `conftest.py` autouse fixture already patches `main.refresh_feed`, so importing `app` makes no network calls.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd placementos && python -m pytest tests/test_career.py -k endpoint -v`
Expected: FAIL — `/career/roadmap` returns 404 (router not registered)

- [ ] **Step 3: Write the router**

Create `placementos/routers/career.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.career import generate_roadmap

router = APIRouter()


class RoadmapRequest(BaseModel):
    domain: str
    level: str = "Fresher"


@router.post("/career/roadmap")
async def roadmap(body: RoadmapRequest):
    domain = body.domain.strip()
    if not domain:
        raise HTTPException(status_code=400, detail="domain is required")
    try:
        return await generate_roadmap(domain, body.level)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not build roadmap")
```

- [ ] **Step 4: Register the router in `main.py`**

In `placementos/main.py`, line 12, add `career` to the import:

```python
from routers import jobs, interview, outreach, resume, coach, scout, chat, code, career
```

After `app.include_router(code.router)` (line 39), add:

```python
app.include_router(career.router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd placementos && python -m pytest tests/test_career.py -v`
Expected: PASS (7 passed)

- [ ] **Step 6: Commit**

```bash
git add placementos/routers/career.py placementos/main.py placementos/tests/test_career.py
git commit -m "feat: add POST /career/roadmap endpoint"
```

---

### Task 3: Frontend data layer (API client, proxy, persistence hook)

**Files:**
- Modify: `frontend/src/lib/api.js` (append export)
- Modify: `frontend/vite.config.js` (add `/career` proxy)
- Create: `frontend/src/hooks/useCareer.js`

**Interfaces:**
- Consumes: `POST /career/roadmap` (Task 2).
- Produces:
  - `generateRoadmap({ domain, level }) -> Promise<roadmap>` in `lib/api.js`
  - `useCareer()` hook returning `{ track, setTrack, toggleStep, resetTrack, readiness, totalSteps, completed }`, where `track` is `{domain, level, resume, roadmap, completedSteps}` or `null`. `setTrack({domain, level, resume, roadmap})` persists and resets progress; `toggleStep(stepId)` toggles completion; `resetTrack()` clears storage.

- [ ] **Step 1: Add the API client function**

Append to `frontend/src/lib/api.js`:

```javascript
export async function generateRoadmap({ domain, level }) {
  const r = await fetch('/career/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, level }),
  })
  if (!r.ok) throw new Error('Could not build roadmap')
  return r.json()
}
```

- [ ] **Step 2: Add the dev proxy route**

In `frontend/vite.config.js`, inside `server.proxy`, add a line alongside the others:

```javascript
      '/career':      'http://localhost:8000',
```

- [ ] **Step 3: Create the persistence hook**

Create `frontend/src/hooks/useCareer.js`:

```javascript
import { useState, useCallback } from 'react'

const KEY = 'placements_career'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function useCareer() {
  const [track, setTrackState] = useState(load)

  const setTrack = useCallback(({ domain, level, resume, roadmap }) => {
    const next = { domain, level, resume: resume || '', roadmap, completedSteps: [] }
    localStorage.setItem(KEY, JSON.stringify(next))
    setTrackState(next)
  }, [])

  const toggleStep = useCallback((stepId) => {
    setTrackState(prev => {
      if (!prev) return prev
      const has = prev.completedSteps.includes(stepId)
      const completedSteps = has
        ? prev.completedSteps.filter(id => id !== stepId)
        : [...prev.completedSteps, stepId]
      const next = { ...prev, completedSteps }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetTrack = useCallback(() => {
    localStorage.removeItem(KEY)
    setTrackState(null)
  }, [])

  const totalSteps = track?.roadmap?.modules?.reduce((n, m) => n + m.steps.length, 0) || 0
  const completed = track?.completedSteps?.length || 0
  const readiness = totalSteps ? Math.round((completed / totalSteps) * 100) : 0

  return { track, setTrack, toggleStep, resetTrack, readiness, totalSteps, completed }
}
```

- [ ] **Step 4: Verify it builds**

Run: `cd frontend && npx vite build`
Expected: build completes with no errors (no usage yet; this only confirms valid syntax). Then commit.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.js frontend/vite.config.js frontend/src/hooks/useCareer.js
git commit -m "feat: add career roadmap API client, proxy, and persistence hook"
```

---

### Task 4: Hand-off plumbing (chat seed)

**Files:**
- Modify: `frontend/src/context/InterviewContext.jsx`
- Modify: `frontend/src/components/chat/ChatPage.jsx` (read seed on mount)

**Interfaces:**
- Consumes: existing `InterviewContext` (`currentJob`, `setCurrentJob`, `resumeText`, `setResumeText`).
- Produces: adds `seedChat` (string) and `setSeedChat(text)` to the context value; ChatPage pre-fills its input box from `seedChat` once, then clears it. Code/Interview/Coach already read `currentJob`/`resumeText`, so they need no changes.

- [ ] **Step 1: Extend the context**

Replace the body of `frontend/src/context/InterviewContext.jsx` with:

```javascript
import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [seedChat, setSeedChat] = useState('')

  return (
    <InterviewContext.Provider value={{
      currentJob, setCurrentJob,
      resumeText, setResumeText,
      githubUrl, setGithubUrl,
      seedChat, setSeedChat,
    }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterviewContext = () => useContext(InterviewContext)
```

- [ ] **Step 2: Read the seed in ChatPage**

In `frontend/src/components/chat/ChatPage.jsx`, update the context destructure (line ~65) from:

```javascript
  const { resumeText, currentJob } = useInterviewContext()
```

to:

```javascript
  const { resumeText, currentJob, seedChat, setSeedChat } = useInterviewContext()
```

Then add this effect immediately after the existing `useState`/`useRef` declarations (after line ~70, before the existing `useEffect`):

```javascript
  useEffect(() => {
    if (seedChat) {
      setInput(seedChat)
      setSeedChat('')
      inputRef.current?.focus()
    }
  }, [seedChat])
```

(`useEffect`, `setInput`, and `inputRef` already exist in this file.)

- [ ] **Step 3: Verify it builds**

Run: `cd frontend && npx vite build`
Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/InterviewContext.jsx frontend/src/components/chat/ChatPage.jsx
git commit -m "feat: add chat-seed hand-off to InterviewContext"
```

---

### Task 5: Track picker component

**Files:**
- Create: `frontend/src/components/career/TrackPicker.jsx`

**Interfaces:**
- Consumes: `generateRoadmap` (Task 3), `useCareer().setTrack` (Task 3).
- Produces: `<TrackPicker onReady={() => {}} />` — collects domain (chips + free-text), level, optional resume; on Generate calls `generateRoadmap`, then `setTrack(...)`, then `onReady()`. Shows loading + error states.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/career/TrackPicker.jsx`:

```javascript
import { useState } from 'react'
import { Compass, Loader2, Sparkles } from 'lucide-react'
import { generateRoadmap } from '../../lib/api'
import { useCareer } from '../../hooks/useCareer'

const SUGGESTED = [
  'Frontend Developer', 'Backend Engineer', 'Full-Stack Developer',
  'Data Analyst', 'Data Scientist', 'ML Engineer',
  'DevOps Engineer', 'Product Manager', 'Android Developer',
]
const LEVELS = ['Fresher', '0-2 yrs', 'Mid-level']

export function TrackPicker({ onReady }) {
  const { setTrack } = useCareer()
  const [domain, setDomain]   = useState('')
  const [level, setLevel]     = useState('Fresher')
  const [resume, setResume]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function generate() {
    const d = domain.trim()
    if (!d) return
    setLoading(true); setError('')
    try {
      const roadmap = await generateRoadmap({ domain: d, level })
      setTrack({ domain: d, level, resume, roadmap })
      onReady?.()
    } catch {
      setError('Could not build your roadmap. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Compass size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold text-white">Career Prep</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Pick a domain and get a step-by-step prep roadmap that plugs into your practice tools.
      </p>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Domain</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTED.map(s => (
          <button key={s} onClick={() => setDomain(s)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              domain === s
                ? 'bg-primary/20 border-primary text-white'
                : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}>
            {s}
          </button>
        ))}
      </div>
      <input value={domain} onChange={e => setDomain(e.target.value)}
        placeholder="…or type any domain"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-5 outline-none focus:border-primary" />

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Experience level</label>
      <div className="flex gap-2 mb-5">
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              level === l
                ? 'bg-primary/20 border-primary text-white'
                : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Resume <span className="text-slate-600 normal-case">(optional — improves interview &amp; coach steps)</span>
      </label>
      <textarea value={resume} onChange={e => setResume(e.target.value)} rows={4}
        placeholder="Paste your resume text…"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-5 outline-none focus:border-primary resize-y" />

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button onClick={generate} disabled={!domain.trim() || loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Building your roadmap…' : 'Generate roadmap'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npx vite build`
Expected: build completes (component not yet routed; this confirms valid JSX). Then commit.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/career/TrackPicker.jsx
git commit -m "feat: add career TrackPicker component"
```

---

### Task 6: Roadmap view, page shell, route, and sidebar (full integration + verification)

**Files:**
- Create: `frontend/src/components/career/RoadmapView.jsx`
- Create: `frontend/src/components/career/CareerPage.jsx`
- Modify: `frontend/src/App.jsx` (import + `/career` route)
- Modify: `frontend/src/components/layout/Sidebar.jsx` (nav entry)

**Interfaces:**
- Consumes: `useCareer` (Task 3), `TrackPicker` (Task 5), `useInterviewContext` (`setCurrentJob`, `setResumeText`, `setSeedChat` — Task 4), `useNavigate`.
- Produces: `/career` route rendering `<CareerPage />`; `CareerPage` shows `TrackPicker` when `track` is null, else `RoadmapView`. `RoadmapView` renders modules/steps with Start hand-off + check-off + a readiness indicator + switch-track.

- [ ] **Step 1: Create RoadmapView**

Create `frontend/src/components/career/RoadmapView.jsx`:

```javascript
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Play, RotateCcw, Code2, Mic2, Zap, MessageCircle } from 'lucide-react'
import { useCareer } from '../../hooks/useCareer'
import { useInterviewContext } from '../../context/InterviewContext'

const TOOL_META = {
  code:      { icon: Code2,         label: 'Code Practice', path: '/code' },
  interview: { icon: Mic2,          label: 'Interview',     path: '/interview' },
  coach:     { icon: Zap,           label: 'Coach',         path: '/coach' },
  chat:      { icon: MessageCircle, label: 'Chat',          path: '/chat' },
}

export function RoadmapView({ onReset }) {
  const { track, toggleStep, resetTrack, readiness, completed, totalSteps } = useCareer()
  const { setCurrentJob, setResumeText, setSeedChat } = useInterviewContext()
  const navigate = useNavigate()

  const profile = track.roadmap.role_profile
  const job = {
    title: profile.title || track.domain,
    company: profile.company || '',
    description: profile.description || '',
  }

  function start(step) {
    setCurrentJob(job)
    if (track.resume) setResumeText(track.resume)
    const meta = TOOL_META[step.tool]
    if (step.tool === 'chat') {
      setSeedChat(step.config?.prompt || `Help me prepare for ${track.domain} interviews.`)
    }
    navigate(meta.path)
  }

  function switchTrack() {
    resetTrack()
    onReset?.()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Career Track</p>
          <h1 className="text-2xl font-semibold text-white">{track.domain}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{track.level}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{readiness}%</div>
          <p className="text-slate-500 text-xs">{completed}/{totalSteps} done</p>
          <button onClick={switchTrack}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <RotateCcw size={12} /> Switch track
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${readiness}%` }} />
      </div>

      <div className="space-y-8">
        {track.roadmap.modules.map((m, mi) => (
          <div key={m.id}>
            <h2 className="text-sm font-semibold text-white mb-3">
              <span className="text-slate-500 mr-2">{mi + 1}</span>{m.title}
            </h2>
            <div className="space-y-2">
              {m.steps.map(step => {
                const done = track.completedSteps.includes(step.id)
                const meta = TOOL_META[step.tool] || TOOL_META.chat
                const Icon = meta.icon
                return (
                  <div key={step.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                    <button onClick={() => toggleStep(step.id)} title="Toggle complete">
                      {done
                        ? <CheckCircle2 size={20} className="text-emerald-400" />
                        : <Circle size={20} className="text-slate-600 hover:text-slate-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {step.title}
                      </p>
                      {step.description && <p className="text-slate-500 text-xs mt-0.5">{step.description}</p>}
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                      <Icon size={12} /> {meta.label}
                    </span>
                    <button onClick={() => start(step)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30">
                      <Play size={12} /> Start
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CareerPage shell**

Create `frontend/src/components/career/CareerPage.jsx`:

```javascript
import { useState } from 'react'
import { useCareer } from '../../hooks/useCareer'
import { TrackPicker } from './TrackPicker'
import { RoadmapView } from './RoadmapView'

export function CareerPage() {
  const { track } = useCareer()
  const [, force] = useState(0)
  const rerender = () => force(n => n + 1)

  return track
    ? <RoadmapView onReset={rerender} />
    : <TrackPicker onReady={rerender} />
}
```

Note: `useCareer` reads `track` from `localStorage` on each render via its `useState` initializer per hook instance; `TrackPicker` and `RoadmapView` each call `useCareer()` and share storage. `rerender` forces `CareerPage` to re-read after a track is set/reset so it swaps views.

- [ ] **Step 3: Add the route in App.jsx**

In `frontend/src/App.jsx`, add the import after the other page imports (after line 11):

```javascript
import { CareerPage } from './components/career/CareerPage'
```

Add the route inside `<Routes>` (after the `/code` route, line 28):

```javascript
              <Route path="/career"    element={<CareerPage />} />
```

- [ ] **Step 4: Add the sidebar entry**

In `frontend/src/components/layout/Sidebar.jsx`, line 2, add `Compass` to the lucide import:

```javascript
import { Briefcase, Mic2, LayoutList, FileText, Zap, Search, Cpu, MessageCircle, Code2, Compass } from 'lucide-react'
```

In the `sections` array, add a new item to the `Prepare` section's `items` (after the `/code` entry, line 18):

```javascript
      { to: '/career',    icon: Compass,   label: 'Career Track',   end: false },
```

- [ ] **Step 5: Verify the build**

Run: `cd frontend && npx vite build`
Expected: build completes with no errors.

- [ ] **Step 6: Manual end-to-end verification (run the app)**

Ensure backend is running (`cd placementos && python -m uvicorn main:app --port 8000 --reload`) and frontend dev server (`cd frontend && npm run dev`). Then:

1. Open `http://localhost:5173/career`.
2. Pick a domain chip (e.g. "Data Analyst"), choose a level, click **Generate roadmap**. Confirm a roadmap with modules + steps renders (and readiness shows `0%`).
3. Click a step's checkbox → it marks complete, readiness % increases, and the bar grows. Reload the page → progress persists (localStorage).
4. Click **Start** on a `code` step → lands on `/code` with the role pre-selected (the "For {role}" generate button is enabled).
5. Click **Start** on a `chat` step → lands on `/chat` with the input pre-filled with the seed prompt.
6. Click **Switch track** → returns to the picker.

Expected: all six behave as described. If the roadmap fails to build, check the backend log and the `GROQ_API_KEY` in `placementos/.env`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/career/RoadmapView.jsx frontend/src/components/career/CareerPage.jsx frontend/src/App.jsx frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: add Career Track roadmap view, route, and sidebar entry"
```

---

## Self-Review Notes

- **Spec coverage:** entry point + flow (Tasks 5/6), AI roadmap → existing tools (Tasks 1/6 hand-off), synthetic `role_profile` as job (Task 1 prompt + Task 6 `job` build), `POST /career/roadmap` (Task 2), localStorage persistence + manual check-off + readiness (Task 3 hook + Task 6 view), error handling (Task 1 retry/raise, Task 2 502, Task 5 error UI), chat seed hand-off (Task 4). Backend testing covered with pytest (Tasks 1–2).
- **Deliberate deviations from the spec:** (1) resume is NOT sent to the backend — it stays client-side and is applied via `setResumeText` at step launch, so `/career/roadmap` body is `{domain, level}` only. (2) Frontend has no test tooling in this repo; per existing convention, frontend tasks end with a manual run-the-app verification (Task 6 Step 6) instead of automated component/hook tests. Both are noted for the reviewer.
- **Type consistency:** hook surface (`track`, `setTrack`, `toggleStep`, `resetTrack`, `readiness`, `completed`, `totalSteps`) is identical across Tasks 3/5/6. Step shape (`{id, title, description, tool, config}`) and `role_profile` (`{title, company, description}`) match between the Task 1 prompt/validation and the Task 6 consumer.
