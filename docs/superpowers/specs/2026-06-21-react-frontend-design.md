# Design: React Frontend for PlacementOS

**Date:** 2026-06-21  
**Status:** Approved  
**Scope:** Replace vanilla HTML/CSS/JS frontend with React + Vite + Tailwind CSS + shadcn/ui

---

## 1. Goal

Rebuild the PlacementOS frontend in React with a blue/mint design system and sidebar navigation. The FastAPI backend is unchanged — only the `static/` folder is replaced by a compiled React app.

---

## 2. Color System

| Token | Value | Usage |
|---|---|---|
| Primary blue | `#2563EB` (blue-600) | Buttons, active sidebar item, links, focus rings |
| Mint | `#10B981` (emerald-500) | Apply button, match badges, success states, accents |
| Sidebar bg | `#0F172A` (slate-900) | Left sidebar background |
| Sidebar text | `#94A3B8` (slate-400) | Inactive nav items |
| Page bg | `#F8FAFC` (slate-50) | Main content area |
| Card bg | `#FFFFFF` | Job cards, panels |
| Card border | `#E2E8F0` (slate-200) | Card and panel borders |
| Text primary | `#0F172A` (slate-900) | Headings, labels |
| Text muted | `#64748B` (slate-500) | Secondary text, timestamps |

---

## 3. Architecture

```
placement help/
├── frontend/                    ← NEW: Vite + React app
│   ├── index.html
│   ├── vite.config.js           # proxies /jobs /interview /outreach /resume/* → :8000
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Router + layout shell (Sidebar + <Outlet>)
│       ├── lib/
│       │   └── api.js           # fetch wrappers for all backend endpoints
│       ├── hooks/
│       │   ├── useJobs.js       # fetch, filter, match score logic
│       │   ├── useInterview.js  # SSE stream, Web Speech API
│       │   └── useTracker.js    # localStorage CRUD
│       └── components/
│           ├── layout/
│           │   └── Sidebar.jsx
│           ├── jobs/
│           │   ├── JobsPage.jsx
│           │   ├── JobCard.jsx
│           │   ├── JobFilters.jsx
│           │   └── ResumeMatch.jsx
│           ├── interview/
│           │   ├── InterviewPage.jsx
│           │   ├── IntakeStage.jsx
│           │   ├── SessionStage.jsx
│           │   └── ScorecardStage.jsx
│           └── tracker/
│               └── TrackerPage.jsx
└── placementos/                 ← UNCHANGED: FastAPI backend
```

---

## 4. Routing

React Router v6. Three routes served by a single layout:

| Path | Component | Description |
|---|---|---|
| `/` | `JobsPage` | Job feed with filters and resume match panel |
| `/interview` | `InterviewPage` | Intake → Session → Scorecard stages |
| `/tracker` | `TrackerPage` | localStorage-backed application table |

Sidebar highlights the active route with a blue-600 left border and white text.

---

## 5. Component Breakdown

### `App.jsx`
- Wraps all routes in a two-column layout: fixed sidebar (240px) + scrollable main content
- Provides `InterviewContext` (currentJob, resumeText) via React Context

### `Sidebar.jsx`
- Dark slate-900 background, full height
- Logo + tagline at top
- Nav items with active state (blue-600 accent bar + white text, inactive = slate-400)
- Items: Jobs, Interview Prep, Tracker

### `JobsPage.jsx`
- Composes `JobFilters`, `ResumeMatch`, and a grid of `JobCard`
- Fetches `/jobs` on mount via `useJobs` hook
- Re-renders grid when filters or match scores change

### `JobFilters.jsx`
- Search input, eligibility dropdown, source dropdown, work-type dropdown, Refresh button
- All controlled inputs — calls `useJobs` filter functions on change

### `JobCard.jsx`
- White card, slate-200 border, hover shadow
- Badges: eligibility (green/yellow/red), source (blue), work type (mint/amber/slate), match % (blue gradient)
- Strong match (≥60%): mint-green left border highlight
- Buttons: **Prep for this role** (blue-600), **Apply Now** (mint), **Save** (slate)

### `ResumeMatch.jsx`
- Collapsible panel above job grid (collapsed by default)
- PDF upload input + textarea for paste
- On submit: POST `/resume/match` → extract skills → score all jobs → re-sort grid
- Status line: "12 skills found · 34 jobs matched"
- Clear button resets scores

### `InterviewPage.jsx`
- Controls which stage is visible: intake / session / scorecard
- Passes `currentJob` from context into intake form

### `IntakeStage.jsx`
- Resume textarea (with PDF upload button → `/parse-resume`)
- JD textarea (pre-filled when navigating from a job card)
- GitHub URL input
- Start button

### `SessionStage.jsx`
- Question display (blue-600 left border accent)
- Live transcript box
- Record / Done Answering / End Session buttons
- Progress bar (mint fill)
- Uses `useInterview` hook for SSE + Web Speech API

### `ScorecardStage.jsx`
- Overall score grid (5 dimensions)
- Per-answer breakdown cards (weakest answer highlighted in amber)
- Rewritten answer panel
- Outreach message textarea (fetched from `/outreach`)
- Add to Tracker + Start New Session buttons

### `TrackerPage.jsx`
- Table with status dropdowns, follow-up date pickers, Remove buttons
- Export CSV button
- Uses `useTracker` hook (localStorage)

---

## 6. Data Flow

```
useJobs hook
  └─ fetch /jobs on mount → state.jobs
  └─ filterJobs() → filtered list (client-side)
  └─ matchResume() → POST /resume/match → state.matchScores → re-sort

useInterview hook
  └─ askNext() → POST /interview → SSE stream → append to history
  └─ startListening() / stopListening() → Web Speech API
  └─ endSession() → triggers scorecard

useTracker hook
  └─ getRows() / addRow() / updateRow() / deleteRow() → localStorage
  └─ exportCSV() → Blob download
```

---

## 7. Dev Setup

```bash
# Terminal 1 — backend
cd placementos
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

Vite config proxies all API paths to `http://localhost:8000`:
```js
proxy: {
  '/jobs': 'http://localhost:8000',
  '/interview': 'http://localhost:8000',
  '/outreach': 'http://localhost:8000',
  '/resume': 'http://localhost:8000',
  '/parse-resume': 'http://localhost:8000',
}
```

---

## 8. Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist/
```

FastAPI updated to serve `frontend/dist/` as static files and `index.html` as the catch-all for React Router.

---

## 9. What Is NOT Changing

- All FastAPI routes and logic
- Groq integration
- Feed service and board configs
- Tests (all 15 remain)
- `.env` and environment variables
- Docker setup (Dockerfile updated to include frontend build step)
