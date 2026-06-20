# PlacementOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-container web app that aggregates India-friendly remote jobs and lets candidates run a personalized AI voice mock interview for any listing, then generates a cold outreach message and tracks applications.

**Architecture:** FastAPI backend serves a static single-page app and proxies all Claude calls. Job feeds are fetched from RSS/JSON sources on a background schedule and tagged for India eligibility. The interview agent streams Claude responses over SSE; voice is handled entirely client-side via the browser Web Speech API.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, anthropic SDK, feedparser, httpx, python-dotenv, vanilla HTML/CSS/JS, Docker.

## Global Constraints

- Model: `claude-sonnet-4-6`
- Python: 3.12
- API key: `ANTHROPIC_API_KEY` env var — never exposed to browser
- Browser target: Chrome (Web Speech API)
- All LLM calls proxied through backend — zero direct browser→Anthropic calls
- No user accounts, no server-side persistence beyond in-memory job cache
- Tracker lives in browser `localStorage` only
- Single Docker container, runs on Cloud Run

---

## File Map

```
placementos/
├── main.py                   # FastAPI app, mounts static, includes routers, starts feed refresh
├── routers/
│   ├── jobs.py               # GET /jobs — returns cached+tagged job listings
│   ├── interview.py          # POST /interview — SSE streaming Claude response
│   └── outreach.py           # POST /outreach — returns cold outreach message
├── services/
│   ├── feed.py               # Fetch RSS/JSON boards, tag India eligibility, cache in memory
│   └── claude.py             # Anthropic SDK wrapper (streaming + non-streaming)
├── static/
│   ├── index.html            # App shell: tab nav + three tab panels
│   ├── style.css             # All styles
│   └── app.js                # All frontend JS: feed UI, interview UI, tracker UI
├── data/
│   └── boards.json           # Board configs: name, url, type (rss|json), parser key
├── tests/
│   ├── test_feed.py          # Unit tests for eligibility tagger + feed parser
│   ├── test_interview.py     # API test for /interview endpoint
│   └── test_outreach.py      # API test for /outreach endpoint
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `placementos/requirements.txt`
- Create: `placementos/.env.example`
- Create: `placementos/main.py`
- Create: `placementos/Dockerfile`
- Create: `placementos/routers/__init__.py`
- Create: `placementos/services/__init__.py`
- Create: `placementos/data/boards.json`

**Interfaces:**
- Produces: FastAPI `app` object in `main.py` importable by tests as `from main import app`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
anthropic==0.40.0
feedparser==6.0.11
httpx==0.27.2
python-dotenv==1.0.1
pytest==8.3.2
pytest-asyncio==0.23.8
httpx==0.27.2
```

- [ ] **Step 2: Create .env.example**

```
ANTHROPIC_API_KEY=your-key-here
FEED_REFRESH_MINUTES=120
MAX_INTERVIEW_QUESTIONS=8
```

- [ ] **Step 3: Create data/boards.json**

```json
[
  {
    "name": "We Work Remotely",
    "short": "WWR",
    "url": "https://weworkremotely.com/remote-jobs.rss",
    "type": "rss",
    "best_for": "Largest pure remote board. Strong dev/design listings."
  },
  {
    "name": "RemoteOK",
    "short": "RemoteOK",
    "url": "https://remoteok.com/api",
    "type": "remoteok_json",
    "best_for": "High volume tech roles, salary shown."
  },
  {
    "name": "Remotive",
    "short": "Remotive",
    "url": "https://remotive.com/api/remote-jobs?limit=50",
    "type": "remotive_json",
    "best_for": "Curated remote tech jobs, active community."
  }
]
```

- [ ] **Step 4: Create routers/__init__.py and services/__init__.py (empty)**

Both files empty. Just `touch` them.

- [ ] **Step 5: Create main.py**

```python
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from routers import jobs, interview, outreach
from services.feed import refresh_feed

@asynccontextmanager
async def lifespan(app: FastAPI):
    await refresh_feed()
    interval = int(os.getenv("FEED_REFRESH_MINUTES", "120")) * 60
    async def _loop():
        while True:
            await asyncio.sleep(interval)
            await refresh_feed()
    task = asyncio.create_task(_loop())
    yield
    task.cancel()

app = FastAPI(title="PlacementOS", lifespan=lifespan)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(outreach.router)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")
```

- [ ] **Step 6: Create Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 7: Install dependencies**

```bash
cd placementos
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: project scaffold — FastAPI app, boards config, Dockerfile"
```

---

## Task 2: Job Feed Service + /jobs Endpoint

**Files:**
- Create: `placementos/services/feed.py`
- Create: `placementos/routers/jobs.py`
- Create: `placementos/tests/test_feed.py`

**Interfaces:**
- Produces: `refresh_feed() -> None` (populates in-memory cache)
- Produces: `get_cached_jobs() -> list[dict]` where each dict has keys: `id, title, company, source, url, tags, salary, posted_at, eligibility` (`"green"|"yellow"|"red"`)
- Consumes: `data/boards.json`

- [ ] **Step 1: Write failing tests for eligibility tagger**

```python
# tests/test_feed.py
import pytest
from services.feed import tag_eligibility

def test_worldwide_is_green():
    assert tag_eligibility("We hire worldwide, async team") == "green"

def test_us_only_is_red():
    assert tag_eligibility("Must be authorized to work in the US only") == "red"

def test_pst_overlap_is_yellow():
    assert tag_eligibility("Requires 4h overlap with PST timezone") == "yellow"

def test_no_signal_defaults_green():
    assert tag_eligibility("Senior Python developer, fully remote") == "green"

def test_india_ok_is_green():
    assert tag_eligibility("India OK, global team, async-first") == "green"
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd placementos
pytest tests/test_feed.py -v
```

Expected: `ImportError` — `services.feed` not found.

- [ ] **Step 3: Implement services/feed.py**

```python
import os
import json
import asyncio
import hashlib
from datetime import datetime
import feedparser
import httpx

_cache: list[dict] = []
_lock = asyncio.Lock()

INCLUDE = [
    "worldwide", "anywhere", "global team", "hire globally",
    "async", "india ok", "work from anywhere", "all timezones",
    "fully remote", "globally", "open to all"
]
EXCLUDE = [
    "us only", "usa only", "united states only", "must be based in",
    "work authorization", "authorized to work", "onsite", "on-site",
    "eu only", "europe only", "uk only", "canada only", "us citizen",
    "us resident", "must reside"
]
TIMEZONE_SIGNALS = ["pst", "est", "cst", "overlap", "pacific time", "eastern time", "central time"]


def tag_eligibility(text: str) -> str:
    t = text.lower()
    for kw in EXCLUDE:
        if kw in t:
            return "red"
    for kw in INCLUDE:
        if kw in t:
            return "green"
    for kw in TIMEZONE_SIGNALS:
        if kw in t:
            return "yellow"
    return "green"


def _job_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:10]


def _parse_rss(board: dict, content: str) -> list[dict]:
    feed = feedparser.parse(content)
    jobs = []
    for entry in feed.entries[:30]:
        text = f"{entry.get('title','')} {entry.get('summary','')}"
        jobs.append({
            "id": _job_id(entry.get("link", entry.get("title", ""))),
            "title": entry.get("title", ""),
            "company": entry.get("author", board["name"]),
            "source": board["short"],
            "url": entry.get("link", ""),
            "tags": [],
            "salary": "",
            "posted_at": entry.get("published", ""),
            "eligibility": tag_eligibility(text),
            "description": entry.get("summary", "")[:500],
        })
    return jobs


def _parse_remoteok(board: dict, data: list) -> list[dict]:
    jobs = []
    for item in data[1:31]:  # first item is metadata
        if not isinstance(item, dict):
            continue
        text = f"{item.get('position','')} {item.get('description','')}"
        salary = ""
        lo, hi = item.get("salary_min"), item.get("salary_max")
        if lo and hi:
            salary = f"${lo:,}–${hi:,}"
        jobs.append({
            "id": _job_id(item.get("url", item.get("id", ""))),
            "title": item.get("position", ""),
            "company": item.get("company", ""),
            "source": board["short"],
            "url": item.get("url", ""),
            "tags": item.get("tags", [])[:5],
            "salary": salary,
            "posted_at": item.get("date", ""),
            "eligibility": tag_eligibility(text),
            "description": item.get("description", "")[:500],
        })
    return jobs


def _parse_remotive(board: dict, data: dict) -> list[dict]:
    jobs = []
    for item in data.get("jobs", [])[:30]:
        text = f"{item.get('title','')} {item.get('description','')}"
        jobs.append({
            "id": _job_id(item.get("url", item.get("id", ""))),
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "source": board["short"],
            "url": item.get("url", ""),
            "tags": item.get("tags", [])[:5],
            "salary": item.get("salary", ""),
            "posted_at": item.get("publication_date", ""),
            "eligibility": tag_eligibility(text),
            "description": item.get("description", "")[:500],
        })
    return jobs


async def _fetch_board(client: httpx.AsyncClient, board: dict) -> list[dict]:
    try:
        r = await client.get(board["url"], timeout=10)
        r.raise_for_status()
        if board["type"] == "rss":
            return _parse_rss(board, r.text)
        elif board["type"] == "remoteok_json":
            return _parse_remoteok(board, r.json())
        elif board["type"] == "remotive_json":
            return _parse_remotive(board, r.json())
    except Exception:
        return []
    return []


async def refresh_feed() -> None:
    boards_path = os.path.join(os.path.dirname(__file__), "../data/boards.json")
    with open(boards_path) as f:
        boards = json.load(f)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_fetch_board(client, b) for b in boards])
    jobs: list[dict] = []
    for batch in results:
        jobs.extend(batch)
    async with _lock:
        _cache.clear()
        _cache.extend(jobs)


def get_cached_jobs() -> list[dict]:
    return list(_cache)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pytest tests/test_feed.py -v
```

Expected: 5 tests PASS.

- [ ] **Step 5: Write failing test for /jobs endpoint**

```python
# tests/test_jobs.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

def test_jobs_returns_list():
    with patch("services.feed.refresh_feed", return_value=None), \
         patch("services.feed.get_cached_jobs", return_value=[
             {"id": "abc", "title": "Backend Engineer", "company": "Acme",
              "source": "WWR", "url": "https://example.com", "tags": ["python"],
              "salary": "$80k", "posted_at": "2026-06-20", "eligibility": "green",
              "description": "Remote worldwide role"}
         ]):
        from main import app
        client = TestClient(app)
        r = client.get("/jobs")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert data[0]["eligibility"] == "green"

def test_jobs_filter_by_tag():
    with patch("services.feed.refresh_feed", return_value=None), \
         patch("services.feed.get_cached_jobs", return_value=[
             {"id": "1", "title": "React Dev", "company": "A", "source": "RO",
              "url": "", "tags": ["react"], "salary": "", "posted_at": "",
              "eligibility": "green", "description": ""},
             {"id": "2", "title": "Python Dev", "company": "B", "source": "RO",
              "url": "", "tags": ["python"], "salary": "", "posted_at": "",
              "eligibility": "green", "description": ""},
         ]):
        from main import app
        client = TestClient(app)
        r = client.get("/jobs?tag=react")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["tags"] == ["react"]
```

- [ ] **Step 6: Create routers/jobs.py**

```python
from fastapi import APIRouter, Query
from services.feed import get_cached_jobs

router = APIRouter()

@router.get("/jobs")
async def list_jobs(
    tag: str | None = Query(None),
    eligibility: str | None = Query(None),
    source: str | None = Query(None),
):
    jobs = get_cached_jobs()
    if tag:
        jobs = [j for j in jobs if tag.lower() in [t.lower() for t in j.get("tags", [])]]
    if eligibility:
        jobs = [j for j in jobs if j.get("eligibility") == eligibility]
    if source:
        jobs = [j for j in jobs if j.get("source", "").lower() == source.lower()]
    return jobs
```

- [ ] **Step 7: Run all tests**

```bash
pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: job feed service with India eligibility tagger + /jobs endpoint"
```

---

## Task 3: Claude Service + /interview Endpoint

**Files:**
- Create: `placementos/services/claude.py`
- Create: `placementos/routers/interview.py`
- Create: `placementos/tests/test_interview.py`

**Interfaces:**
- Consumes: `ANTHROPIC_API_KEY` env var
- Produces: `stream_interview(resume, jd, history, action) -> AsyncIterator[str]`
- Endpoint: `POST /interview` body `{resume, jd, history, action}` → `text/event-stream`

- [ ] **Step 1: Write failing test for /interview**

```python
# tests/test_interview.py
import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

PAYLOAD = {
    "resume": "5 years Python backend, built payment APIs at Razorpay",
    "jd": "Senior backend engineer, Python, distributed systems, Worldwide remote",
    "history": [],
    "action": "next"
}

def test_interview_streams_text():
    mock_stream = MagicMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock(return_value=None)
    mock_stream.text_stream = _async_gen(["Tell ", "me ", "about ", "yourself."])

    with patch("services.feed.refresh_feed", return_value=None), \
         patch("anthropic.AsyncAnthropic") as mock_client:
        mock_client.return_value.messages.stream.return_value = mock_stream
        from main import app
        client = TestClient(app)
        r = client.post("/interview", json=PAYLOAD)
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]

async def _async_gen(items):
    for item in items:
        yield item
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pytest tests/test_interview.py -v
```

Expected: ImportError or 404 — router not registered yet.

- [ ] **Step 3: Create services/claude.py**

```python
import os
import anthropic

_client = None

def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client

INTERVIEW_SYSTEM = """\
You are a professional interviewer conducting a behavioral mock interview.

## Candidate Resume
{resume}

## Job Description
{jd}

## Rules
1. Ask ONE question per turn, 1–2 sentences max. Be specific to the resume and JD.
2. After each candidate answer, decide:
   - FOLLOW UP: answer was vague, skipped the Result, or missed a key point — probe that specific weakness
   - ADVANCE: answer was complete — move to the next JD topic
3. Use behavioral STAR structure (Situation, Task, Action, Result).
4. Questions asked so far: {questions_asked} of {max_questions}.
5. When questions_asked >= {max_questions} OR action is "end", output ONLY the scorecard JSON wrapped in <scorecard> tags. Never output the scorecard before then.

## Scorecard format (use ONLY when session ends)
<scorecard>
{{
  "answers": [
    {{
      "question": "...",
      "answer_summary": "one sentence",
      "scores": {{"clarity": 1-5, "structure": 1-5, "relevance": 1-5, "specificity": 1-5, "confidence": 1-5}},
      "good_phrases": ["exact quote from answer"],
      "weak_phrases": ["exact quote from answer"]
    }}
  ],
  "overall": {{"clarity": 1-5, "structure": 1-5, "relevance": 1-5, "specificity": 1-5, "confidence": 1-5}},
  "weakest_answer_index": 0,
  "rewritten_answer": "Strong 150-200 word rewrite of the weakest answer using full STAR structure."
}}
</scorecard>
"""

async def stream_interview(resume: str, jd: str, history: list, action: str, questions_asked: int, max_questions: int):
    system = INTERVIEW_SYSTEM.format(
        resume=resume, jd=jd,
        questions_asked=questions_asked,
        max_questions=max_questions
    )
    messages = history[:]
    if action == "end":
        messages.append({"role": "user", "content": "Please end the session and give me my scorecard."})
    client = get_client()
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
```

- [ ] **Step 4: Create routers/interview.py**

```python
import json
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.claude import stream_interview

router = APIRouter()

class InterviewRequest(BaseModel):
    resume: str
    jd: str
    history: list[dict]
    action: str = "next"
    questions_asked: int = 0

@router.post("/interview")
async def interview(body: InterviewRequest):
    max_q = int(os.getenv("MAX_INTERVIEW_QUESTIONS", "8"))

    async def generate():
        async for chunk in stream_interview(
            body.resume, body.jd, body.history,
            body.action, body.questions_asked, max_q
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_interview.py -v
```

Expected: PASS (mock patches Anthropic client).

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Claude service + /interview SSE streaming endpoint"
```

---

## Task 4: /outreach Endpoint

**Files:**
- Create: `placementos/routers/outreach.py`
- Create: `placementos/tests/test_outreach.py`

**Interfaces:**
- Consumes: `services.claude.get_client()`
- Endpoint: `POST /outreach` body `{resume, company, role, github}` → `{"message": "..."}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_outreach.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

PAYLOAD = {
    "resume": "5 years Python, built payment APIs, GitHub: github.com/testuser",
    "company": "Stripe",
    "role": "Senior Backend Engineer",
    "github": "https://github.com/testuser"
}

def test_outreach_returns_message():
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text="Hi Sarah — I saw Stripe is hiring...")]

    with patch("services.feed.refresh_feed", return_value=None), \
         patch("anthropic.AsyncAnthropic") as mock_client:
        mock_client.return_value.messages.create = AsyncMock(return_value=mock_msg)
        from main import app
        client = TestClient(app)
        r = client.post("/outreach", json=PAYLOAD)
        assert r.status_code == 200
        assert "message" in r.json()
        assert isinstance(r.json()["message"], str)
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pytest tests/test_outreach.py -v
```

Expected: ImportError or 404.

- [ ] **Step 3: Create routers/outreach.py**

```python
from fastapi import APIRouter
from pydantic import BaseModel
from services.claude import get_client

router = APIRouter()

class OutreachRequest(BaseModel):
    resume: str
    company: str
    role: str
    github: str = ""

OUTREACH_PROMPT = """\
Write a cold outreach LinkedIn/email message for a job application. Requirements:
- Under 80 words total
- Open with: Hi [hiring manager name if known, else omit] — I saw {company} is hiring a {role}.
- Mention ONE specific, relevant project or achievement from the resume (with a concrete result)
- State: "I work remotely from India with 3–4 hrs overlap with your team."
- End with GitHub link if provided, offer to do a short task
- Lead with results, NOT "I'm passionate and hardworking"
- Return ONLY the message, no explanation

Resume: {resume}
GitHub: {github}
Company: {company}
Role: {role}
"""

@router.post("/outreach")
async def generate_outreach(body: OutreachRequest):
    client = get_client()
    prompt = OUTREACH_PROMPT.format(
        resume=body.resume, company=body.company,
        role=body.role, github=body.github
    )
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )
    return {"message": msg.content[0].text}
```

- [ ] **Step 4: Run all tests**

```bash
pytest tests/ -v
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: /outreach endpoint — generates personalized cold message via Claude"
```

---

## Task 5: Frontend Shell + Job Feed UI

**Files:**
- Create: `placementos/static/index.html`
- Create: `placementos/static/style.css`
- Create: `placementos/static/app.js`

**Interfaces:**
- Consumes: `GET /jobs?tag=&eligibility=&source=`
- Produces: job card UI, "Prep for this role" → loads JD into interview tab

- [ ] **Step 1: Create static/style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f5f7fa;
  color: #1a1a2e;
  min-height: 100vh;
}

header {
  background: #1a1a2e;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

header h1 { font-size: 1.25rem; font-weight: 700; }
header span { font-size: 0.8rem; color: #a0aec0; }

nav {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  padding: 0 24px;
}

nav button {
  background: none;
  border: none;
  padding: 14px 20px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #64748b;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

nav button.active {
  color: #1a1a2e;
  border-bottom-color: #6366f1;
  font-weight: 600;
}

.tab-content { display: none; padding: 24px; max-width: 1100px; margin: 0 auto; }
.tab-content.active { display: block; }

/* --- Job Feed --- */
.feed-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.feed-controls input {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  flex: 1;
  min-width: 200px;
}

.feed-controls select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
}

.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.job-card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.15s;
}

.job-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.job-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.job-title { font-weight: 600; font-size: 0.95rem; }
.job-company { font-size: 0.85rem; color: #64748b; margin-top: 2px; }

.badge {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-green { background: #d1fae5; color: #065f46; }
.badge-yellow { background: #fef3c7; color: #92400e; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-source { background: #e0e7ff; color: #3730a3; }

.job-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.job-tag {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
}

.job-salary { font-size: 0.85rem; color: #059669; font-weight: 500; }

.job-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 8px; }

.btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: opacity 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn-primary { background: #6366f1; color: white; }
.btn-secondary { background: #f1f5f9; color: #1a1a2e; }
.btn-sm { padding: 6px 10px; font-size: 0.8rem; }

/* --- Interview --- */
.interview-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 700px) { .interview-layout { grid-template-columns: 1fr; } }

.panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.panel h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  font-size: 0.85rem;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.interview-stage { display: none; }
.interview-stage.active { display: block; }

#question-display {
  background: #f0f4ff;
  border-left: 3px solid #6366f1;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 16px;
  min-height: 60px;
}

#transcript-display {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  min-height: 80px;
  font-size: 0.9rem;
  color: #334155;
  margin-bottom: 12px;
}

.voice-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.recording-indicator {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #ef4444;
  display: none;
  animation: pulse 1s infinite;
}
.recording-indicator.active { display: inline-block; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.progress-bar { background: #e2e8f0; border-radius: 4px; height: 4px; margin: 12px 0; }
.progress-fill { background: #6366f1; height: 100%; border-radius: 4px; transition: width 0.3s; }

/* --- Scorecard --- */
.scorecard-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 16px 0;
}

.score-cell {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
}
.score-cell .dim { font-size: 0.72rem; color: #64748b; text-transform: uppercase; }
.score-cell .val { font-size: 1.4rem; font-weight: 700; color: #6366f1; }

.answer-review {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border-left: 3px solid #e2e8f0;
}
.answer-review.weakest { border-left-color: #f59e0b; }

/* --- Outreach --- */
#outreach-text {
  width: 100%;
  min-height: 120px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 10px;
}

/* --- Tracker --- */
.tracker-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.tracker-table th {
  background: #f8fafc;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}
.tracker-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.tracker-table tr:hover td { background: #f8fafc; }

.status-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.8rem;
  background: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
}
.empty-state p { margin-top: 8px; font-size: 0.9rem; }

#toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1a1a2e;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: 999;
}
#toast.show { opacity: 1; }
```

- [ ] **Step 2: Create static/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlacementOS — Find it. Prep for it. Get it.</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>

<header>
  <div>
    <h1>PlacementOS</h1>
    <span>Find it → Prep for it → Get it</span>
  </div>
</header>

<nav>
  <button class="active" onclick="switchTab('jobs')">Jobs</button>
  <button onclick="switchTab('interview')">Interview Prep</button>
  <button onclick="switchTab('tracker')">Tracker</button>
</nav>

<!-- ===================== JOBS TAB ===================== -->
<div id="tab-jobs" class="tab-content active">
  <div class="feed-controls">
    <input id="search-input" type="text" placeholder="Search by keyword, stack, company..." oninput="filterJobs()">
    <select id="eligibility-filter" onchange="filterJobs()">
      <option value="">All eligibility</option>
      <option value="green">Worldwide (Green)</option>
      <option value="yellow">Check timezone (Yellow)</option>
      <option value="red">Show region-locked too</option>
    </select>
    <select id="source-filter" onchange="filterJobs()">
      <option value="">All boards</option>
      <option value="WWR">We Work Remotely</option>
      <option value="RemoteOK">RemoteOK</option>
      <option value="Remotive">Remotive</option>
    </select>
    <button class="btn btn-secondary btn-sm" onclick="loadJobs()">Refresh</button>
  </div>
  <div id="job-grid" class="job-grid">
    <div class="empty-state"><strong>Loading jobs...</strong><p>Fetching India-friendly remote roles</p></div>
  </div>
</div>

<!-- ===================== INTERVIEW TAB ===================== -->
<div id="tab-interview" class="tab-content">

  <!-- Stage 1: Intake -->
  <div id="stage-intake" class="interview-stage active">
    <div class="interview-layout">
      <div class="panel">
        <h3>Your Resume</h3>
        <textarea id="resume-input" placeholder="Paste your resume text here..."></textarea>
      </div>
      <div class="panel">
        <h3>Job Description</h3>
        <textarea id="jd-input" placeholder="Paste the job description here, or click 'Prep for this role' on a job card..."></textarea>
        <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
          <input id="github-input" type="text" style="flex:1; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.85rem;" placeholder="GitHub URL (optional)">
        </div>
      </div>
    </div>
    <div style="margin-top:20px; text-align:center;">
      <button class="btn btn-primary" onclick="startInterview()" style="padding:12px 32px; font-size:1rem;">
        Start Mock Interview
      </button>
    </div>
  </div>

  <!-- Stage 2: Interview -->
  <div id="stage-interview" class="interview-stage">
    <div class="panel" style="max-width:700px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3>Mock Interview</h3>
        <span id="q-counter" style="font-size:0.85rem; color:#64748b;"></span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
      <div id="question-display">Preparing your first question...</div>
      <div id="transcript-display">Your answer will appear here as you speak...</div>
      <div class="voice-controls">
        <div class="recording-indicator" id="rec-indicator"></div>
        <button class="btn btn-primary" id="btn-listen" onclick="startListening()">🎙 Start Speaking</button>
        <button class="btn btn-secondary" id="btn-done" onclick="submitAnswer()" disabled>Done Answering</button>
        <button class="btn btn-secondary btn-sm" onclick="endSession()" style="margin-left:auto; color:#ef4444;">End Session</button>
      </div>
      <p style="font-size:0.78rem; color:#94a3b8; margin-top:10px;">
        Tip: Click "Done Answering" when you finish speaking. Your answer won't be cut off.
      </p>
    </div>
  </div>

  <!-- Stage 3: Scorecard -->
  <div id="stage-scorecard" class="interview-stage">
    <div style="max-width:760px; margin:0 auto;">
      <div class="panel" style="margin-bottom:16px;">
        <h3>Your Scorecard</h3>
        <div class="scorecard-grid" id="overall-scores"></div>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <h3>Answer Breakdown</h3>
        <div id="answer-breakdown"></div>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <h3>Rewritten Strong Answer</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:10px;">Here's how your weakest answer could sound:</p>
        <div id="rewritten-answer" style="background:#f0f9ff; border-left:3px solid #0ea5e9; padding:14px; border-radius:8px; font-size:0.9rem; line-height:1.6;"></div>
      </div>
      <div class="panel">
        <h3>Cold Outreach Message</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:10px;">Personalized for this role. Edit before sending.</p>
        <div id="outreach-loading" style="color:#94a3b8; font-size:0.9rem;">Generating your outreach message...</div>
        <textarea id="outreach-text" style="display:none;"></textarea>
        <div id="outreach-actions" style="display:none; display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-primary btn-sm" onclick="copyOutreach()">Copy Message</button>
          <button class="btn btn-secondary btn-sm" onclick="addToTracker()">Add to Tracker</button>
        </div>
      </div>
      <div style="text-align:center; margin-top:20px;">
        <button class="btn btn-secondary" onclick="resetInterview()">Start New Session</button>
      </div>
    </div>
  </div>
</div>

<!-- ===================== TRACKER TAB ===================== -->
<div id="tab-tracker" class="tab-content">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
    <h2 style="font-size:1.1rem;">Application Tracker</h2>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-secondary btn-sm" onclick="exportCSV()">Export CSV</button>
    </div>
  </div>
  <div style="overflow-x:auto;">
    <table class="tracker-table" id="tracker-table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Role</th>
          <th>Board</th>
          <th>Date Applied</th>
          <th>Prep Score</th>
          <th>Status</th>
          <th>Follow-up</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="tracker-body"></tbody>
    </table>
  </div>
  <div id="tracker-empty" class="empty-state" style="display:none;">
    <strong>No applications yet</strong>
    <p>Click "Add to Tracker" from a job card or after a mock session.</p>
  </div>
</div>

<div id="toast"></div>

<script src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create static/app.js skeleton (tab switching + toast)**

```javascript
// ── Tab navigation ──────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('nav button')[['jobs','interview','tracker'].indexOf(name)].classList.add('active');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── State ────────────────────────────────────────────────────────
const state = {
  jobs: [],
  history: [],
  questionsAsked: 0,
  currentTranscript: '',
  recognition: null,
  currentJob: null,
  scorecard: null,
};
```

- [ ] **Step 4: Add job feed rendering to app.js**

```javascript
// ── Job Feed ─────────────────────────────────────────────────────
async function loadJobs() {
  const grid = document.getElementById('job-grid');
  grid.innerHTML = '<div class="empty-state"><strong>Loading...</strong></div>';
  try {
    const r = await fetch('/jobs');
    state.jobs = await r.json();
    renderJobs(state.jobs);
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><strong>Failed to load jobs.</strong><p>Is the server running?</p></div>';
  }
}

function filterJobs() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const elig = document.getElementById('eligibility-filter').value;
  const src = document.getElementById('source-filter').value;
  let filtered = state.jobs;
  if (q) filtered = filtered.filter(j =>
    j.title.toLowerCase().includes(q) ||
    j.company.toLowerCase().includes(q) ||
    (j.tags || []).some(t => t.toLowerCase().includes(q))
  );
  if (elig && elig !== 'red') filtered = filtered.filter(j => j.eligibility === elig);
  if (src) filtered = filtered.filter(j => j.source === src);
  renderJobs(filtered);
}

function renderJobs(jobs) {
  const grid = document.getElementById('job-grid');
  if (!jobs.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No jobs match your filters.</strong></div>';
    return;
  }
  grid.innerHTML = jobs.map(j => jobCard(j)).join('');
}

function jobCard(j) {
  const eligLabel = { green: 'Worldwide', yellow: 'Check timezone', red: 'Region-locked' };
  const tags = (j.tags || []).map(t => `<span class="job-tag">${t}</span>`).join('');
  const salary = j.salary ? `<div class="job-salary">${j.salary}</div>` : '';
  return `
    <div class="job-card">
      <div class="job-card-header">
        <div>
          <div class="job-title">${esc(j.title)}</div>
          <div class="job-company">${esc(j.company)}</div>
        </div>
        <span class="badge badge-${j.eligibility}">${eligLabel[j.eligibility]}</span>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <span class="badge badge-source">${esc(j.source)}</span>
        ${j.posted_at ? `<span style="font-size:0.75rem;color:#94a3b8;">${j.posted_at.slice(0,10)}</span>` : ''}
      </div>
      ${tags ? `<div class="job-tags">${tags}</div>` : ''}
      ${salary}
      <div class="job-actions">
        <button class="btn btn-primary btn-sm" onclick='prepForJob(${JSON.stringify(j)})'>Prep for this role</button>
        <a href="${esc(j.url)}" target="_blank" class="btn btn-secondary btn-sm">View JD</a>
        <button class="btn btn-secondary btn-sm" onclick='saveToTracker(${JSON.stringify(j)})'>Save</button>
      </div>
    </div>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function prepForJob(job) {
  state.currentJob = job;
  document.getElementById('jd-input').value = `${job.title} at ${job.company}\n\nSource: ${job.source}\n\n${job.description}`;
  switchTab('interview');
  toast(`JD loaded for "${job.title}" — paste your resume and start!`);
}

window.addEventListener('DOMContentLoaded', loadJobs);
```

- [ ] **Step 5: Manually verify in browser**

```bash
cd placementos
ANTHROPIC_API_KEY=dummy uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000`. Jobs tab should load (may show empty if boards are unreachable with dummy key). Cards should render with eligibility badges. "Prep for this role" should switch to Interview tab and pre-fill JD.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: frontend shell, job feed UI with eligibility badges and filtering"
```

---

## Task 6: Frontend Interview UI (Voice + Turn-Taking)

**Files:**
- Modify: `placementos/static/app.js` (append interview functions)

**Interfaces:**
- Consumes: `POST /interview` SSE stream
- Produces: populates `state.history`, `state.questionsAsked`, `state.scorecard`

- [ ] **Step 1: Append interview functions to app.js**

```javascript
// ── Interview ─────────────────────────────────────────────────────
const MAX_Q = 8;

function startInterview() {
  const resume = document.getElementById('resume-input').value.trim();
  const jd = document.getElementById('jd-input').value.trim();
  if (!resume) { toast('Please paste your resume first.'); return; }
  if (!jd) { toast('Please paste a job description first.'); return; }

  state.history = [];
  state.questionsAsked = 0;
  state.currentTranscript = '';

  showStage('interview');
  updateProgress();
  askNext('next');
}

function showStage(name) {
  document.querySelectorAll('.interview-stage').forEach(s => s.classList.remove('active'));
  document.getElementById('stage-' + name).classList.add('active');
}

function updateProgress() {
  const pct = (state.questionsAsked / MAX_Q) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('q-counter').textContent = `Question ${state.questionsAsked} of ${MAX_Q}`;
}

async function askNext(action) {
  const resume = document.getElementById('resume-input').value.trim();
  const jd = document.getElementById('jd-input').value.trim();
  const qDisplay = document.getElementById('question-display');
  qDisplay.textContent = '';
  document.getElementById('btn-done').disabled = true;
  document.getElementById('btn-listen').disabled = true;

  const r = await fetch('/interview', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      resume, jd,
      history: state.history,
      action,
      questions_asked: state.questionsAsked
    })
  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.done) break;
      if (payload.text) {
        fullText += payload.text;
        qDisplay.textContent = fullText;
      }
    }
  }

  // Check if scorecard returned
  const scorecardMatch = fullText.match(/<scorecard>([\s\S]*?)<\/scorecard>/);
  if (scorecardMatch) {
    try {
      state.scorecard = JSON.parse(scorecardMatch[1]);
      renderScorecard(state.scorecard);
      generateOutreach();
      showStage('scorecard');
    } catch(e) {
      toast('Error parsing scorecard. Please try again.');
    }
    return;
  }

  // Normal question — push to history, enable voice controls, speak aloud
  state.history.push({ role: 'assistant', content: fullText });
  state.questionsAsked++;
  updateProgress();
  document.getElementById('transcript-display').textContent = 'Your answer will appear here as you speak...';
  state.currentTranscript = '';
  document.getElementById('btn-listen').disabled = false;
  speakText(fullText);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 1.0;
  utt.onend = () => {
    document.getElementById('btn-done').disabled = false;
  };
  window.speechSynthesis.speak(utt);
}

function startListening() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    toast('Speech recognition not supported. Please use Chrome.');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new SR();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = 'en-US';
  state.recognition = recog;

  recog.onstart = () => {
    document.getElementById('rec-indicator').classList.add('active');
    document.getElementById('btn-listen').textContent = '🎙 Listening...';
    document.getElementById('btn-done').disabled = false;
  };

  recog.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    state.currentTranscript += final;
    document.getElementById('transcript-display').textContent =
      (state.currentTranscript + interim).trim() || 'Listening...';
  };

  recog.onerror = () => {
    document.getElementById('rec-indicator').classList.remove('active');
    document.getElementById('btn-listen').textContent = '🎙 Start Speaking';
  };

  recog.start();
}

function submitAnswer() {
  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }
  document.getElementById('rec-indicator').classList.remove('active');
  document.getElementById('btn-listen').textContent = '🎙 Start Speaking';
  document.getElementById('btn-done').disabled = true;

  const answer = state.currentTranscript.trim();
  if (!answer) { toast('No answer recorded. Try speaking again.'); return; }

  state.history.push({ role: 'user', content: answer });

  if (state.questionsAsked >= MAX_Q) {
    endSession();
  } else {
    askNext('next');
  }
}

function endSession() {
  if (state.recognition) { state.recognition.stop(); state.recognition = null; }
  askNext('end');
}

function resetInterview() {
  state.history = [];
  state.questionsAsked = 0;
  state.currentTranscript = '';
  state.scorecard = null;
  state.currentJob = null;
  document.getElementById('resume-input').value = '';
  document.getElementById('jd-input').value = '';
  document.getElementById('transcript-display').textContent = 'Your answer will appear here...';
  showStage('intake');
}
```

- [ ] **Step 2: Manual test in Chrome**

Start server. Go to Interview tab. Paste a short resume and JD. Click "Start Mock Interview". Verify:
- A question appears in the blue box
- TTS speaks the question aloud
- Clicking "Start Speaking" starts recording (red dot appears)
- Speaking populates the transcript box in real time
- Clicking "Done Answering" sends the answer and triggers the next question
- After 8 questions or clicking "End Session", scorecard appears

- [ ] **Step 3: Commit**

```bash
git add static/app.js
git commit -m "feat: voice interview UI — Web Speech API, turn-taking, SSE streaming"
```

---

## Task 7: Scorecard, Outreach Panel, and Tracker

**Files:**
- Modify: `placementos/static/app.js` (append scorecard, outreach, tracker functions)

**Interfaces:**
- Consumes: `state.scorecard` (set in Task 6)
- Consumes: `POST /outreach`
- Produces: localStorage key `placements_tracker` — array of tracker rows

- [ ] **Step 1: Append scorecard rendering to app.js**

```javascript
// ── Scorecard ─────────────────────────────────────────────────────
function renderScorecard(sc) {
  const dims = ['clarity','structure','relevance','specificity','confidence'];
  const overall = sc.overall || {};

  document.getElementById('overall-scores').innerHTML = dims.map(d => `
    <div class="score-cell">
      <div class="dim">${d}</div>
      <div class="val">${overall[d] || '–'}</div>
    </div>`).join('');

  const breakdown = document.getElementById('answer-breakdown');
  breakdown.innerHTML = (sc.answers || []).map((a, i) => {
    const isWeak = i === sc.weakest_answer_index;
    const avg = dims.reduce((s, d) => s + (a.scores[d] || 0), 0) / dims.length;
    return `
      <div class="answer-review${isWeak ? ' weakest' : ''}">
        ${isWeak ? '<span class="badge badge-yellow" style="margin-bottom:8px; display:inline-block;">Weakest answer</span>' : ''}
        <div style="font-weight:600; margin-bottom:6px; font-size:0.9rem;">Q: ${esc(a.question)}</div>
        <div style="font-size:0.82rem; color:#475569; margin-bottom:8px;">Avg score: ${avg.toFixed(1)}/5</div>
        ${a.good_phrases?.length ? `<div style="font-size:0.82rem; color:#059669;">✓ ${a.good_phrases.join(' · ')}</div>` : ''}
        ${a.weak_phrases?.length ? `<div style="font-size:0.82rem; color:#dc2626; margin-top:4px;">✗ ${a.weak_phrases.join(' · ')}</div>` : ''}
      </div>`;
  }).join('');

  document.getElementById('rewritten-answer').textContent = sc.rewritten_answer || '';
}

// ── Outreach ──────────────────────────────────────────────────────
async function generateOutreach() {
  const resume = document.getElementById('resume-input').value.trim();
  const github = document.getElementById('github-input').value.trim();
  const company = state.currentJob?.company || 'the company';
  const role = state.currentJob?.title || 'the role';

  try {
    const r = await fetch('/outreach', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ resume, company, role, github })
    });
    const data = await r.json();
    document.getElementById('outreach-loading').style.display = 'none';
    document.getElementById('outreach-text').style.display = 'block';
    document.getElementById('outreach-text').value = data.message;
    document.getElementById('outreach-actions').style.display = 'flex';
  } catch(e) {
    document.getElementById('outreach-loading').textContent = 'Could not generate message. Please try again.';
  }
}

function copyOutreach() {
  const txt = document.getElementById('outreach-text').value;
  navigator.clipboard.writeText(txt).then(() => toast('Message copied to clipboard!'));
}

// ── Tracker ───────────────────────────────────────────────────────
const TRACKER_KEY = 'placements_tracker';
const STATUSES = ['Saved','Applied','Outreach sent','Replied','Interview','Offer','Rejected'];

function getTracker() {
  return JSON.parse(localStorage.getItem(TRACKER_KEY) || '[]');
}

function saveTracker(rows) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(rows));
}

function addToTracker() {
  const rows = getTracker();
  const dims = ['clarity','structure','relevance','specificity','confidence'];
  const sc = state.scorecard;
  const overall = sc?.overall || {};
  const avgScore = sc ? (dims.reduce((s,d) => s + (overall[d]||0),0)/dims.length).toFixed(1) : '';

  const row = {
    id: Date.now().toString(),
    company: state.currentJob?.company || '',
    role: state.currentJob?.title || '',
    source: state.currentJob?.source || '',
    url: state.currentJob?.url || '',
    date_applied: new Date().toISOString().slice(0,10),
    prep_score: avgScore,
    status: 'Applied',
    followup_date: '',
    outreach_sent: false,
  };

  rows.unshift(row);
  saveTracker(rows);
  renderTracker();
  switchTab('tracker');
  toast('Added to tracker!');
}

function saveToTracker(job) {
  const rows = getTracker();
  if (rows.find(r => r.url === job.url)) { toast('Already in tracker.'); return; }
  rows.unshift({
    id: Date.now().toString(),
    company: job.company,
    role: job.title,
    source: job.source,
    url: job.url,
    date_applied: '',
    prep_score: '',
    status: 'Saved',
    followup_date: '',
    outreach_sent: false,
  });
  saveTracker(rows);
  renderTracker();
  toast(`"${job.title}" saved to tracker.`);
}

function renderTracker() {
  const rows = getTracker();
  const tbody = document.getElementById('tracker-body');
  const empty = document.getElementById('tracker-empty');

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td><a href="${esc(row.url)}" target="_blank" style="color:#6366f1; text-decoration:none;">${esc(row.company)}</a></td>
      <td>${esc(row.role)}</td>
      <td><span class="badge badge-source">${esc(row.source)}</span></td>
      <td>${row.date_applied || '—'}</td>
      <td>${row.prep_score ? `${row.prep_score}/5` : '—'}</td>
      <td>
        <select class="status-select" onchange="updateStatus('${row.id}', this.value)">
          ${STATUSES.map(s => `<option${s===row.status?' selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><input type="date" value="${row.followup_date||''}" style="border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; font-size:0.8rem;"
        onchange="updateFollowup('${row.id}', this.value)"></td>
      <td><button class="btn btn-secondary btn-sm" onclick="deleteRow('${row.id}')" style="color:#ef4444;">Remove</button></td>
    </tr>`).join('');
}

function updateStatus(id, status) {
  const rows = getTracker();
  const row = rows.find(r => r.id === id);
  if (row) { row.status = status; saveTracker(rows); }
}

function updateFollowup(id, date) {
  const rows = getTracker();
  const row = rows.find(r => r.id === id);
  if (row) { row.followup_date = date; saveTracker(rows); }
}

function deleteRow(id) {
  const rows = getTracker().filter(r => r.id !== id);
  saveTracker(rows);
  renderTracker();
}

function exportCSV() {
  const rows = getTracker();
  const headers = ['Company','Role','Source','Date Applied','Prep Score','Status','Follow-up Date','URL'];
  const lines = [headers.join(','), ...rows.map(r =>
    [r.company, r.role, r.source, r.date_applied, r.prep_score, r.status, r.followup_date, r.url]
    .map(v => `"${(v||'').replace(/"/g,'""')}"`)
    .join(',')
  )];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `placements-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('CSV exported!');
}

// Render tracker on load
window.addEventListener('DOMContentLoaded', () => { loadJobs(); renderTracker(); });
```

- [ ] **Step 2: Manual end-to-end test**

Start server. Complete a full flow:
1. Jobs tab → click "Prep for this role" on a card
2. Interview tab → paste resume → start interview → complete 3+ questions → click "End Session"
3. Scorecard appears with scores and rewritten answer
4. Outreach message generates below
5. Click "Add to Tracker" → Tracker tab opens with the row
6. Change status, set follow-up date
7. Click "Export CSV" → file downloads with correct columns

- [ ] **Step 3: Commit**

```bash
git add static/app.js
git commit -m "feat: scorecard UI, outreach panel, localStorage tracker with CSV export"
```

---

## Task 8: Docker Build + End-to-End Smoke Test

**Files:**
- No new files — validate existing Dockerfile and full stack

- [ ] **Step 1: Build Docker image**

```bash
cd placementos
docker build -t placementos:local .
```

Expected: image builds successfully, no errors.

- [ ] **Step 2: Run container**

```bash
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=your-real-key-here placementos:local
```

- [ ] **Step 3: Smoke test**

```bash
curl http://localhost:8080/          # → 200, HTML page
curl http://localhost:8080/jobs      # → 200, JSON array
curl -X POST http://localhost:8080/outreach \
  -H "Content-Type: application/json" \
  -d '{"resume":"5yr Python","company":"Stripe","role":"Backend Eng","github":""}' 
# → 200, {"message": "..."}
```

- [ ] **Step 4: Full interview flow in Chrome at localhost:8080**

Verify end-to-end: jobs load → prep for role → mock interview with voice → scorecard → outreach → tracker.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: PlacementOS v1 complete — job feed + AI voice interview + outreach + tracker"
```

---

## Self-Review

**Spec coverage check:**
- ✅ India-eligible job feed (Green/Yellow/Red tagging) — Task 2
- ✅ /jobs endpoint with filtering — Task 2
- ✅ Paste resume + JD for intake — Task 5
- ✅ "Prep for this role" → JD pre-loaded — Task 5
- ✅ Voice interview (STT + TTS) — Task 6
- ✅ "Done answering" button — Task 6
- ✅ Follow-up probing via Claude — Task 3 (system prompt)
- ✅ 5-dimension scorecard — Task 3 (rubric) + Task 7 (UI)
- ✅ Rewritten weak answer — Task 3 (system prompt) + Task 7 (UI)
- ✅ Cold outreach generator — Task 4 + Task 7
- ✅ Application tracker (localStorage + CSV) — Task 7
- ✅ API key never in browser — Tasks 3+4 (all calls via backend)
- ✅ Docker single container — Task 1 + Task 8
- ✅ Chrome primary target — Tasks 5+6

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `state.scorecard` set in Task 6 (`renderScorecard`), consumed in Task 7 (`addToTracker`). `state.currentJob` set in Task 5 (`prepForJob`), consumed in Task 7. Consistent throughout.
