import { useState } from 'react'
import { Compass, Loader2, Sparkles } from 'lucide-react'
import { generateRoadmap } from '../../lib/api'
const SUGGESTED = [
  'Frontend Developer', 'Backend Engineer', 'Full-Stack Developer',
  'Data Analyst', 'Data Scientist', 'ML Engineer',
  'DevOps Engineer', 'Product Manager', 'Android Developer',
]
const LEVELS = ['Fresher', '0-2 yrs', 'Mid-level']

export function TrackPicker({ setTrack }) {
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
