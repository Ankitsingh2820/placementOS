import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Play, RotateCcw, Code2, Mic2, Zap, MessageCircle } from 'lucide-react'
import { useCareer } from '../../hooks/useCareer'
import { useInterviewContext } from '../../context/InterviewContext'

const TOOL_META = {
  code:      { icon: Code2,         label: 'Code Practice', path: '/code' },
  interview: { icon: Mic2,          label: 'Interview',     path: '/interview' },
  coach:     { icon: Zap,           label: 'Coach',         path: '/coach' },
  chat:      { icon: MessageCircle, label: 'Chat',          path: '/chat' },
}

export function RoadmapView({ onReset }) {
  const { track, toggleStep, resetTrack, readiness, completed, totalSteps } = useCareer()
  const { setCurrentJob, setResumeText, setSeedChat } = useInterviewContext()
  const navigate = useNavigate()

  const profile = track.roadmap.role_profile
  const job = {
    title: profile.title || track.domain,
    company: profile.company || '',
    description: profile.description || '',
  }

  function start(step) {
    setCurrentJob(job)
    if (track.resume) setResumeText(track.resume)
    const meta = TOOL_META[step.tool]
    if (step.tool === 'chat') {
      setSeedChat(step.config?.prompt || `Help me prepare for ${track.domain} interviews.`)
    }
    navigate(meta.path)
  }

  function switchTrack() {
    resetTrack()
    onReset?.()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Career Track</p>
          <h1 className="text-2xl font-semibold text-white">{track.domain}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{track.level}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{readiness}%</div>
          <p className="text-slate-500 text-xs">{completed}/{totalSteps} done</p>
          <button onClick={switchTrack}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <RotateCcw size={12} /> Switch track
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${readiness}%` }} />
      </div>

      <div className="space-y-8">
        {track.roadmap.modules.map((m, mi) => (
          <div key={m.id}>
            <h2 className="text-sm font-semibold text-white mb-3">
              <span className="text-slate-500 mr-2">{mi + 1}</span>{m.title}
            </h2>
            <div className="space-y-2">
              {m.steps.map(step => {
                const done = track.completedSteps.includes(step.id)
                const meta = TOOL_META[step.tool] || TOOL_META.chat
                const Icon = meta.icon
                return (
                  <div key={step.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                    <button onClick={() => toggleStep(step.id)} title="Toggle complete">
                      {done
                        ? <CheckCircle2 size={20} className="text-emerald-400" />
                        : <Circle size={20} className="text-slate-600 hover:text-slate-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {step.title}
                      </p>
                      {step.description && <p className="text-slate-500 text-xs mt-0.5">{step.description}</p>}
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                      <Icon size={12} /> {meta.label}
                    </span>
                    <button onClick={() => start(step)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30">
                      <Play size={12} /> Start
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
