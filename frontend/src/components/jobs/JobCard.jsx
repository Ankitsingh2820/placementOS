import { useInterviewContext } from '../../context/InterviewContext'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Bookmark, Zap, FileText, Mic2, MapPin, Clock, Code2 } from 'lucide-react'

const eligConfig = {
  green:  { label: 'Worldwide',  dot: 'bg-emerald-400', cls: 'text-emerald-400' },
  yellow: { label: 'Timezone',   dot: 'bg-amber-400',   cls: 'text-amber-400'   },
  red:    { label: 'Restricted', dot: 'bg-red-400',     cls: 'text-red-400'     },
}
const wtConfig = {
  remote: { label: 'Remote', icon: Zap,    cls: 'text-blue-400 bg-blue-400/10'     },
  hybrid: { label: 'Hybrid', icon: Clock,  cls: 'text-violet-400 bg-violet-400/10' },
  onsite: { label: 'Onsite', icon: MapPin, cls: 'text-slate-400 bg-slate-400/10'   },
}
const avatarPalette = [
  ['#3B82F6','#1D4ED8'], ['#8B5CF6','#6D28D9'], ['#10B981','#059669'],
  ['#F97316','#C2410C'], ['#EC4899','#BE185D'], ['#6366F1','#4338CA'],
  ['#14B8A6','#0F766E'], ['#F43F5E','#BE123C'],
]

function CompanyAvatar({ name }) {
  const letter = (name || '?')[0].toUpperCase()
  const [from, to] = avatarPalette[(name || '').charCodeAt(0) % avatarPalette.length]
  return (
    <div className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center"
         style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span className="text-white font-bold text-base">{letter}</span>
    </div>
  )
}

function MatchRing({ score }) {
  if (!score) return null
  const color = score >= 60 ? '#10B981' : score >= 30 ? '#3B82F6' : '#64748B'
  const label = score >= 60 ? 'Strong' : score >= 30 ? 'Good' : 'Low'
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#334155" strokeWidth="3" />
        <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 87.96} 87.96`}
          strokeLinecap="round" transform="rotate(-90 18 18)" />
        <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
    </div>
  )
}

export function JobCard({ job, matchScore, onSave }) {
  const { setCurrentJob } = useInterviewContext()
  const navigate = useNavigate()
  const elig   = eligConfig[job.eligibility] || eligConfig.green
  const wt     = wtConfig[job.work_type]     || wtConfig.remote
  const WtIcon = wt.icon

  function handlePrep()   { setCurrentJob(job); navigate('/interview') }
  function handleTailor() { setCurrentJob(job); navigate('/tailor') }
  function handleCoach()  { setCurrentJob(job); navigate('/coach') }
  function handleCode()   { setCurrentJob(job); navigate('/code') }

  return (
    <div className={`group rounded-2xl flex flex-col overflow-hidden transition-all duration-200 animate-fade-in hover:-translate-y-1 ${
      matchScore >= 60
        ? 'shadow-[0_2px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_28px_rgba(16,185,129,0.3)] border border-emerald-500/30'
        : 'shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)] border border-slate-700/60'
    }`} style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }}>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header */}
        <div className="flex items-start gap-3">
          <CompanyAvatar name={job.company} />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 mb-1">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-xs font-medium">{job.company}</span>
              {job.posted_at && (
                <>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-500 text-xs">{job.posted_at.slice(0, 10)}</span>
                </>
              )}
            </div>
          </div>
          <MatchRing score={matchScore} />
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${wt.cls}`}>
            <WtIcon size={11} />{wt.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
            <span className={`w-1.5 h-1.5 rounded-full ${elig.dot}`} />
            <span className={elig.cls}>{elig.label}</span>
          </span>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{job.source}</span>
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{job.description}</p>
        )}

        {/* Tech tags */}
        {job.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.tags.slice(0, 5).map(t => (
              <span key={t} className="text-[11px] font-mono bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-md">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Salary */}
        {job.salary && (
          <div className="mt-auto">
            <span className="inline-block text-sm font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">
              {job.salary}
            </span>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="px-5 py-3.5 border-t border-white/5 bg-black/20 flex items-center gap-2">
        <button onClick={handlePrep}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl transition-colors">
          <Mic2 size={13} /> Prep Interview
        </button>
        <button onClick={handleTailor} title="Tailor Resume"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors">
          <FileText size={14} />
        </button>
        <button onClick={handleCoach} title="App Coach"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-emerald-400/15 text-slate-400 hover:text-emerald-400 border border-white/10 transition-colors">
          <Zap size={14} />
        </button>
        <button onClick={handleCode} title="Code Practice"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-violet-400/15 text-slate-400 hover:text-violet-400 border border-white/10 transition-colors">
          <Code2 size={14} />
        </button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" title="Apply"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-blue-400/15 text-slate-400 hover:text-blue-400 border border-white/10 transition-colors">
            <ExternalLink size={14} />
          </a>
        )}
        <button onClick={() => onSave(job)} title="Save to tracker"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors">
          <Bookmark size={14} />
        </button>
      </div>
    </div>
  )
}
