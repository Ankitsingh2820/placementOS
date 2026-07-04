# PlacementOS

**Find it → Prep → Get it.** An AI-powered job-search and placement-prep platform for remote and India-friendly roles. PlacementOS aggregates live job listings, ranks them against your resume, and then preps you end-to-end — mock interviews, resume tailoring, cold outreach, coding practice, and a domain-specific career roadmap — all powered by [Groq](https://groq.com/) running `llama-3.3-70b-versatile`.

---

## Table of Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Job board sources](#job-board-sources)
- [API overview](#api-overview)
- [Running tests](#running-tests)
- [Production build](#production-build)
- [Design notes & caveats](#design-notes--caveats)

---

## What it does

PlacementOS is organized into a set of tools, reachable from the sidebar:

| Tool | What it does |
|------|--------------|
| **Jobs** | A live, aggregated job feed from 8+ boards. Each listing is tagged for work type (remote / hybrid / onsite) and India-eligibility. Includes a resume keyword-match ranker and a job-detail drawer. |
| **Job Scout** | Two AI modes: **natural-language search** ("remote Python backend, India-friendly, early-stage startup") and a **"Top Matches" digest** that ranks the whole feed against your resume and returns your best ~10 fits with a reason for each. |
| **Interview Prep** | An AI **mock interview** — voice-driven via the browser's Web Speech API — followed by a **scorecard**, a **gap analysis** with a study plan, and auto-generated cold outreach. |
| **Resume Tailor** | Rewrites your resume to match a job description (facts preserved, keywords aligned), with an **ATS keyword scan**, a **diff view** of changes, and **download** (`.txt`). |
| **App Coach** | A one-click "full application package" that orchestrates fit analysis → tailored resume → cold outreach → follow-up email. |
| **Code Practice** | Coding problems tailored to the target role, with a Monaco editor, AI evaluation, and hints. |
| **Career Track** | Pick a domain and get an AI-generated **roadmap** whose steps deep-link into the other tools, pre-loaded for that domain. |
| **Tracker** | A browser-local application tracker (status pipeline, follow-up dates, CSV export). |
| **AI Career Chat** | A general-purpose career assistant that can be seeded with your resume and a specific job. |

## Tech stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) (Python 3.14)
- [Groq](https://groq.com/) Python SDK — model `llama-3.3-70b-versatile`
- `feedparser` + `httpx` for the job feed, `pypdf` for resume parsing, `langdetect` for translating non-English listings
- `pytest` + `pytest-asyncio` for tests

**Frontend**
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [lucide-react](https://lucide.dev/) icons
- [React Router](https://reactrouter.com/), [Monaco Editor](https://microsoft.github.io/monaco-editor/) (code practice), `diff` (resume diff view)

**No database, no auth.** All user state (resume, tracker, career roadmap) lives in the browser's `localStorage`. The job feed is an in-memory cache on the server, refreshed on an interval.

## How it works

A few design ideas tie the app together:

- **One job shape, reused everywhere.** Every prep tool (Interview, Coach, Code, Chat) consumes the same input: a job object `{ title, company, description }` plus your resume. This means a "domain" in Career Track is just a *synthetic job object*, and any listing from the feed can flow into any tool with no adapter.
- **One resume, shared.** Your resume is stored once in a React context backed by `localStorage` (`placements_resume`) and surfaced through a single `<ResumeInput/>` component — upload it on any page and it's pre-filled everywhere.
- **One scoring primitive.** A single `rank_jobs(criteria, jobs, top_k, with_action)` function powers both Scout search and the resume digest, so ranking behavior is consistent.
- **In-memory feed.** On startup (and every `FEED_REFRESH_MINUTES`), the server fetches all configured boards concurrently, tags each listing (work type + eligibility), translates non-English listings via Groq, and caches the result. The `/jobs` endpoint serves from that cache.

## Project structure

```
placement help/
├── placementos/                 # FastAPI backend
│   ├── main.py                  # app + lifespan (feed refresh loop) + SPA fallback
│   ├── routers/                 # one module per feature (jobs, interview, scout, …)
│   ├── services/
│   │   ├── claude.py            # Groq client + streaming helpers (get_client, MODEL)
│   │   ├── agents.py            # AI tasks: fit, rank_jobs, digest, ATS, gap, outreach
│   │   ├── career.py            # roadmap generation
│   │   ├── feed.py              # job-board fetch, parse, tag, translate, cache
│   │   └── codeproblems.py      # coding-problem generation/evaluation
│   ├── data/boards.json         # job board configuration
│   ├── tests/                   # pytest suite
│   └── static_react/            # built frontend (generated; served in production)
├── frontend/                    # React + Vite app
│   └── src/
│       ├── components/          # one folder per tool (jobs, interview, scout, …)
│       ├── hooks/               # useJobs, useTracker, useInterview, useCareer
│       ├── context/             # InterviewContext (shared resume/job state)
│       └── lib/api.js           # typed fetch wrappers for every endpoint
└── docs/                        # specs & implementation plans
```

## Getting started

### Prerequisites
- **Python 3.11+** (developed on 3.14)
- **Node.js 18+**
- A **free Groq API key** — https://console.groq.com/keys

### 1. Backend

```bash
cd placementos

# create a virtualenv (recommended)
python -m venv .venv
source .venv/Scripts/activate      # Windows (Git Bash);  use .venv/bin/activate on macOS/Linux

pip install -r requirements.txt

# create your .env (see the table below) — at minimum:
echo "GROQ_API_KEY=your_groq_key_here" > .env

# run the API (http://127.0.0.1:8000)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

The Vite dev server proxies all API routes (`/jobs`, `/scout`, `/interview`, …) to the backend on port 8000, so run both together during development.

## Environment variables

Create `placementos/.env`. **Only `GROQ_API_KEY` is required** — the rest unlock extra job sources or tune behavior.

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `GROQ_API_KEY` | ✅ | Groq API key — powers every AI feature. |
| `RAPIDAPI_KEY` | — | Enables the **JSearch** boards (LinkedIn / Indeed / Glassdoor listings). Free tier at [rapidapi.com/…/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch). |
| `ADZUNA_APP_ID` | — | Enables the **Adzuna India** board. Free at [developer.adzuna.com](https://developer.adzuna.com/signup). |
| `ADZUNA_APP_KEY` | — | Adzuna application key (pairs with the ID above). |
| `FEED_REFRESH_MINUTES` | — | How often to refresh the job feed. Default `30`. |
| `MAX_INTERVIEW_QUESTIONS` | — | Number of questions in a mock interview. Default `8`. |

> ⚠️ **Never commit `.env`.** It's gitignored. If a key ever lands in git history, rotate it and scrub the history before pushing.

## Job board sources

Boards are configured in `placementos/data/boards.json`. Keyless boards work out of the box; the rest activate when their keys are set.

| Board | Type | Needs key? |
|-------|------|:----------:|
| We Work Remotely, RemoteOK, Remotive, Himalayas, Working Nomads | RSS / JSON | No |
| Adzuna India | JSON API | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` |
| JSearch (India + Remote) | JSON API | `RAPIDAPI_KEY` |

Each listing is tagged with a **work type** (remote / hybrid / onsite) and an **eligibility** flag (green = open to you / India-friendly, red = region-locked).

## API overview

All routes are registered in `main.py`. Streaming endpoints use Server-Sent Events.

| Route | Method | Purpose |
|-------|--------|---------|
| `/jobs`, `/jobs/refresh` | GET / POST | List (filterable) & force-refresh the feed |
| `/scout`, `/scout/digest` | POST | AI job search & resume-matched digest |
| `/interview`, `/interview/gap` | POST | Mock interview stream & gap analysis |
| `/resume/tailor`, `/resume/ats`, `/resume/match`, `/parse-resume` | POST | Tailor, ATS scan, skill extraction, PDF parse |
| `/coach` | POST | Full application package (streamed) |
| `/outreach` | POST | Cold outreach message |
| `/code/problems`, `/code/evaluate`, `/code/hint` | GET / POST | Coding practice |
| `/career/roadmap` | POST | Generate a domain roadmap |
| `/chat` | POST | AI career chat (streamed) |

Interactive docs are available at `http://127.0.0.1:8000/docs` when the server is running.

## Running tests

```bash
cd placementos
python -m pytest -q
```

## Production build

The frontend builds directly into the backend's `static_react/` directory, and FastAPI serves it with an SPA fallback — so in production you run **only the backend**.

```bash
cd frontend && npm run build        # outputs to ../placementos/static_react/
cd ../placementos
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# app now served at http://localhost:8000
```

## Design notes & caveats

- **Browser-local state.** Resume, tracker, and career-track data live in `localStorage` — they persist per-browser but do **not** sync across devices. The Tracker's CSV export is the only backup.
- **No accounts.** There's no login or multi-user separation; it's a single-user tool.
- **Free-tier friendly.** Groq's free tier and the free Adzuna / JSearch tiers are enough to run everything; the feed refresh is throttled to stay within rate limits.
- **Voice features** (mock interview) rely on the browser's Web Speech API — best supported in Chromium-based browsers.

---

Built with FastAPI + React, powered by Groq.
