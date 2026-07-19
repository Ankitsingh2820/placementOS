import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useInterviewContext } from '../../context/InterviewContext'
import { fetchProblems, evaluateCode, fetchHint, fetchCompanies, fetchCompanyProblems, fetchProblemDetail } from '../../lib/api'
import {
  Code2, ChevronRight, Lightbulb, Play, RotateCcw,
  CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, BookOpen,
} from 'lucide-react'

const LANGUAGES = [
  { id: 'python',     label: 'Python',     monaco: 'python'     },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'cpp',        label: 'C++',        monaco: 'cpp'        },
]

const DIFFICULTY_COLOR = {
  Easy:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Medium: 'text-amber-400   bg-amber-400/10   border-amber-400/20',
  Hard:   'text-red-400     bg-red-400/10     border-red-400/20',
}

const TOPIC_COLOR = {
  'Arrays':         'bg-blue-400/10 text-blue-400',
  'Hash Maps':      'bg-violet-400/10 text-violet-400',
  'Stacks':         'bg-orange-400/10 text-orange-400',
  'Dynamic Programming': 'bg-pink-400/10 text-pink-400',
  'Linked Lists':   'bg-cyan-400/10 text-cyan-400',
  'Sliding Window': 'bg-teal-400/10 text-teal-400',
  'Graphs':         'bg-indigo-400/10 text-indigo-400',
  'Searching':      'bg-sky-400/10 text-sky-400',
  'Sorting':        'bg-amber-400/10 text-amber-400',
  'Strings':        'bg-rose-400/10 text-rose-400',
  'Design':         'bg-slate-400/10 text-slate-400',
}

function VerdictBadge({ verdict }) {
  if (!verdict) return null
  const cfg = {
    'Accepted':          { icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
    'Partially Correct': { icon: AlertCircle,  cls: 'text-amber-400   bg-amber-400/10   border-amber-400/30'  },
    'Wrong Approach':    { icon: XCircle,      cls: 'text-red-400     bg-red-400/10     border-red-400/30'    },
    'Incomplete':        { icon: AlertCircle,  cls: 'text-slate-400   bg-slate-400/10   border-slate-400/30'  },
  }
  const { icon: Icon, cls } = cfg[verdict] || cfg['Incomplete']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cls}`}>
      <Icon size={13} /> {verdict}
    </span>
  )
}

export function CodePage() {
  const { currentJob } = useInterviewContext()

  const [problems, setProblems]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [lang, setLang]           = useState('python')
  const [code, setCode]           = useState('')
  const [result, setResult]       = useState(null)
  const [hint, setHint]           = useState('')
  const [filter, setFilter]       = useState('All')

  const [companies, setCompanies]         = useState([])
  const [company, setCompany]             = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [loadingProblems, setLoadingProblems] = useState(true)
  const [evaluating, setEvaluating]           = useState(false)
  const [hinting, setHinting]                 = useState(false)
  const [generatingAI, setGeneratingAI]       = useState(false)

  // Load seed problems on mount
  useEffect(() => {
    loadProblems(false)
  }, [])

  // Load the company list once (for the picker); degrade to empty on failure
  useEffect(() => {
    fetchCompanies().then(setCompanies).catch(() => setCompanies([]))
  }, [])

  // When a company is chosen, load its bank problems instead of the seed/job list
  useEffect(() => {
    if (!company) return
    setSelected(null); setResult(null); setHint('')
    setLoadingProblems(true)
    fetchCompanyProblems(company)
      .then((data) => setProblems(data))
      .catch(() => setProblems([]))
      .finally(() => setLoadingProblems(false))
  }, [company])

  function handleCompanyChange(next) {
    setCompany(next)
    if (!next) loadProblems(false)
  }

  async function loadProblems(withJob) {
    setCompany('')
    setLoadingProblems(true)
    setSelected(null); setResult(null); setHint('')
    try {
      const job = withJob && currentJob ? currentJob : null
      const data = await fetchProblems(job
        ? { jobTitle: job.title, jobCompany: job.company, jobDescription: job.description || '' }
        : {}
      )
      setProblems(data)
      selectProblem(data[0], lang)
    } catch { }
    finally { setLoadingProblems(false); setGeneratingAI(false) }
  }

  function selectProblem(p, language) {
    setSelected(p)
    setCode(p.starter_code?.[language] || '')
    setResult(null)
    setHint('')
  }

  // Bank rows carry a slug but no description/examples yet — fetch full detail
  // on demand before loading the editor. Seed/job problems already have a
  // description and load straight through.
  async function openProblem(p) {
    setResult(null); setHint('')
    if (p.slug && !p.description) {
      setLoadingDetail(true)
      try {
        const full = await fetchProblemDetail(p.slug)
        setSelected(full)
        setCode(full.starter_code?.[lang] ?? '')
      } catch {
        setSelected(null)
        if (p.leetcode_url) window.open(p.leetcode_url, '_blank')
      } finally {
        setLoadingDetail(false)
      }
    } else {
      setSelected(p)
      setCode(p.starter_code?.[lang] ?? '')
    }
  }

  function handleLangChange(newLang) {
    setLang(newLang)
    if (selected) setCode(selected.starter_code?.[newLang] || '')
    setResult(null)
  }

  async function handleEvaluate() {
    if (!selected || !code.trim()) return
    setEvaluating(true); setResult(null); setHint('')
    try {
      const data = await evaluateCode({ problem: selected, code, language: lang })
      setResult(data)
    } catch { }
    finally { setEvaluating(false) }
  }

  async function handleHint() {
    if (!selected) return
    setHinting(true); setHint('')
    try {
      const data = await fetchHint({ problem: selected, code, language: lang })
      setHint(data.hint)
    } catch { }
    finally { setHinting(false) }
  }

  function handleReset() {
    if (selected) setCode(selected.starter_code?.[lang] || '')
    setResult(null); setHint('')
  }

  const difficulties = ['All', 'Easy', 'Medium', 'Hard']
  const filtered = problems.filter(p => filter === 'All' || p.difficulty === filter)
  const selectedCompanyMeta = companies.find(c => c.company === company)

  const scoreColor = result
    ? result.score >= 80 ? 'text-emerald-400'
    : result.score >= 50 ? 'text-amber-400'
    : 'text-red-400'
    : ''

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Problem List Sidebar ────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-slate-700/40 overflow-hidden"
           style={{ background: '#0B1120' }}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Code2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">Code Practice</span>
          </div>

          {/* AI generate button */}
          <button
            onClick={() => { setGeneratingAI(true); loadProblems(true) }}
            disabled={!currentJob || generatingAI || loadingProblems}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-xl transition-all">
            {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingAI ? 'Generating…' : currentJob ? `For ${currentJob.title}` : 'Select a job first'}
          </button>
        </div>

        {/* Company picker */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/30">
          <select
            value={company}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <option value="">Seed problems</option>
            {companies.map((c) => (
              <option key={c.company} value={c.company}>
                {c.company} — {c.count} problems{c.source_date ? ` · ${c.source_date.slice(0, 4)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1 px-3 py-2 border-b border-slate-700/30">
          {difficulties.map(d => (
            <button key={d} onClick={() => setFilter(d)}
              className={`flex-1 text-[10px] font-semibold py-1 rounded-lg transition-colors ${
                filter === d ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {d}
            </button>
          ))}
        </div>

        {/* Problem list */}
        <div className="flex-1 overflow-y-auto py-2">
          {company && selectedCompanyMeta && (
            <p className="px-4 pb-2 text-[10px] italic text-slate-500">
              {selectedCompanyMeta.ordering === 'frequency'
                ? 'Ordered by interview frequency — most-asked first'
                : 'Curated list from company prep sheet'}
            </p>
          )}
          {loadingProblems ? (
            <div className="space-y-2 px-3 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 skeleton rounded-xl" />
              ))}
            </div>
          ) : filtered.map((p, i) => (
            <button key={p.slug ?? p.id ?? i} onClick={() => openProblem(p)}
              className={`w-full text-left px-4 py-3 transition-all border-l-2 ${
                (selected?.slug != null && selected?.slug === p.slug) || (selected?.id != null && selected?.id === p.id)
                  ? 'bg-indigo-500/10 border-l-indigo-500 text-white'
                  : 'border-l-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold truncate">{p.title}</span>
                <ChevronRight size={12} className="shrink-0 opacity-50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DIFFICULTY_COLOR[p.difficulty] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                  {p.difficulty || '—'}
                </span>
                {p.topic ? (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TOPIC_COLOR[p.topic] || 'bg-slate-700 text-slate-400'}`}>
                    {p.topic}
                  </span>
                ) : p.acceptance != null ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                    {p.acceptance}% acceptance
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* Load defaults */}
        <div className="px-3 py-3 border-t border-slate-700/30">
          <button onClick={() => loadProblems(false)}
            className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Reset to default problems
          </button>
        </div>
      </div>

      {/* ── Main Panel ──────────────────────────────────────── */}
      {loadingDetail ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={28} className="text-indigo-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-500 text-sm">Loading problem…</p>
          </div>
        </div>
      ) : !selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Select a problem to start</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* Problem description */}
          <div className="w-[42%] shrink-0 flex flex-col border-r border-slate-700/40 overflow-y-auto"
               style={{ background: '#0F172A' }}>
            <div className="p-6">
              {/* Title + badges */}
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white mb-2">{selected.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${DIFFICULTY_COLOR[selected.difficulty] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                    {selected.difficulty || '—'}
                  </span>
                  {selected.topic && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TOPIC_COLOR[selected.topic] || 'bg-slate-700 text-slate-400'}`}>
                      {selected.topic}
                    </span>
                  )}
                  {selected.leetcode_url && (
                    <a href={selected.leetcode_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700/60 text-indigo-300 hover:text-indigo-200 hover:bg-slate-700 transition-colors">
                      Open on LeetCode ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-5">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{selected.description}</p>
              </div>

              {/* Examples */}
              {selected.examples?.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Examples</h3>
                  <div className="space-y-3">
                    {selected.examples.map((ex, i) => (
                      <div key={i} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 text-xs font-mono">
                        <p className="text-slate-400 mb-1"><span className="text-slate-500">Input: </span><span className="text-slate-200">{ex.input}</span></p>
                        <p className="text-slate-400 mb-1"><span className="text-slate-500">Output: </span><span className="text-emerald-400">{ex.output}</span></p>
                        {ex.explanation && <p className="text-slate-500 mt-2 font-sans text-[11px]">💡 {ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Constraints */}
              {selected.constraints?.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Constraints</h3>
                  <ul className="space-y-1">
                    {selected.constraints.map((c, i) => (
                      <li key={i} className="text-xs text-slate-400 font-mono flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hint box */}
              {hint && (
                <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <Lightbulb size={13} /> Hint
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{hint}</p>
                </div>
              )}
            </div>
          </div>

          {/* Editor + Results */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B1120' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40 shrink-0">
              {/* Language selector */}
              <div className="flex gap-1 bg-slate-800/60 border border-slate-700/40 rounded-xl p-1">
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => handleLangChange(l.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      lang === l.id
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800">
                <RotateCcw size={12} /> Reset
              </button>

              <button onClick={handleHint} disabled={hinting}
                className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50">
                {hinting ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
                {hinting ? 'Thinking…' : 'Get Hint'}
              </button>

              <button onClick={handleEvaluate} disabled={evaluating}
                className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl transition-all shadow-sm shadow-indigo-500/30">
                {evaluating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {evaluating ? 'Evaluating…' : 'Submit'}
              </button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden">
              <Editor
                language={LANGUAGES.find(l => l.id === lang)?.monaco || 'python'}
                value={code}
                onChange={v => setCode(v || '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>

            {/* Results panel */}
            {result && (
              <div className="border-t border-slate-700/40 overflow-y-auto max-h-72 shrink-0"
                   style={{ background: '#0F172A' }}>
                <div className="p-5">
                  {/* Score + verdict */}
                  <div className="flex items-center gap-4 mb-4">
                    <VerdictBadge verdict={result.verdict} />
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{result.score}</span>
                      <span className="text-slate-500 text-sm">/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Complexity */}
                    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Complexity</p>
                      <p className="text-xs text-slate-300 mb-1">⏱ {result.time_complexity}</p>
                      <p className="text-xs text-slate-300">📦 {result.space_complexity}</p>
                    </div>

                    {/* Correctness */}
                    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Correctness</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{result.correctness}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Strengths */}
                    {result.strengths?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Improvements */}
                    {result.improvements?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-2">Improvements</p>
                        <ul className="space-y-1">
                          {result.improvements.map((s, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5">→</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Interviewer note */}
                  {result.interviewer_note && (
                    <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">Interviewer's Take</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{result.interviewer_note}</p>
                    </div>
                  )}

                  {/* Optimal hint */}
                  {result.optimal_hint && result.score < 90 && (
                    <div className="mt-3 bg-violet-500/8 border border-violet-500/20 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-1">Optimal Approach</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{result.optimal_hint}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
