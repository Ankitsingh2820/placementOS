import { useState, useEffect } from 'react'
import { Wand2, Copy, Check, GitCompare, FileText } from 'lucide-react'
import { diffLines } from 'diff'
import { streamTailor, getAtsKeywords } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'
import { ResumeInput } from '../common/ResumeInput'

const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5'
const textareaCls = 'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30'

function DiffView({ original, tailored }) {
  const changes = diffLines(original, tailored, { ignoreWhitespace: false })
  return (
    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
      {changes.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400 pl-1 block">
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-red-500/15 text-red-400 line-through opacity-70 border-l-2 border-red-400 pl-1 block">
              {part.value}
            </span>
          )
        }
        return <span key={i} className="text-slate-300 block">{part.value}</span>
      })}
    </pre>
  )
}

export function ResumeTailorPage() {
  const { currentJob, resumeText } = useInterviewContext()
  const [jd, setJd] = useState(
    currentJob ? `${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}` : ''
  )
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle')
  const [ats, setAts] = useState(null)
  const [atsStatus, setAtsStatus] = useState('idle')

  useEffect(() => {
    if (currentJob) {
      setJd(`${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}`)
    }
  }, [currentJob])
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('plain')

  async function handleAts() {
    if (!resumeText.trim()) { alert('Paste your resume first.'); return }
    if (!jd.trim()) { alert('Paste a job description first.'); return }
    setAtsStatus('loading'); setAts(null)
    try {
      const result = await getAtsKeywords({ resume: resumeText, jd })
      setAts(result); setAtsStatus('done')
    } catch {
      setAtsStatus('idle')
    }
  }

  async function handleTailor() {
    if (!resumeText.trim()) { alert('Please paste your resume first.'); return }
    if (!jd.trim()) { alert('Please paste a job description first.'); return }
    setOutput(''); setStatus('loading'); setCopied(false); setViewMode('plain')
    try {
      for await (const chunk of streamTailor({ resume: resumeText, jd })) {
        if (chunk.done) { setStatus('done'); return }
        if (chunk.text) setOutput(prev => prev + chunk.text)
      }
      setStatus('done')
    } catch {
      setStatus('error')
      setOutput('Something went wrong. Please try again.')
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const showOutput = output || status === 'loading'
  const panelStyle = { background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Resume Tailor</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Rewrite your resume to match a job description — facts preserved, keywords aligned
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Resume input */}
        <ResumeInput theme="dark" rows={14} label="Your Resume" />

        {/* JD input */}
        <div className="border border-slate-700/50 rounded-xl p-5" style={panelStyle}>
          <label className={labelCls}>Job Description</label>
          <textarea rows={14} value={jd} onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here..." className={textareaCls} />
        </div>
      </div>

      {/* ATS Keywords Panel */}
      <div className="mt-5 border border-slate-700/50 rounded-xl p-5" style={panelStyle}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ATS Keyword Analysis</h3>
            <p className="text-xs text-slate-600 mt-0.5">Check which JD keywords your resume is missing before tailoring</p>
          </div>
          <button onClick={handleAts} disabled={atsStatus === 'loading'}
            className="text-xs font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            {atsStatus === 'loading' ? 'Scanning…' : 'Scan Keywords'}
          </button>
        </div>

        {atsStatus === 'loading' && <p className="text-sm text-slate-500 animate-pulse">Extracting keywords…</p>}

        {atsStatus === 'done' && ats && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-800 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${ats.ats_score}%` }} />
              </div>
              <span className={`text-sm font-bold ${ats.ats_score >= 70 ? 'text-emerald-400' : ats.ats_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {ats.ats_score}% ATS score
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-400 mb-1.5">Present in resume ({ats.present?.length})</p>
                <div className="flex flex-wrap gap-1">
                  {ats.present?.map((k, i) => (
                    <span key={i} className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-400 mb-1.5">Missing from resume ({ats.missing?.length})</p>
                <div className="flex flex-wrap gap-1">
                  {ats.missing?.map((k, i) => (
                    <span key={i} className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {ats.missing?.length > 0 && (
              <p className="text-xs text-slate-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                Tip: Click <strong className="text-amber-400">Tailor Resume</strong> below — the AI will naturally weave in missing keywords.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 text-center">
        <button onClick={handleTailor} disabled={status === 'loading'}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold px-10 py-3 rounded-xl text-base transition-colors shadow-sm shadow-primary/30">
          <Wand2 size={17} />
          {status === 'loading' ? 'Tailoring…' : 'Tailor Resume'}
        </button>
      </div>

      {showOutput && (
        <div className="mt-6 border border-slate-700/50 rounded-xl p-5" style={panelStyle}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <label className={labelCls + ' mb-0'}>Tailored Resume</label>
              {status === 'done' && (
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setViewMode('plain')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      viewMode === 'plain' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}>
                    <FileText size={12} /> Plain
                  </button>
                  <button onClick={() => setViewMode('diff')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      viewMode === 'diff' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}>
                    <GitCompare size={12} /> Changes
                  </button>
                </div>
              )}
            </div>
            {status === 'done' && (
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors">
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            )}
          </div>

          {viewMode === 'diff' && status === 'done' && (
            <div className="flex gap-4 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/15 border-l-2 border-emerald-400" /> Added</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500/15 border-l-2 border-red-400" /> Removed</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Unchanged</span>
            </div>
          )}

          {status === 'loading' && !output && (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              Rewriting your resume…
            </div>
          )}

          {viewMode === 'diff' && status === 'done' ? (
            <DiffView original={resumeText} tailored={output} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed">
              {output}
              {status === 'loading' && output && (
                <span className="inline-block w-1.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
