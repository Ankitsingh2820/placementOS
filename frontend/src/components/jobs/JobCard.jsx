import { useInterviewContext } from '../../context/InterviewContext'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Bookmark, Zap, FileText, Mic2 } from 'lucide-react'

const eligConfig = {
  green:  { label: 'Worldwide',      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  yellow: { label: 'Check timezone', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'       },
  red:    { label: 'Region-locked',  cls: 'bg-red-50 text-red-600 ring-1 ring-red-200'             },
}
const wtConfig = {
  remote: { label: 'Remote', cls: 'bg-blue-50 text-blue-700'     },
  hybrid: { label: 'Hybrid', cls: 'bg-violet-50 text-violet-700' },
  onsite: { label: 'Onsite', cls: 'bg-slate-100 text-slate-600'  },
}
const avatarColors = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500',
  'bg-pink-500', 'bg-indigo-500','bg-teal-500',  'bg-rose-500',
]

function CompanyAvatar({ name }) {
  const letter = (name || '?')[0].toUpperCase()
  const color  = avatarColors[(name || '').charCodeAt(0) % avatarColors.length]
  return (
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0 shadow-sm`}>
      <span className="text-white font-bold text-sm">{letter}</span>
    </div>
  )
}

export function JobCard({ job, matchScore, onSave }) {
  const { setCurrentJob } = useInterviewContext()
  const navigate = useNavigate()
  const elig = eligConfig[job.eligibility] || eligConfig.green
  const wt   = wtConfig[job.work_type]    || wtConfig.remote
  const isHighMatch = matchScore >= 60

  function handlePrep()   { setCurrentJob(job); navigate('/interview') }
  function handleTailor() { setCurrentJob(job); navigate('/tailor') }
  function handleCoach()  { setCurrentJob(job); navigate('/coach') }

  return (
    <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in ${
      isHighMatch ? 'border-primary/30' : 'border-slate-200'
    }`}>
      {isHighMatch && <div className="h-0.5 bg-gradient-primary" />}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <CompanyAvatar name={job.company} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{job.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">{job.company}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${elig.cls}`}>{elig.label}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wt.cls}`}>{wt.label}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">{job.source}</span>
          {matchScore > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ring-1 ${
              isHighMatch          ? 'text-emerald-700 bg-emerald-50 ring-emerald-200' :
              matchScore >= 30     ? 'text-blue-700 bg-blue-50 ring-blue-200' :
                                     'text-slate-500 bg-slate-50 ring-slate-200'
            }`}>{matchScore}% match</span>
          )}
        </div>

        {/* Description preview */}
        {job.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{job.description}</p>
        )}

        {/* Tags */}
        {job.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.tags.slice(0, 4).map(t => (
              <span key={t} className="text-[11px] font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md">{t}</span>
            ))}
          </div>
        )}

        {/* Salary + date */}
        <div className="flex items-center justify-between mt-auto">
          {job.salary
            ? <p className="text-sm font-semibold text-mint">{job.salary}</p>
            : <span />}
          {job.posted_at && <p className="text-[11px] text-slate-400">{job.posted_at.slice(0,10)}</p>}
        </div>
      </div>

      {/* Action footer */}
      <div className="border-t border-slate-100 px-4 py-3 flex gap-2 bg-slate-50/60">
        <button onClick={handlePrep} title="Interview Prep"
          className="flex items-center gap-1.5 flex-1 justify-center text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-2 py-2 rounded-xl transition-colors">
          <Mic2 size={12} /> Prep
        </button>
        <button onClick={handleTailor} title="Tailor Resume"
          className="flex items-center gap-1.5 flex-1 justify-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-2 rounded-xl transition-colors">
          <FileText size={12} /> Tailor
        </button>
        <button onClick={handleCoach} title="Full Package — fit + tailor + outreach"
          className="flex items-center gap-1.5 flex-1 justify-center text-xs font-semibold bg-mint hover:bg-mint-hover text-white px-2 py-2 rounded-xl transition-colors">
          <Zap size={12} /> Coach
        </button>
        <div className="flex gap-1">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" title="Apply"
              className="flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary-light bg-white border border-slate-200 w-8 h-8 rounded-xl transition-colors">
              <ExternalLink size={13} />
            </a>
          )}
          <button onClick={() => onSave(job)} title="Save to tracker"
            className="flex items-center justify-center text-slate-400 hover:text-mint hover:bg-mint-light bg-white border border-slate-200 w-8 h-8 rounded-xl transition-colors">
            <Bookmark size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
