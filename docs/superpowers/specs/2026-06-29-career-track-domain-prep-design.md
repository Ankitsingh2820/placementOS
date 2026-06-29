# Career Track (Domain Prep) — Design

**Date:** 2026-06-29
**Status:** Approved design, pending implementation plan

## Problem

Every feature in PlacementOS today is **job-posting–centric**: the user starts
from a specific opening (Jobs feed), then tailors a resume, runs a mock
interview against that JD, or practices code problems tied to that job. There
is no path for someone who wants to prepare for a **domain/role** in general —
e.g. "I want to become a Data Analyst" — independent of any single posting.

## Goal

Add a **role-first** entry point: the user picks a domain, the app generates a
**structured, multi-step roadmap**, and each step hands off into the tools that
already exist (Code, Interview, Coach, Chat), pre-loaded for that domain.
Progress is tracked so the roadmap becomes a guided journey.

## Non-goals (YAGNI)

- No new learning content engine (no in-app lessons, quizzes, or flashcards
  authored by AI). Steps reuse existing tools; they do not teach new material
  in-app beyond what Chat already does.
- No backend database or user accounts. State stays in `localStorage`,
  consistent with the existing job tracker.
- No automatic completion detection from inside the tools. Completion is a
  manual per-step check-off.
- No curated/hand-authored roadmaps. Roadmaps are AI-generated for any domain.

## Key architectural insight

Every existing tool is driven by the same shape — a job object
`{title, company, description}` plus the user's resume:

- **Code** — `GET /code/problems?job_title=&job_company=&job_description=`
  already generates problems from a job.
- **Interview** — `POST /interview` takes `resume`, `jd`, `history`.
- **Coach** — `POST /coach` takes `resume`, `job` dict.

Therefore a **domain becomes a synthetic job object**: the AI produces a
`role_profile` (a representative JD/role summary for the domain + level), which
is shaped exactly like the `job` the existing endpoints already consume. No
changes to those tools' core contracts are required — integration is
"generate the role object + deep-link into the tool."

## User flow

1. **Pick a track** (`/career`, empty state):
   - Suggested domain chips: Frontend Developer, Backend Engineer, Data
     Analyst, Data Scientist, ML Engineer, DevOps Engineer, Product Manager
     (extensible list).
   - Free-text input for any other domain.
   - Experience level select: Fresher / 0–2 yrs / Mid.
   - Optional resume paste (stored once, reused by interview/coach steps).
2. **Generate roadmap:** `POST /career/roadmap` with `{domain, level, resume?}`
   → AI returns `role_profile` + ordered `modules[].steps[]`.
3. **Roadmap view** (`/career`, with active track): a vertical journey of
   modules, each containing steps. Each step shows a title, a short
   description, a **Start** button (deep-links into the matching tool
   pre-loaded for the domain), and a **completion checkbox**. A **readiness
   ring** shows `completed / total` as a percentage.
4. **Resume/continue:** returning to `/career` restores the saved track,
   roadmap, and progress from `localStorage`.
5. **Switch/reset track:** user can start a new track (replaces the stored
   one after a confirm).

## Data model

### Roadmap (returned by the API, stored in localStorage)

```json
{
  "domain": "Data Analyst",
  "level": "Fresher",
  "role_profile": {
    "title": "Data Analyst",
    "company": "",
    "description": "<AI-written representative JD / role summary used to drive existing tools>"
  },
  "modules": [
    {
      "id": "m1",
      "title": "Core Foundations",
      "steps": [
        {
          "id": "m1s1",
          "title": "Practice SQL fundamentals",
          "description": "Solve 5 SQL problems on joins and aggregation.",
          "tool": "code",
          "config": { "focus": "SQL joins and aggregation" }
        },
        {
          "id": "m1s2",
          "title": "Learn descriptive statistics",
          "description": "Cover mean/median/variance and when to use each.",
          "tool": "chat",
          "config": { "prompt": "Teach me descriptive statistics for data analyst interviews" }
        }
      ]
    }
  ]
}
```

### Step `tool` values and how each is pre-loaded

| `tool`     | Existing target            | Pre-loaded with                                              |
|------------|----------------------------|-------------------------------------------------------------|
| `code`     | Code page / `/code/problems` | `role_profile` as job + `config.focus` as topic hint        |
| `interview`| Interview page / `/interview`| synthetic `jd` from `role_profile` + stored resume          |
| `coach`    | Coach page / `/coach`        | synthetic `job` from `role_profile` + stored resume         |
| `chat`     | Chat page / `/chat`          | `config.prompt` seeded into the chat input                  |

The AI is constrained to emit only these four `tool` values so every step is
launchable.

### Persistence (localStorage)

Key: `placements_career`

```json
{
  "domain": "Data Analyst",
  "level": "Fresher",
  "resume": "<optional pasted resume text>",
  "roadmap": { /* roadmap object above */ },
  "completedSteps": ["m1s1"]
}
```

Mirrors the existing `useTracker` hook pattern (`placements_tracker`).

## Components / files

### Backend (new)

- `placementos/routers/career.py`
  - `POST /career/roadmap` — body `{domain: str, level: str, resume: str = ""}`;
    returns the roadmap JSON. Delegates to the service.
- `placementos/services/career.py`
  - `generate_roadmap(domain, level, resume)` — Groq call with a structured
    prompt that returns valid roadmap JSON (`role_profile` + `modules` +
    `steps`, each `step.tool` in the allowed set). Parses/validates the JSON
    and returns it. Follows the existing `services/agents.py` /
    `services/claude.py` Groq usage patterns.
- Register the router in `placementos/main.py` (alongside existing routers).
- Add `/career` to the Vite dev proxy in `frontend/vite.config.js`.

### Frontend (new)

- `frontend/src/components/career/CareerPage.jsx` — top-level page; shows the
  **track picker** empty state or the **roadmap view** depending on stored
  state.
- `frontend/src/components/career/TrackPicker.jsx` — domain chips + free-text +
  level select + optional resume; triggers roadmap generation.
- `frontend/src/components/career/RoadmapView.jsx` — modules/steps checklist,
  readiness ring, Start + check-off interactions, switch-track control.
- `frontend/src/hooks/useCareer.js` — localStorage persistence and progress
  API (`setTrack`, `toggleStep`, `resetTrack`, derived `readiness`), mirroring
  `useTracker.js`.
- Routing: add `/career` route in `frontend/src/App.jsx` and a sidebar entry
  in `frontend/src/components/layout/Sidebar.jsx`.

### Deep-link / hand-off mechanism

Each Start button navigates to the existing tool route and passes the
pre-load payload. Two viable mechanisms (to be finalized in the plan):

- **Query params / router state** — e.g. `navigate('/code', { state: { job, focus } })`,
  and the target page reads `location.state` on mount to pre-fill.
- **Shared context** — extend an existing context (like `InterviewContext`) or
  add a lightweight `CareerHandoffContext` that the target pages read.

Recommended default: **router `state`** (no global wiring, decoupled, matches
react-router idioms already in use). The target pages get a small additive
change: "if a pre-load payload is present, use it."

## Error handling

- **AI returns malformed JSON:** the service validates the parsed roadmap
  (required keys, non-empty `modules`, each `step.tool` in the allowed set). On
  failure, retry once; if still invalid, return a 502-style error and the UI
  shows a "Couldn't build your roadmap, try again" state with a retry button.
- **Empty/blank domain:** the picker disables Generate until a domain is
  provided.
- **No resume on interview/coach steps:** those steps still launch; the target
  tool handles an empty resume as it does today, and the UI hints that adding a
  resume improves results.
- **localStorage parse failure:** `useCareer` falls back to empty state
  (same guard as `useTracker`).

## Testing

- **Backend:** unit tests for `services/career.py` roadmap validation (valid
  payload passes; malformed/empty/invalid-tool payloads are rejected;
  retry-then-fail path returns an error). A router test for `POST
  /career/roadmap` (mocked Groq) asserting the response shape. Follows the
  existing `placementos/tests` patterns.
- **Frontend:** `useCareer` hook behavior (set track, toggle step persists to
  localStorage, readiness derivation, reset). Component smoke test that
  TrackPicker triggers generation and RoadmapView renders modules/steps and
  marks completion.

## Reuse summary

- Existing Code/Interview/Coach/Chat tools: **unchanged contracts**, only a
  small additive "accept a pre-load payload" on the target pages.
- Persistence pattern: reuses the `useTracker` localStorage approach.
- Groq integration: reuses `services/claude.py` / `services/agents.py`
  patterns.
- The only net-new logic is roadmap generation + the career UI shell.
