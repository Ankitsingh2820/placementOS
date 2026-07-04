import { useState } from 'react'
import { Zap, Copy, Check } from 'lucide-react'
import { streamCoach } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'
import { ResumeInput } from '../common/ResumeInput'

const cardCls = 'border rounded-xl p-5 transition-all'

function StepCard({ title, status, children }) {
  const borderCls =
    status === 'done'    ? 'border-emerald-500/30 bg-emerald-500/5' :
    status === 'loading' ? 'border-primary/40 bg-primary/5'         :
                           'border-slate-700/50 bg-slate-800/40 opacity-50'
  return (
    <div className={`${cardCls} ${borderCls}`}>
      <div className="flex items-center gap-2 mb-3">
        {status === 'done'    && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
        {status === 'loading' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />}
        {status === 'idle'    && <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium mt-2">
      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

export function CoachPage() {
  const { currentJob, resumeText } = useInterviewContext()
  const [running, setRunning] = useState(false)

  const [fit, setFit] = useState(null)
  const [tailored, setTailored] = useState('')
  const [outreach, setOutreach] = useState('')
  const [followup, setFollowup] = useState('')

  const [fitStatus, setFitStatus] = useState('idle')
  const [tailorStatus, setTailorStatus] = useState('idle')
  const [outreachStatus, setOutreachStatus] = useState('idle')
  const [followupStatus, setFollowupStatus] = useState('idle')

  async function handleRun() {
    if (!resumeText.trim()) { alert('Paste your resume first.'); return }
    if (!currentJob) { alert('Select a job from the Jobs page first.'); return }

    setRunning(true)
    setFit(null); setTailored(''); setOutreach(''); setFollowup('')
    setFitStatus('loading'); setTailorStatus('idle'); setOutreachStatus('idle'); setFollowupStatus('idle')

    try {
      for await (const event of streamCoach({ resume: resumeText, job: currentJob })) {
        if (event.step === 'fit') {
          setFit(event.data); setFitStatus('done'); setTailorStatus('loading')
        } else if (event.step === 'tailor') {
          setTailored(p => p + event.text)
        } else if (event.step === 'tailor_done') {
          setTailorStatus('done'); setOutreachStatus('loading')
        } else if (event.step === 'outreach') {
          setOutreach(event.data.message); setOutreachStatus('done'); setFollowupStatus('loading')
        } else if (event.step === 'followup') {
          setFollowup(event.data.message); setFollowupStatus('done')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  const scoreColor = fit?.score >= 70 ? 'text-emerald-400' : fit?.score >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Application Coach</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {currentJob ? `Building full package for: ${currentJob.title} at ${currentJob.company}` : 'Select a job from the Jobs page, then come here'}
        </p>
      </div>

      {/* Resume input */}
      <ResumeInput theme="dark" rows={6} label="Your Resume" className="mb-5" />

      <div className="text-center mb-6">
        <button onClick={handleRun} disabled={running}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold px-10 py-3 rounded-xl text-base transition-colors shadow-sm shadow-primary/30">
          <Zap size={17} />
          {running ? 'Building Package…' : 'Build Full Application Package'}
        </button>
      </div>

      <div className="space-y-4">
        <StepCard title="Step 1 · Fit Analysis" status={fitStatus}>
          {fit ? (
            <div>
              <p className={`text-4xl font-bold mb-3 ${scoreColor}`}>{fit.score}<span className="text-lg text-slate-500">/100</span></p>
              <p className="text-sm text-slate-300 mb-3 italic">"{fit.verdict}"</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Strengths</p>
                  <ul className="space-y-1">{fit.strengths?.map((s, i) => <li key={i} className="text-xs text-slate-300">✓ {s}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Gaps</p>
                  <ul className="space-y-1">{fit.gaps?.map((g, i) => <li key={i} className="text-xs text-slate-300">✗ {g}</li>)}</ul>
                </div>
              </div>
            </div>
          ) : fitStatus === 'loading'
              ? <p className="text-sm text-slate-500 animate-pulse">Analyzing fit…</p>
              : <p className="text-sm text-slate-600">Waiting…</p>}
        </StepCard>

        <StepCard title="Step 2 · Tailored Resume" status={tailorStatus}>
          {tailored ? (
            <div>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed max-h-64 overflow-y-auto">
                {tailored}
                {tailorStatus === 'loading' && <span className="inline-block w-1.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />}
              </pre>
              {tailorStatus === 'done' && <CopyBtn text={tailored} />}
            </div>
          ) : tailorStatus === 'loading'
              ? <p className="text-sm text-slate-500 animate-pulse">Tailoring resume…</p>
              : <p className="text-sm text-slate-600">Waiting…</p>}
        </StepCard>

        <StepCard title="Step 3 · Cold Outreach Message" status={outreachStatus}>
          {outreach ? (
            <div>
              <p className="text-sm text-slate-300 leading-relaxed">{outreach}</p>
              <CopyBtn text={outreach} />
            </div>
          ) : outreachStatus === 'loading'
              ? <p className="text-sm text-slate-500 animate-pulse">Writing outreach…</p>
              : <p className="text-sm text-slate-600">Waiting…</p>}
        </StepCard>

        <StepCard title="Step 4 · Follow-up Email (send after 5 days)" status={followupStatus}>
          {followup ? (
            <div>
              <p className="text-sm text-slate-300 leading-relaxed">{followup}</p>
              <CopyBtn text={followup} />
            </div>
          ) : followupStatus === 'loading'
              ? <p className="text-sm text-slate-500 animate-pulse">Writing follow-up…</p>
              : <p className="text-sm text-slate-600">Waiting…</p>}
        </StepCard>
      </div>
    </div>
  )
}
