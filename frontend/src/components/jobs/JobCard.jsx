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
  const { setCurrentJob } = useInterviewContext()
  const navigate = useNavigate()
  const elig = eligConfig[job.eligibility] || eligConfig.green
  const wt   = wtConfig[job.work_type]    || wtConfig.remote

  function handlePrep() {
    setCurrentJob(job)
    navigate('/interview')
  }

  function handleTailor() {
    setCurrentJob(job)
    navigate('/tailor')
  }

  function handleCoach() {
    setCurrentJob(job)
    navigate('/coach')
  }

  return (
    <div className={`bg-white rounded-xl border flex flex-col gap-3 p-4 hover:shadow-md transition-all ${
      matchScore >= 60 ? 'border-primary/40 shadow-sm shadow-primary/10' : 'border-slate-200'
    }`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate">{job.title}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{job.company}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${elig.cls}`}>{elig.label}</span>
      </div>

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

      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.tags.map(t => (
            <span key={t} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}

      {job.salary && <p className="text-sm font-semibold text-mint">{job.salary}</p>}

      <div className="flex gap-2 mt-auto pt-1 flex-wrap">
        <button onClick={handlePrep}
          className="flex-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-lg transition-colors">
          Prep Interview
        </button>
        <button onClick={handleTailor}
          className="flex-1 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition-colors">
          Tailor Resume
        </button>
        <button onClick={handleCoach}
          className="flex-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg transition-colors">
          Full Package
        </button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold bg-mint hover:bg-mint-hover text-white px-3 py-2 rounded-lg transition-colors">
            Apply
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
