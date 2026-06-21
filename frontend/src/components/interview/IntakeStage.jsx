import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { parseResumePDF } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

export function IntakeStage({ onStart }) {
  const { resumeText, setResumeText, githubUrl, setGithubUrl, currentJob } = useInterviewContext()
  const [jd, setJd] = useState(
    currentJob ? `${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}` : ''
  )
  const [fileStatus, setFileStatus] = useState('')
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing...')
    try {
      const data = await parseResumePDF(file)
      setResumeText(data.text)
      setFileStatus(`Loaded "${file.name}"`)
    } catch (err) {
      setFileStatus(err.message)
    }
    e.target.value = ''
  }

  function handleStart() {
    if (!resumeText.trim()) { alert('Please paste your resume first.'); return }
    if (!jd.trim()) { alert('Please paste a job description first.'); return }
    onStart({ resume: resumeText, jd, github: githubUrl })
  }

  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5'
  const textareaCls = 'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Interview Prep</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {currentJob ? `Prepping for: ${currentJob.title} at ${currentJob.company}` : 'Paste a job + your resume to start a mock interview'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="border border-slate-700/50 rounded-xl p-5" style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }}>
          <div className="flex justify-between items-center mb-3">
            <label className={labelCls}>Your Resume</label>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors">
              <Upload size={13} /> Upload PDF
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </div>
          <textarea rows={10} value={resumeText} onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..." className={textareaCls} />
          {fileStatus && <p className="text-xs text-slate-500 mt-2">{fileStatus}</p>}
        </div>

        <div className="border border-slate-700/50 rounded-xl p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' }}>
          <div>
            <label className={labelCls}>Job Description</label>
            <textarea rows={8} value={jd} onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..." className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>GitHub URL (optional)</label>
            <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/yourusername"
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button onClick={handleStart}
          className="bg-primary hover:bg-primary-hover text-white font-semibold px-10 py-3 rounded-xl text-base transition-colors shadow-sm shadow-primary/30">
          Start Mock Interview
        </button>
      </div>
    </div>
  )
}
