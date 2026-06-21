import { useState, useRef, useEffect } from 'react'
import { Upload, Wand2, Copy, Check, GitCompare, FileText } from 'lucide-react'
import { diffLines } from 'diff'
import { parseResumePDF, streamTailor, getAtsKeywords } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'
const textareaCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-slate-800'

function DiffView({ original, tailored }) {
  const changes = diffLines(original, tailored, { ignoreWhitespace: false })
  return (
    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
      {changes.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-emerald-50 text-emerald-800 border-l-2 border-emerald-400 pl-1 block">
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-red-50 text-red-700 line-through opacity-70 border-l-2 border-red-400 pl-1 block">
              {part.value}
            </span>
          )
        }
        return <span key={i} className="text-slate-700 block">{part.value}</span>
      })}
    </pre>
  )
}

export function ResumeTailorPage() {
  const { currentJob, resumeText } = useInterviewContext()
  const [resume, setResume] = useState(resumeText || '')
  const [jd, setJd] = useState(
    currentJob
      ? `${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}`
      : ''
  )
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle')
  const [ats, setAts] = useState(null)
  const [atsStatus, setAtsStatus] = useState('idle') // idle | loading | done

  useEffect(() => {
    if (currentJob) {
      setJd(`${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}`)
    }
  }, [currentJob])
  const [fileStatus, setFileStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('plain') // plain | diff
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

  async function handleAts() {
    if (!resume.trim()) { alert('Paste your resume first.'); return }
    if (!jd.trim()) { alert('Paste a job description first.'); return }
    setAtsStatus('loading')
    setAts(null)
    try {
      const result = await getAtsKeywords({ resume, jd })
      setAts(result)
      setAtsStatus('done')
    } catch {
      setAtsStatus('idle')
    }
  }

  async function handleTailor() {
    if (!resume.trim()) { alert('Please paste your resume first.'); return }
    if (!jd.trim()) { alert('Please paste a job description first.'); return }

    setOutput('')
    setStatus('loading')
    setCopied(false)
    setViewMode('plain')

    try {
      for await (const chunk of streamTailor({ resume, jd })) {
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showOutput = output || status === 'loading'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Resume Tailor</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Rewrite your resume to match a job description — facts preserved, keywords aligned
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Resume input */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <label className={labelCls}>Your Resume</label>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors">
              <Upload size={13} /> Upload PDF
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </div>
          <textarea rows={14} value={resume} onChange={e => setResume(e.target.value)}
            placeholder="Paste your resume text here..." className={textareaCls} />
          {fileStatus && <p className="text-xs text-slate-400 mt-2">{fileStatus}</p>}
        </div>

        {/* JD input */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <label className={labelCls}>Job Description</label>
          <textarea rows={14} value={jd} onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here..." className={textareaCls} />
        </div>
      </div>

      {/* ATS Keywords Panel */}
      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ATS Keyword Analysis</h3>
            <p className="text-xs text-slate-400 mt-0.5">Check which JD keywords your resume is missing before tailoring</p>
          </div>
          <button onClick={handleAts} disabled={atsStatus === 'loading'}
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors">
            {atsStatus === 'loading' ? 'Scanning…' : 'Scan Keywords'}
          </button>
        </div>

        {atsStatus === 'loading' && <p className="text-sm text-slate-400 animate-pulse">Extracting keywords…</p>}

        {atsStatus === 'done' && ats && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${ats.ats_score}%` }} />
              </div>
              <span className={`text-sm font-bold ${ats.ats_score >= 70 ? 'text-emerald-600' : ats.ats_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {ats.ats_score}% ATS score
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1.5">Present in resume ({ats.present?.length})</p>
                <div className="flex flex-wrap gap-1">
                  {ats.present?.map((k, i) => (
                    <span key={i} className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1.5">Missing from resume ({ats.missing?.length})</p>
                <div className="flex flex-wrap gap-1">
                  {ats.missing?.map((k, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {ats.missing?.length > 0 && (
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Tip: Click <strong>Tailor Resume</strong> below — the AI will naturally weave in missing keywords.
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
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <label className={labelCls + ' mb-0'}>Tailored Resume</label>
              {status === 'done' && (
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setViewMode('plain')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      viewMode === 'plain' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    <FileText size={12} /> Plain
                  </button>
                  <button onClick={() => setViewMode('diff')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      viewMode === 'diff' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border-l-2 border-emerald-400" /> Added</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-50 border-l-2 border-red-400" /> Removed</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-white border border-slate-200" /> Unchanged</span>
            </div>
          )}

          {status === 'loading' && !output && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              Rewriting your resume…
            </div>
          )}

          {viewMode === 'diff' && status === 'done' ? (
            <DiffView original={resume} tailored={output} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">
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
