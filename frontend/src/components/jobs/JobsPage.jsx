import { useState, useRef } from 'react'
import { useJobs } from '../../hooks/useJobs'
import { useTracker } from '../../hooks/useTracker'
import { JobFilters } from './JobFilters'
import { JobCard } from './JobCard'
import { parseResumePDF } from '../../lib/api'
import {
  Briefcase, Globe, Wifi, Sparkles, ArrowRight,
  Upload, X, ChevronDown, ChevronUp, Search, Mic2, Zap,
} from 'lucide-react'

/* ─── Skeleton ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 skeleton rounded-md w-3/4" />
            <div className="h-3 skeleton rounded-md w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-20 skeleton rounded-full" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 skeleton rounded-md w-full" />
          <div className="h-3 skeleton rounded-md w-4/5" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-12 skeleton rounded-md" />
          <div className="h-5 w-16 skeleton rounded-md" />
          <div className="h-5 w-10 skeleton rounded-md" />
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60 flex gap-2">
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 w-16 skeleton rounded-xl" />
      </div>
    </div>
  )
}

/* ─── Hero ──────────────────────────────────────────────────── */
const steps = [
  { icon: Search, label: 'Find',    desc: 'AI-ranked remote jobs' },
  { icon: Mic2,   label: 'Prep',    desc: 'Interview + resume AI' },
  { icon: Zap,    label: 'Get it',  desc: 'Coach + outreach'      },
]

function StatPill({ value, label, color }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-slate-400 font-medium mt-0.5">{label}</span>
    </div>
  )
}

function Hero({ jobs, loading, matchStatus, onMatch, onClear }) {
  const [open, setOpen]         = useState(false)
  const [text, setText]         = useState('')
  const [fileStatus, setFStatus]= useState('')
  const [busy, setBusy]         = useState(false)
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    setFStatus('Parsing…')
    try {
      const d = await parseResumePDF(file)
      setText(d.text)
      setFStatus(`"${file.name}" — ${d.text.split(/\s+/).length} words`)
    } catch (err) { setFStatus(err.message || 'Parse failed.') }
    e.target.value = ''
  }

  async function handleMatch() {
    if (!text.trim()) { alert('Paste your resume or upload a PDF first.'); return }
    setBusy(true); await onMatch(text); setBusy(false)
  }

  const hasMatch = matchStatus?.includes('found')
  const remote   = jobs.filter(j => j.work_type === 'remote').length
  const worldwide= jobs.filter(j => j.eligibility === 'green').length

  return (
    <div className="relative rounded-2xl overflow-hidden mb-7"
         style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F2044 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }} />
      </div>

      <div className="relative px-7 pt-8 pb-7">

        {/* Tagline chip */}
        <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
          <span className="text-xs text-slate-300 font-medium tracking-wide">Live remote job feed</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-7">

          {/* Left — headline + steps */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight mb-2">
              Find your next<br />
              <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg, #60A5FA, #34D399)' }}>
                remote role
              </span>
            </h1>
            <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
              India-friendly listings from WWR, RemoteOK, Remotive and more — ranked and prepped by AI.
            </p>

            {/* 3-step flow */}
            <div className="flex items-center gap-2 flex-wrap">
              {steps.map(({ icon: Icon, label, desc }, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/12 transition-colors">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                      <Icon size={12} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white leading-none">{label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{desc}</p>
                    </div>
                  </div>
                  {i < steps.length - 1 && <ArrowRight size={12} className="text-slate-600 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Right — stats + match CTA */}
          <div className="flex flex-col gap-4 lg:items-end">

            {/* Stats */}
            <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <StatPill value={loading ? '—' : jobs.length} label="jobs"      color="text-white" />
              <div className="w-px h-8 bg-white/10" />
              <StatPill value={loading ? '—' : remote}      label="remote"    color="text-blue-400" />
              <div className="w-px h-8 bg-white/10" />
              <StatPill value={loading ? '—' : worldwide}   label="worldwide" color="text-emerald-400" />
            </div>

            {/* Resume match toggle */}
            <div className="w-full lg:w-80">
              <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 bg-primary/90 hover:bg-primary border border-blue-400/20 rounded-xl px-4 py-3 transition-colors group">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles size={15} className="text-blue-200" />
                  {hasMatch ? `✓ ${matchStatus}` : 'Match jobs to my resume'}
                </span>
                {open
                  ? <ChevronUp size={15} className="text-blue-300" />
                  : <ChevronDown size={15} className="text-blue-300" />}
              </button>

              {open && (
                <div className="mt-2 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex gap-3 mb-3">
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/10 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                      <Upload size={12} /> Upload PDF
                    </button>
                    <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
                    {fileStatus && <p className="text-xs text-slate-400 self-center">{fileStatus}</p>}
                  </div>
                  <textarea rows={3} value={text} onChange={e => setText(e.target.value)}
                    placeholder="Or paste resume text…"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-primary/60 mb-3" />
                  <div className="flex gap-2 items-center">
                    <button onClick={handleMatch} disabled={busy}
                      className="flex-1 text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
                      {busy ? 'Analysing…' : 'Find matches'}
                    </button>
                    {hasMatch && (
                      <button onClick={onClear}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                        <X size={12} /> Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */
export function JobsPage() {
  const { jobs, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch } = useJobs()
  const { addRow } = useTracker()

  function handleSave(job) {
    const added = addRow(job)
    if (!added) alert('Already in tracker.')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Hero
        jobs={jobs} loading={loading}
        matchStatus={matchStatus} onMatch={matchResume} onClear={clearMatch}
      />

      <JobFilters filters={filters} setFilters={setFilters} onRefresh={refetch} />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Briefcase size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No jobs match your filters</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">Try adjusting your search or click Refresh to reload listings.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} matchScore={matchScores[job.id] || 0} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  )
}
