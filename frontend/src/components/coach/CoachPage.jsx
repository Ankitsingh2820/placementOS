import { useState, useRef } from 'react'
import { Zap, Upload, Copy, Check } from 'lucide-react'
import { streamCoach, parseResumePDF } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

function StepCard({ title, status, children }) {
  const borderCls = status === 'done' ? 'border-emerald-200' : status === 'loading' ? 'border-primary/40' : 'border-slate-200 opacity-40'
  return (
    <div className={`bg-white border rounded-xl p-5 transition-all ${borderCls}`}>
      <div className="flex items-center gap-2 mb-3">
        {status === 'done' && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
        {status === 'loading' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />}
        {status === 'idle' && <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
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
  const [resume, setResume] = useState(resumeText || '')
  const [fileStatus, setFileStatus] = useState('')
  const [running, setRunning] = useState(false)

  const [fit, setFit] = useState(null)
  const [tailored, setTailored] = useState('')
  const [outreach, setOutreach] = useState('')
  const [followup, setFollowup] = useState('')

  const [fitStatus, setFitStatus] = useState('idle')
  const [tailorStatus, setTailorStatus] = useState('idle')
  const [outreachStatus, setOutreachStatus] = useState('idle')
  const [followupStatus, setFollowupStatus] = useState('idle')

  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing...')
    try {
      const data = await parseResumePDF(file)
      setResume(data.text)
      setFileStatus(`Loaded "${file.name}"`)
    } catch (err) {
      setFileStatus(err.message)
    }
    e.target.value = ''
  }

  async function handleRun() {
    if (!resume.trim()) { alert('Paste your resume first.'); return }
    if (!currentJob) { alert('Select a job from the Jobs page first.'); return }

    setRunning(true)
    setFit(null); setTailored(''); setOutreach(''); setFollowup('')
    setFitStatus('loading'); setTailorStatus('idle'); setOutreachStatus('idle'); setFollowupStatus('idle')

    try {
      for await (const event of streamCoach({ resume, job: currentJob })) {
        if (event.step === 'fit') {
          setFit(event.data)
          setFitStatus('done')
          setTailorStatus('loading')
        } else if (event.step === 'tailor') {
          setTailored(p => p + event.text)
        } else if (event.step === 'tailor_done') {
          setTailorStatus('done')
          setOutreachStatus('loading')
        } else if (event.step === 'outreach') {
          setOutreach(event.data.message)
          setOutreachStatus('done')
          setFollowupStatus('loading')
        } else if (event.step === 'followup') {
          setFollowup(event.data.message)
          setFollowupStatus('done')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  const scoreColor = fit?.score >= 70 ? 'text-emerald-600' : fit?.score >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Application Coach</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentJob ? `Building full package for: ${currentJob.title} at ${currentJob.company}` : 'Select a job from the Jobs page, then come here'}
        </p>
      </div>

      {/* Resume input */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Resume</label>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium">
            <Upload size={13} /> Upload PDF
          </button>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
        </div>
        <textarea rows={6} value={resume} onChange={e => setResume(e.target.value)}
          placeholder="Paste your resume or upload PDF..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        {fileStatus && <p className="text-xs text-slate-400 mt-1">{fileStatus}</p>}
      </div>

      <div className="text-center mb-6">
        <button onClick={handleRun} disabled={running}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold px-10 py-3 rounded-xl text-base transition-colors shadow-sm shadow-primary/30">
          <Zap size={17} />
          {running ? 'Building Package…' : 'Build Full Application Package'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Step 1: Fit Score */}
        <StepCard title="Step 1 · Fit Analysis" status={fitStatus}>
          {fit ? (
            <div>
              <p className={`text-4xl font-bold mb-3 ${scoreColor}`}>{fit.score}<span className="text-lg text-slate-400">/100</span></p>
              <p className="text-sm text-slate-700 mb-3 italic">"{fit.verdict}"</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Strengths</p>
                  <ul className="space-y-1">{fit.strengths?.map((s, i) => <li key={i} className="text-xs text-slate-700">✓ {s}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Gaps</p>
                  <ul className="space-y-1">{fit.gaps?.map((g, i) => <li key={i} className="text-xs text-slate-700">✗ {g}</li>)}</ul>
                </div>
              </div>
            </div>
          ) : fitStatus === 'loading' ? <p className="text-sm text-slate-400 animate-pulse">Analyzing fit…</p> : <p className="text-sm text-slate-300">Waiting…</p>}
        </StepCard>

        {/* Step 2: Tailored Resume */}
        <StepCard title="Step 2 · Tailored Resume" status={tailorStatus}>
          {tailored ? (
            <div>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed max-h-64 overflow-y-auto">
                {tailored}
                {tailorStatus === 'loading' && <span className="inline-block w-1.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />}
              </pre>
              {tailorStatus === 'done' && <CopyBtn text={tailored} />}
            </div>
          ) : tailorStatus === 'loading' ? <p className="text-sm text-slate-400 animate-pulse">Tailoring resume…</p> : <p className="text-sm text-slate-300">Waiting…</p>}
        </StepCard>

        {/* Step 3: Outreach */}
        <StepCard title="Step 3 · Cold Outreach Message" status={outreachStatus}>
          {outreach ? (
            <div>
              <p className="text-sm text-slate-700 leading-relaxed">{outreach}</p>
              <CopyBtn text={outreach} />
            </div>
          ) : outreachStatus === 'loading' ? <p className="text-sm text-slate-400 animate-pulse">Writing outreach…</p> : <p className="text-sm text-slate-300">Waiting…</p>}
        </StepCard>

        {/* Step 4: Follow-up Email */}
        <StepCard title="Step 4 · Follow-up Email (send after 5 days)" status={followupStatus}>
          {followup ? (
            <div>
              <p className="text-sm text-slate-700 leading-relaxed">{followup}</p>
              <CopyBtn text={followup} />
            </div>
          ) : followupStatus === 'loading' ? <p className="text-sm text-slate-400 animate-pulse">Writing follow-up…</p> : <p className="text-sm text-slate-300">Waiting…</p>}
        </StepCard>
      </div>
    </div>
  )
}
