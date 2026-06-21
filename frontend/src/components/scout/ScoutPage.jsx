import { useState } from 'react'
import { Search, Sparkles, Briefcase } from 'lucide-react'
import { scoutJobs, generateDigest } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'
import { useNavigate } from 'react-router-dom'

const eligBadge = {
  green:  { label: 'Worldwide',      cls: 'bg-emerald-400/15 text-emerald-400' },
  yellow: { label: 'Check timezone', cls: 'bg-amber-400/15 text-amber-400'    },
  red:    { label: 'Region-locked',  cls: 'bg-red-400/15 text-red-400'        },
}

function ScoutCard({ job, score, reason, action, onCoach }) {
  const elig = eligBadge[job?.eligibility] || eligBadge.green
  const pct  = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-600'
  const displayJob = job?.title ? job : { title: job?.title || 'Unknown', company: job?.company || '' }
  return (
    <div className="border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all"
         style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-white text-sm">{displayJob.title || job?.title}</h3>
          <p className="text-slate-400 text-xs">{displayJob.company || job?.company}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${pct}`}>{score}%</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${elig.cls}`}>{elig.label}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-2 leading-relaxed"><span className="font-semibold text-blue-400">Why:</span> {reason}</p>
      {action && <p className="text-xs text-blue-400 bg-blue-400/10 rounded-lg px-3 py-2 mb-3"><span className="font-semibold">Action:</span> {action}</p>}
      <div className="flex gap-2">
        {job?.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-semibold bg-mint hover:bg-mint-hover text-white px-3 py-2 rounded-lg transition-colors">
            Apply
          </a>
        )}
        <button onClick={() => onCoach(job || displayJob)}
          className="flex-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-lg transition-colors">
          Full Package
        </button>
      </div>
    </div>
  )
}

export function ScoutPage() {
  const { resumeText, setCurrentJob } = useInterviewContext()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [digest, setDigest] = useState([])
  const [mode, setMode] = useState('search')
  const [status, setStatus] = useState('idle')

  async function handleSearch() {
    if (!query.trim()) return
    setStatus('loading'); setResults([])
    try { const data = await scoutJobs(query); setResults(data); setMode('search') } catch {}
    finally { setStatus('idle') }
  }

  async function handleDigest() {
    if (!resumeText.trim()) { alert('Go to Interview Prep and paste/upload your resume first.'); return }
    setStatus('loading-digest'); setDigest([])
    try { const data = await generateDigest(resumeText); setDigest(data); setMode('digest') } catch {}
    finally { setStatus('idle') }
  }

  function handleCoach(job) { setCurrentJob(job); navigate('/coach') }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Job Scout</h2>
        <p className="text-slate-400 text-sm mt-0.5">AI-powered search — describe what you want or get a personalized daily digest</p>
      </div>

      {/* Search bar */}
      <div className="border border-slate-700/50 rounded-xl p-5 mb-5" style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }}>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">What are you looking for?</label>
        <div className="flex gap-2">
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "remote Python backend role, India-friendly, early-stage startup"'
            className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={handleSearch} disabled={status === 'loading'}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            <Search size={15} />
            {status === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="text-xs text-slate-600">or</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

      <div className="text-center mb-6">
        <button onClick={handleDigest} disabled={status === 'loading-digest'}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors">
          <Sparkles size={16} />
          {status === 'loading-digest' ? 'Scanning…' : 'Generate My Top 3 Matches'}
        </button>
        <p className="text-xs text-slate-600 mt-2">Uses your resume from Interview Prep to find the best fits</p>
      </div>

      {mode === 'search' && results.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{results.length} matches found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((r, i) => <ScoutCard key={i} job={r.job} score={r.score} reason={r.reason} onCoach={handleCoach} />)}
          </div>
        </div>
      )}

      {mode === 'digest' && digest.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your top {digest.length} matches today</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {digest.map((r, i) => <ScoutCard key={i} job={r} score={r.score} reason={r.reason} action={r.action} onCoach={handleCoach} />)}
          </div>
        </div>
      )}

      {status === 'idle' && results.length === 0 && digest.length === 0 && (
        <div className="text-center py-16 text-slate-700">
          <Briefcase size={40} className="mx-auto mb-3" />
          <p className="text-sm">Search by description or generate your personalized digest</p>
        </div>
      )}
    </div>
  )
}
