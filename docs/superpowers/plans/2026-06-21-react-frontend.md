# PlacementOS React Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vanilla HTML/CSS/JS frontend with a React 18 + Vite + Tailwind CSS app using a blue/mint design system and sidebar navigation, without touching the FastAPI backend.

**Architecture:** A `frontend/` directory at the project root contains the Vite + React app. During development, Vite (port 5173) proxies all API calls to FastAPI (port 8000). Production: `npm run build` → FastAPI serves `frontend/dist/`.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, React Router DOM 6, lucide-react, clsx, tailwind-merge

## Global Constraints

- All frontend commands run from `C:\Users\HP\OneDrive\Desktop\placement help\frontend\`
- No TypeScript — plain `.jsx` files only
- Primary blue: `#2563EB` | Mint: `#10B981` | Sidebar bg: `#0F172A`
- No shadcn/ui CLI — Tailwind utility classes only
- All API calls go through Vite proxy — never hardcode `localhost:8000`
- Backend (`placementos/`) unchanged until Task 9
- React Router: exact `path="/"` for Jobs, `/interview`, `/tracker`

---

## File Map

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx
    ├── lib/
    │   ├── api.js
    │   └── utils.js
    ├── context/
    │   └── InterviewContext.jsx
    ├── hooks/
    │   ├── useJobs.js
    │   ├── useInterview.js
    │   └── useTracker.js
    └── components/
        ├── layout/
        │   └── Sidebar.jsx
        ├── jobs/
        │   ├── JobsPage.jsx
        │   ├── JobFilters.jsx
        │   ├── JobCard.jsx
        │   └── ResumeMatch.jsx
        ├── interview/
        │   ├── InterviewPage.jsx
        │   ├── IntakeStage.jsx
        │   ├── SessionStage.jsx
        │   └── ScorecardStage.jsx
        └── tracker/
            └── TrackerPage.jsx
```

---

## Task 1: Vite + React + Tailwind Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/lib/utils.js`

- [ ] **Step 1: Verify Node.js is available**

```bash
node -v
npm -v
```

Expected: node v18+ and npm v9+. If missing, install from nodejs.org.

- [ ] **Step 2: Create `frontend/package.json`**

```json
{
  "name": "placementos-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "lucide-react": "^0.441.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.12",
    "tailwindcss-animate": "^1.0.7",
    "vite": "^5.4.8"
  }
}
```

- [ ] **Step 3: Create `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/jobs':        'http://localhost:8000',
      '/interview':   'http://localhost:8000',
      '/outreach':    'http://localhost:8000',
      '/resume':      'http://localhost:8000',
      '/parse-resume':'http://localhost:8000',
    },
  },
  build: {
    outDir: '../placementos/static_react',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 4: Create `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
        mint:    { DEFAULT: '#10B981', hover: '#059669' },
        sidebar: '#0F172A',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Create `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PlacementOS — Find it. Prep for it. Get it.</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
```

- [ ] **Step 9: Create `frontend/src/lib/utils.js`**

```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 10: Create a placeholder `frontend/src/App.jsx` to verify the build**

```jsx
export default function App() {
  return <div className="p-8 text-2xl font-bold text-blue-600">PlacementOS loading...</div>
}
```

- [ ] **Step 11: Install dependencies and start dev server**

```bash
cd frontend
npm install
npm run dev
```

Expected: Vite starts at http://localhost:5173 showing "PlacementOS loading..." in blue.

- [ ] **Step 12: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Vite + React + Tailwind frontend"
```

---

## Task 2: API Layer + Context

**Files:**
- Create: `frontend/src/lib/api.js`
- Create: `frontend/src/context/InterviewContext.jsx`

**Interfaces:**
- Produces: `fetchJobs()`, `matchResume(text)`, `parseResumePDF(file)`, `streamInterview({resume,jd,history,action,questionsAsked})`, `generateOutreach({resume,company,role,github})`
- Produces: `InterviewProvider`, `useInterviewContext()` → `{ currentJob, setCurrentJob, resumeText, setResumeText, githubUrl, setGithubUrl }`

- [ ] **Step 1: Create `frontend/src/lib/api.js`**

```js
export async function fetchJobs() {
  const r = await fetch('/jobs')
  if (!r.ok) throw new Error('Failed to fetch jobs')
  return r.json()
}

export async function matchResume(resume) {
  const r = await fetch('/resume/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume }),
  })
  if (!r.ok) throw new Error('Failed to match resume')
  return r.json()
}

export async function parseResumePDF(file) {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch('/parse-resume', { method: 'POST', body: form })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.detail || 'Failed to parse PDF')
  }
  return r.json()
}

export async function* streamInterview({ resume, jd, history, action, questionsAsked }) {
  const r = await fetch('/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd, history, action, questions_asked: questionsAsked }),
  })
  if (!r.ok) throw new Error('Interview request failed')
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try { yield JSON.parse(line.slice(6)) } catch {}
    }
  }
}

export async function generateOutreach({ resume, company, role, github }) {
  const r = await fetch('/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, company, role, github }),
  })
  if (!r.ok) throw new Error('Failed to generate outreach')
  return r.json()
}
```

- [ ] **Step 2: Create `frontend/src/context/InterviewContext.jsx`**

```jsx
import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')

  return (
    <InterviewContext.Provider value={{ currentJob, setCurrentJob, resumeText, setResumeText, githubUrl, setGithubUrl }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterviewContext = () => useContext(InterviewContext)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ frontend/src/context/
git commit -m "feat: API layer and interview context"
```

---

## Task 3: Hooks

**Files:**
- Create: `frontend/src/hooks/useJobs.js`
- Create: `frontend/src/hooks/useInterview.js`
- Create: `frontend/src/hooks/useTracker.js`

- [ ] **Step 1: Create `frontend/src/hooks/useJobs.js`**

```js
import { useState, useMemo, useCallback, useEffect } from 'react'
import { fetchJobs, matchResume as apiMatch } from '../lib/api'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ q: '', eligibility: '', source: '', workType: '' })
  const [matchScores, setMatchScores] = useState({})
  const [matchStatus, setMatchStatus] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    try { setJobs(await fetchJobs()) }
    catch { setJobs([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase()
    let result = jobs
    if (q) result = result.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.tags || []).some(t => t.toLowerCase().includes(q))
    )
    if (filters.eligibility) result = result.filter(j => j.eligibility === filters.eligibility)
    if (filters.source)      result = result.filter(j => j.source === filters.source)
    if (filters.workType)    result = result.filter(j => j.work_type === filters.workType)
    if (Object.keys(matchScores).length)
      result = [...result].sort((a, b) => (matchScores[b.id] || 0) - (matchScores[a.id] || 0))
    return result
  }, [jobs, filters, matchScores])

  const matchResume = useCallback(async (resumeText) => {
    setMatchStatus('Analysing resume...')
    try {
      const data = await apiMatch(resumeText)
      const skills = (data.skills || []).map(s => s.toLowerCase())
      const scores = {}
      for (const j of jobs) {
        const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.description || ''}`.toLowerCase()
        const hits = skills.filter(s => hay.includes(s)).length
        scores[j.id] = skills.length ? Math.round((hits / skills.length) * 100) : 0
      }
      setMatchScores(scores)
      const matched = Object.values(scores).filter(s => s > 0).length
      setMatchStatus(`${skills.length} skills found · ${matched} jobs matched`)
    } catch {
      setMatchStatus('Could not analyse resume. Try again.')
    }
  }, [jobs])

  const clearMatch = useCallback(() => {
    setMatchScores({})
    setMatchStatus('')
  }, [])

  return { jobs: filtered, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch }
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useInterview.js`**

```js
import { useState, useRef, useCallback } from 'react'
import { streamInterview, generateOutreach } from '../lib/api'

const SCORECARD_RE = /<scorecard>([\s\S]*?)<\/scorecard>/

export function useInterview() {
  const [stage, setStage] = useState('intake')
  const [history, setHistory] = useState([])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [question, setQuestion] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [scorecard, setScorecard] = useState(null)
  const [outreachMessage, setOutreachMessage] = useState('')

  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const historyRef = useRef([])
  const qAskedRef = useRef(0)

  const askNext = useCallback(async ({ resume, jd, action }) => {
    setLoadingQuestion(true)
    setQuestion('')
    let fullText = ''
    try {
      for await (const payload of streamInterview({
        resume, jd,
        history: historyRef.current,
        action,
        questionsAsked: qAskedRef.current,
      })) {
        if (payload.done) break
        if (payload.text) { fullText += payload.text; setQuestion(fullText) }
      }
    } finally { setLoadingQuestion(false) }

    const match = fullText.match(SCORECARD_RE)
    if (match) {
      try { setScorecard(JSON.parse(match[1])); setStage('scorecard') } catch {}
      return
    }

    historyRef.current = [...historyRef.current, { role: 'assistant', content: fullText }]
    setHistory([...historyRef.current])
    qAskedRef.current += 1
    setQuestionsAsked(qAskedRef.current)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(fullText))
    }
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'
    recognitionRef.current = recog
    transcriptRef.current = ''

    recog.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      transcriptRef.current += final
      setTranscript((transcriptRef.current + interim).trim())
    }
    recog.onstart = () => setIsListening(true)
    recog.onend   = () => setIsListening(false)
    recog.start()
    return true
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    return transcriptRef.current.trim()
  }, [])

  const submitAnswer = useCallback(({ resume, jd }) => {
    const answer = stopListening()
    if (!answer) return false
    historyRef.current = [...historyRef.current, { role: 'user', content: answer }]
    setHistory([...historyRef.current])
    setTranscript('')
    transcriptRef.current = ''
    askNext({ resume, jd, action: qAskedRef.current >= 8 ? 'end' : 'next' })
    return true
  }, [stopListening, askNext])

  const fetchOutreach = useCallback(async ({ resume, company, role, github }) => {
    try {
      const data = await generateOutreach({ resume, company, role, github })
      setOutreachMessage(data.message)
    } catch { setOutreachMessage('') }
  }, [])

  const reset = useCallback(() => {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    historyRef.current = []
    qAskedRef.current = 0
    setStage('intake'); setHistory([]); setQuestionsAsked(0)
    setQuestion(''); setTranscript(''); setIsListening(false)
    setLoadingQuestion(false); setScorecard(null); setOutreachMessage('')
  }, [])

  return {
    stage, setStage,
    history, questionsAsked,
    question, transcript,
    isListening, loadingQuestion,
    scorecard, outreachMessage, setOutreachMessage,
    askNext, startListening, stopListening, submitAnswer, fetchOutreach, reset,
  }
}
```

- [ ] **Step 3: Create `frontend/src/hooks/useTracker.js`**

```js
import { useState, useCallback } from 'react'

const KEY = 'placements_tracker'
export const STATUSES = ['Saved', 'Applied', 'Outreach sent', 'Replied', 'Interview', 'Offer', 'Rejected']

export function useTracker() {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  const persist = useCallback((next) => {
    setRows(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }, [])

  const addRow = useCallback((job, prepScore = '') => {
    if (rows.find(r => r.url === job.url && job.url)) return false
    persist([{
      id: Date.now().toString(),
      company: job.company || '', role: job.title || '',
      source: job.source || '', url: job.url || '',
      date_applied: new Date().toISOString().slice(0, 10),
      prep_score: prepScore, status: 'Saved', followup_date: '',
    }, ...rows])
    return true
  }, [rows, persist])

  const updateRow = useCallback((id, patch) => {
    persist(rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [rows, persist])

  const deleteRow = useCallback((id) => persist(rows.filter(r => r.id !== id)), [rows, persist])

  const exportCSV = useCallback(() => {
    const headers = ['Company', 'Role', 'Source', 'Date Applied', 'Prep Score', 'Status', 'Follow-up', 'URL']
    const lines = [headers.join(','), ...rows.map(r =>
      [r.company, r.role, r.source, r.date_applied, r.prep_score, r.status, r.followup_date, r.url]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    )]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `placements-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }, [rows])

  return { rows, addRow, updateRow, deleteRow, exportCSV }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/ frontend/src/context/
git commit -m "feat: useJobs, useInterview, useTracker hooks + context"
```

---

## Task 4: Layout — App + Sidebar

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Create `frontend/src/components/layout/Sidebar.jsx`**

```jsx
import { NavLink } from 'react-router-dom'
import { Briefcase, Mic2, LayoutList } from 'lucide-react'

const nav = [
  { to: '/',          icon: Briefcase,  label: 'Jobs',          end: true },
  { to: '/interview', icon: Mic2,       label: 'Interview Prep', end: false },
  { to: '/tracker',   icon: LayoutList, label: 'Tracker',        end: false },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-sidebar flex flex-col h-screen shrink-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-white font-bold text-base tracking-tight">PlacementOS</p>
        <p className="text-slate-500 text-xs mt-0.5">Find it → Prep → Get it</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">Powered by Groq llama-3.3-70b</p>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Rewrite `frontend/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { InterviewProvider } from './context/InterviewContext'
import { Sidebar } from './components/layout/Sidebar'
import { JobsPage } from './components/jobs/JobsPage'
import { InterviewPage } from './components/interview/InterviewPage'
import { TrackerPage } from './components/tracker/TrackerPage'

export default function App() {
  return (
    <BrowserRouter>
      <InterviewProvider>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/"          element={<JobsPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/tracker"   element={<TrackerPage />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </InterviewProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Create placeholder pages so the app compiles**

Create `frontend/src/components/jobs/JobsPage.jsx`:
```jsx
export function JobsPage() { return <div className="p-8 text-slate-600">Jobs loading...</div> }
```

Create `frontend/src/components/interview/InterviewPage.jsx`:
```jsx
export function InterviewPage() { return <div className="p-8 text-slate-600">Interview Prep</div> }
```

Create `frontend/src/components/tracker/TrackerPage.jsx`:
```jsx
export function TrackerPage() { return <div className="p-8 text-slate-600">Tracker</div> }
```

- [ ] **Step 4: Verify in browser**

```bash
cd frontend && npm run dev
```

Open http://localhost:5173. Expect: dark sidebar with three nav items, clicking each switches the placeholder text. Active item is highlighted in blue-600.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: layout shell with React Router + sidebar nav"
```

---

## Task 5: Jobs Page — Feed, Filters, Cards

**Files:**
- Modify: `frontend/src/components/jobs/JobsPage.jsx`
- Create: `frontend/src/components/jobs/JobFilters.jsx`
- Create: `frontend/src/components/jobs/JobCard.jsx`

- [ ] **Step 1: Create `frontend/src/components/jobs/JobCard.jsx`**

```jsx
import { useInterviewContext } from '../../context/InterviewContext'
import { useNavigate } from 'react-router-dom'

const eligConfig = {
  green:  { label: 'Worldwide',      cls: 'bg-emerald-100 text-emerald-800' },
  yellow: { label: 'Check timezone', cls: 'bg-amber-100 text-amber-800'    },
  red:    { label: 'Region-locked',  cls: 'bg-red-100 text-red-800'        },
}
const wtConfig = {
  remote: { label: 'Remote', cls: 'bg-blue-100 text-blue-700'     },
  hybrid: { label: 'Hybrid', cls: 'bg-orange-100 text-orange-700' },
  onsite: { label: 'Onsite', cls: 'bg-slate-100 text-slate-600'   },
}

export function JobCard({ job, matchScore, onSave }) {
  const { setCurrentJob, resumeText } = useInterviewContext()
  const navigate = useNavigate()
  const elig = eligConfig[job.eligibility] || eligConfig.green
  const wt   = wtConfig[job.work_type]    || wtConfig.remote

  function handlePrep() {
    setCurrentJob(job)
    navigate('/interview')
  }

  return (
    <div className={`bg-white rounded-xl border flex flex-col gap-3 p-4 hover:shadow-md transition-all ${
      matchScore >= 60 ? 'border-primary/40 shadow-sm shadow-primary/10' : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate">{job.title}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{job.company}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${elig.cls}`}>{elig.label}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{job.source}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wt.cls}`}>{wt.label}</span>
        {matchScore > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            matchScore >= 60 ? 'bg-primary text-white' :
            matchScore >= 30 ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-500'
          }`}>{matchScore}% match</span>
        )}
        {job.posted_at && <span className="text-xs text-slate-400">{job.posted_at.slice(0,10)}</span>}
      </div>

      {/* Tags */}
      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.tags.map(t => (
            <span key={t} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}

      {/* Salary */}
      {job.salary && <p className="text-sm font-semibold text-mint">{job.salary}</p>}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button onClick={handlePrep}
          className="flex-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-lg transition-colors">
          Prep for this role
        </button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold bg-mint hover:bg-mint-hover text-white px-3 py-2 rounded-lg transition-colors">
            Apply Now
          </a>
        )}
        <button onClick={() => onSave(job)}
          className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors">
          Save
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/jobs/JobFilters.jsx`**

```jsx
export function JobFilters({ filters, setFilters, onRefresh }) {
  const set = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  const inputCls = 'bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="flex flex-wrap gap-3 items-center mb-5">
      <input
        type="text" placeholder="Search title, company, stack..."
        value={filters.q} onChange={set('q')}
        className={`${inputCls} flex-1 min-w-48`}
      />
      <select value={filters.eligibility} onChange={set('eligibility')} className={inputCls}>
        <option value="">All eligibility</option>
        <option value="green">Worldwide</option>
        <option value="yellow">Check timezone</option>
      </select>
      <select value={filters.source} onChange={set('source')} className={inputCls}>
        <option value="">All boards</option>
        {['WWR','RemoteOK','Remotive','Himalayas','JSearch','Adzuna'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select value={filters.workType} onChange={set('workType')} className={inputCls}>
        <option value="">Remote &amp; Onsite</option>
        <option value="remote">Remote only</option>
        <option value="hybrid">Hybrid</option>
        <option value="onsite">Onsite only</option>
      </select>
      <button onClick={onRefresh}
        className="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
        Refresh
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `frontend/src/components/jobs/JobsPage.jsx`**

```jsx
import { useJobs } from '../../hooks/useJobs'
import { useTracker } from '../../hooks/useTracker'
import { JobFilters } from './JobFilters'
import { JobCard } from './JobCard'
import { ResumeMatch } from './ResumeMatch'

export function JobsPage() {
  const { jobs, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch } = useJobs()
  const { addRow } = useTracker()

  function handleSave(job) {
    const added = addRow(job)
    // visual feedback via title flicker — simple approach
    if (!added) alert('Already in tracker.')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Remote Jobs</h2>
        <p className="text-slate-500 text-sm mt-0.5">India-friendly listings from top remote boards</p>
      </div>

      <JobFilters filters={filters} setFilters={setFilters} onRefresh={refetch} />
      <ResumeMatch matchStatus={matchStatus} onMatch={matchResume} onClear={clearMatch} />

      {loading && (
        <div className="text-center py-20 text-slate-400">Loading jobs...</div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="font-semibold">No jobs match your filters.</p>
          <p className="text-sm mt-1">Try adjusting your search or click Refresh.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              matchScore={matchScores[job.id] || 0}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:5173. Jobs tab should show a grid of cards fetched from the backend (ensure FastAPI is running on port 8000). Cards should show eligibility, source, work-type badges and Apply Now / Prep buttons.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/jobs/
git commit -m "feat: job feed page with cards, filters, badges"
```

---

## Task 6: Resume Match Panel

**Files:**
- Create: `frontend/src/components/jobs/ResumeMatch.jsx`

- [ ] **Step 1: Create `frontend/src/components/jobs/ResumeMatch.jsx`**

```jsx
import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react'
import { parseResumePDF } from '../../lib/api'

export function ResumeMatch({ matchStatus, onMatch, onClear }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fileStatus, setFileStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing PDF...')
    try {
      const data = await parseResumePDF(file)
      setText(data.text)
      setFileStatus(`Loaded "${file.name}" (${data.text.split(/\s+/).length} words)`)
    } catch (err) {
      setFileStatus(err.message || 'Could not parse PDF.')
    }
    e.target.value = ''
  }

  async function handleMatch() {
    if (!text.trim()) { alert('Paste your resume or upload a PDF first.'); return }
    setLoading(true)
    await onMatch(text)
    setLoading(false)
  }

  const hasMatch = !!matchStatus && matchStatus.includes('found')

  return (
    <div className="bg-white border border-slate-200 rounded-xl mb-5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles size={16} className="text-primary" />
          Match jobs to my resume
          {hasMatch && <span className="text-xs font-normal text-slate-500 ml-1">— {matchStatus}</span>}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="flex gap-4 mt-4 flex-wrap">
            {/* PDF upload */}
            <div className="flex flex-col gap-1.5 min-w-44">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upload PDF</label>
              <button onClick={() => fileRef.current?.click()}
                className="text-sm border border-dashed border-slate-300 hover:border-primary hover:text-primary text-slate-500 px-3 py-2 rounded-lg transition-colors text-left">
                Choose file...
              </button>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
              {fileStatus && <p className="text-xs text-slate-500">{fileStatus}</p>}
            </div>

            {/* Paste */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-56">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Or paste resume text</label>
              <textarea
                rows={4}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your resume here..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 items-center mt-4">
            <button onClick={handleMatch} disabled={loading}
              className="text-sm font-semibold bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
              {loading ? 'Analysing...' : 'Find matching jobs'}
            </button>
            {hasMatch && (
              <button onClick={onClear}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <X size={14} /> Clear match
              </button>
            )}
            {matchStatus && !hasMatch && (
              <span className="text-sm text-slate-500">{matchStatus}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Expand the match panel. Upload a PDF or paste resume text. Click "Find matching jobs". Jobs should re-sort with match % badges. "Clear match" resets.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/ResumeMatch.jsx
git commit -m "feat: resume match panel with PDF upload and job scoring"
```

---

## Task 7: Interview — Intake + Session

**Files:**
- Modify: `frontend/src/components/interview/InterviewPage.jsx`
- Create: `frontend/src/components/interview/IntakeStage.jsx`
- Create: `frontend/src/components/interview/SessionStage.jsx`

- [ ] **Step 1: Create `frontend/src/components/interview/IntakeStage.jsx`**

```jsx
import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { parseResumePDF } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

export function IntakeStage({ onStart }) {
  const { resumeText, setResumeText, githubUrl, setGithubUrl, currentJob } = useInterviewContext()
  const [jd, setJd] = useState(
    currentJob ? `${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}` : ''
  )
  const [fileStatus, setFileStatus] = useState('')
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing...')
    try {
      const data = await parseResumePDF(file)
      setResumeText(data.text)
      setFileStatus(`Loaded "${file.name}"`)
    } catch (err) {
      setFileStatus(err.message)
    }
    e.target.value = ''
  }

  function handleStart() {
    if (!resumeText.trim()) { alert('Please paste your resume first.'); return }
    if (!jd.trim()) { alert('Please paste a job description first.'); return }
    onStart({ resume: resumeText, jd, github: githubUrl })
  }

  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'
  const textareaCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-slate-800'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Interview Prep</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentJob ? `Prepping for: ${currentJob.title} at ${currentJob.company}` : 'Paste a job + your resume to start a mock interview'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Resume */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <label className={labelCls}>Your Resume</label>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors">
              <Upload size={13} /> Upload PDF
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </div>
          <textarea rows={10} value={resumeText} onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..." className={textareaCls} />
          {fileStatus && <p className="text-xs text-slate-400 mt-2">{fileStatus}</p>}
        </div>

        {/* JD + GitHub */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Job Description</label>
            <textarea rows={8} value={jd} onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..." className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>GitHub URL (optional)</label>
            <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/yourusername"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button onClick={handleStart}
          className="bg-primary hover:bg-primary-hover text-white font-semibold px-10 py-3 rounded-xl text-base transition-colors shadow-sm shadow-primary/30">
          Start Mock Interview
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/interview/SessionStage.jsx`**

```jsx
import { useEffect } from 'react'
import { Mic, MicOff, CheckCircle, StopCircle } from 'lucide-react'

const MAX_Q = 8

export function SessionStage({ question, transcript, isListening, loadingQuestion, questionsAsked, onListen, onSubmit, onEnd }) {
  const pct = Math.round((questionsAsked / MAX_Q) * 100)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Progress */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mock Interview</h3>
          <span className="text-xs text-slate-400">Question {questionsAsked} of {MAX_Q}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full mb-6">
          <div className="h-full bg-mint rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* Question */}
        <div className="border-l-4 border-primary bg-blue-50 rounded-r-xl px-5 py-4 mb-5 min-h-16">
          {loadingQuestion
            ? <p className="text-slate-400 text-sm animate-pulse">Generating question...</p>
            : <p className="text-slate-800 leading-relaxed">{question || 'Preparing your first question...'}</p>
          }
        </div>

        {/* Transcript */}
        <div className="border border-dashed border-slate-200 rounded-xl px-4 py-3 min-h-20 mb-5 bg-slate-50">
          <p className={`text-sm leading-relaxed ${transcript ? 'text-slate-700' : 'text-slate-400'}`}>
            {transcript || 'Your answer will appear here as you speak...'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center flex-wrap">
          {isListening
            ? <button onClick={onListen}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 font-medium px-4 py-2.5 rounded-lg text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </button>
            : <button onClick={onListen} disabled={loadingQuestion}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                <Mic size={16} /> Start Speaking
              </button>
          }
          <button onClick={onSubmit} disabled={!transcript && !isListening}
            className="flex items-center gap-2 bg-mint hover:bg-mint-hover disabled:opacity-40 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
            <CheckCircle size={16} /> Done Answering
          </button>
          <button onClick={onEnd}
            className="ml-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors">
            <StopCircle size={15} /> End Session
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Tip: Click "Done Answering" when you finish — you will never be cut off.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `frontend/src/components/interview/InterviewPage.jsx`**

```jsx
import { useEffect } from 'react'
import { useInterviewContext } from '../../context/InterviewContext'
import { useInterview } from '../../hooks/useInterview'
import { IntakeStage } from './IntakeStage'
import { SessionStage } from './SessionStage'
import { ScorecardStage } from './ScorecardStage'

export function InterviewPage() {
  const { currentJob, resumeText, githubUrl } = useInterviewContext()
  const iv = useInterview()

  // Store resume+jd for use across callbacks
  const resumeRef = { current: resumeText }

  function handleStart({ resume, jd, github }) {
    resumeRef.current = resume
    iv.setStage('session')
    iv.askNext({ resume, jd, action: 'next' })
    // store for later use in submit/end
    handleStart._resume = resume
    handleStart._jd = jd
    handleStart._github = github
  }

  function handleSubmit() {
    iv.submitAnswer({ resume: handleStart._resume, jd: handleStart._jd })
  }

  function handleEnd() {
    iv.stopListening()
    iv.askNext({ resume: handleStart._resume, jd: handleStart._jd, action: 'end' })
  }

  // Fetch outreach once scorecard arrives
  useEffect(() => {
    if (iv.scorecard && currentJob) {
      iv.fetchOutreach({
        resume: handleStart._resume || resumeText,
        company: currentJob.company,
        role: currentJob.title,
        github: githubUrl,
      })
    }
  }, [iv.scorecard])

  if (iv.stage === 'intake') return <IntakeStage onStart={handleStart} />

  if (iv.stage === 'session') return (
    <SessionStage
      question={iv.question}
      transcript={iv.transcript}
      isListening={iv.isListening}
      loadingQuestion={iv.loadingQuestion}
      questionsAsked={iv.questionsAsked}
      onListen={iv.isListening ? iv.stopListening : iv.startListening}
      onSubmit={handleSubmit}
      onEnd={handleEnd}
    />
  )

  if (iv.stage === 'scorecard') return (
    <ScorecardStage
      scorecard={iv.scorecard}
      outreachMessage={iv.outreachMessage}
      setOutreachMessage={iv.setOutreachMessage}
      currentJob={currentJob}
      onReset={iv.reset}
    />
  )

  return null
}
```

- [ ] **Step 4: Create placeholder `ScorecardStage` so it compiles**

Create `frontend/src/components/interview/ScorecardStage.jsx`:
```jsx
export function ScorecardStage({ scorecard, onReset }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your Scorecard</h2>
        <pre className="text-xs text-slate-500 overflow-auto">{JSON.stringify(scorecard?.overall, null, 2)}</pre>
        <button onClick={onReset} className="mt-6 text-sm text-primary underline">Start New Session</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Navigate to /interview. Ensure intake form pre-fills JD when navigating from a job card. Click Start — first question should appear and be spoken aloud. Speaking should populate the transcript. "Done Answering" should trigger the next question.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/interview/
git commit -m "feat: interview intake + voice session stages"
```

---

## Task 8: Scorecard + Outreach

**Files:**
- Modify: `frontend/src/components/interview/ScorecardStage.jsx`

- [ ] **Step 1: Rewrite `frontend/src/components/interview/ScorecardStage.jsx`**

```jsx
import { useState } from 'react'
import { useTracker } from '../../hooks/useTracker'

const DIMS = ['clarity', 'structure', 'relevance', 'specificity', 'confidence']

export function ScorecardStage({ scorecard, outreachMessage, setOutreachMessage, currentJob, onReset }) {
  const [copied, setCopied] = useState(false)
  const { addRow } = useTracker()

  const overall = scorecard?.overall || {}
  const avgScore = DIMS.reduce((s, d) => s + (overall[d] || 0), 0) / DIMS.length

  function copyOutreach() {
    navigator.clipboard.writeText(outreachMessage).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleAddTracker() {
    if (currentJob) {
      addRow(currentJob, avgScore.toFixed(1))
      alert('Added to tracker!')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Scorecard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Overall: {avgScore.toFixed(1)} / 5</p>
        </div>
        <button onClick={onReset}
          className="text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg transition-colors">
          New Session
        </button>
      </div>

      {/* Overall scores */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Overall</h3>
        <div className="grid grid-cols-5 gap-3">
          {DIMS.map(d => (
            <div key={d} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 capitalize mb-1">{d}</p>
              <p className="text-2xl font-bold text-primary">{overall[d] ?? '–'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Answer breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Answer Breakdown</h3>
        <div className="space-y-3">
          {(scorecard?.answers || []).map((a, i) => {
            const isWeak = i === scorecard.weakest_answer_index
            const avg = DIMS.reduce((s, d) => s + (a.scores?.[d] || 0), 0) / DIMS.length
            return (
              <div key={i} className={`rounded-xl p-4 border ${isWeak ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                {isWeak && <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full mb-2 inline-block">Weakest answer</span>}
                <p className="text-sm font-medium text-slate-800 mb-1">Q: {a.question}</p>
                <p className="text-xs text-slate-500 mb-2">Avg score: {avg.toFixed(1)}/5</p>
                {a.good_phrases?.length > 0 && (
                  <p className="text-xs text-emerald-700">✓ {a.good_phrases.join(' · ')}</p>
                )}
                {a.weak_phrases?.length > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">✗ {a.weak_phrases.join(' · ')}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rewritten answer */}
      {scorecard?.rewritten_answer && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Rewritten Strong Answer</h3>
          <div className="border-l-4 border-primary bg-blue-50 px-4 py-3 rounded-r-xl text-sm text-slate-800 leading-relaxed">
            {scorecard.rewritten_answer}
          </div>
        </div>
      )}

      {/* Outreach */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Cold Outreach Message</h3>
        {outreachMessage
          ? <>
              <textarea rows={5}
                value={outreachMessage}
                onChange={e => setOutreachMessage(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              />
              <div className="flex gap-3">
                <button onClick={copyOutreach}
                  className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors">
                  {copied ? 'Copied!' : 'Copy Message'}
                </button>
                <button onClick={handleAddTracker}
                  className="text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
                  Add to Tracker
                </button>
              </div>
            </>
          : <p className="text-sm text-slate-400 animate-pulse">Generating outreach message...</p>
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify end-to-end in browser**

Complete a full interview (3+ questions → End Session). Scorecard should appear with overall scores, per-answer breakdown, rewritten answer, and outreach message. Copy and Add to Tracker buttons should work.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/interview/ScorecardStage.jsx
git commit -m "feat: scorecard, rewritten answer, and outreach panel"
```

---

## Task 9: Tracker Page

**Files:**
- Modify: `frontend/src/components/tracker/TrackerPage.jsx`

- [ ] **Step 1: Rewrite `frontend/src/components/tracker/TrackerPage.jsx`**

```jsx
import { useTracker, STATUSES } from '../../hooks/useTracker'
import { Trash2, Download } from 'lucide-react'

export function TrackerPage() {
  const { rows, updateRow, deleteRow, exportCSV } = useTracker()

  const selectCls = 'border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Tracker</h2>
          <p className="text-slate-500 text-sm mt-0.5">{rows.length} application{rows.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <p className="font-semibold text-lg">No applications yet</p>
          <p className="text-sm mt-1">Click "Save" on a job card or "Add to Tracker" after a mock session.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Company', 'Role', 'Board', 'Date Applied', 'Prep Score', 'Status', 'Follow-up', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">
                      {row.url
                        ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.company}</a>
                        : row.company}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-44 truncate">{row.role}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{row.source || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.date_applied || '—'}</td>
                    <td className="px-4 py-3">
                      {row.prep_score
                        ? <span className="text-xs font-bold text-primary">{row.prep_score}/5</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select value={row.status} onChange={e => updateRow(row.id, { status: e.target.value })} className={selectCls}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="date" value={row.followup_date || ''}
                        onChange={e => updateRow(row.id, { followup_date: e.target.value })}
                        className={selectCls} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteRow(row.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Add a job to tracker from the Jobs page. Navigate to /tracker. Row should appear with company link, status dropdown, follow-up date picker, and delete button. Export CSV should download a file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tracker/TrackerPage.jsx
git commit -m "feat: tracker page with status, follow-up, CSV export"
```

---

## Task 10: FastAPI Production Integration

**Files:**
- Modify: `placementos/main.py`

**Goal:** `npm run build` outputs to `placementos/static_react/`. FastAPI serves that as the SPA, with all API routes taking priority and a catch-all serving `index.html` for React Router.

- [ ] **Step 1: Build the React app**

```bash
cd frontend
npm run build
```

Expected: `placementos/static_react/` is created with `index.html` and `assets/` folder.

- [ ] **Step 2: Update `placementos/main.py`**

Replace the existing static mount + root route with:

```python
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from routers import jobs, interview, outreach, resume
from services.feed import refresh_feed

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static_react")


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
app.include_router(resume.router)

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
```

- [ ] **Step 3: Verify production build**

```bash
cd placementos
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000. The React app should load (not the old vanilla HTML). All three routes should work. API calls should function normally.

- [ ] **Step 4: Run backend tests to confirm nothing broke**

```bash
cd placementos
python -m pytest tests/ -v
```

Expected: 15 passed.

- [ ] **Step 5: Final commit**

```bash
git add placementos/main.py frontend/
git commit -m "feat: PlacementOS React frontend complete — Vite + Tailwind + blue/mint design"
```
