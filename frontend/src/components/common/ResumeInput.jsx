import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { parseResumePDF } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

const THEMES = {
  dark: {
    wrap: 'border border-slate-700/50 rounded-xl p-5',
    wrapStyle: { background: 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)' },
    label: 'text-xs font-semibold text-slate-400 uppercase tracking-wide',
    upload: 'flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium',
    textarea: 'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30',
    status: 'text-xs text-slate-500 mt-2',
  },
  light: {
    wrap: 'bg-white border border-slate-200 rounded-xl p-4',
    wrapStyle: {},
    label: 'text-xs font-semibold text-slate-500 uppercase tracking-wide',
    upload: 'flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium',
    textarea: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30',
    status: 'text-xs text-slate-500 mt-2',
  },
}

export function ResumeInput({ theme = 'dark', rows = 8, label = 'Your Resume', className = '' }) {
  const { resumeText, setResumeText } = useInterviewContext()
  const [fileStatus, setFileStatus] = useState('')
  const fileRef = useRef(null)
  const t = THEMES[theme] || THEMES.dark

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing PDF...')
    try {
      const data = await parseResumePDF(file)
      setResumeText(data.text)
      setFileStatus(`Loaded "${file.name}" (${data.text.split(/\s+/).length} words)`)
    } catch (err) {
      setFileStatus(err.message || 'Could not parse PDF.')
    }
    e.target.value = ''
  }

  return (
    <div className={`${t.wrap} ${className}`} style={t.wrapStyle}>
      <div className="flex justify-between items-center mb-3">
        <label className={t.label}>{label}</label>
        <button type="button" onClick={() => fileRef.current?.click()} className={t.upload}>
          <Upload size={13} /> Upload PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
      </div>
      <textarea rows={rows} value={resumeText} onChange={e => setResumeText(e.target.value)}
        placeholder="Paste your resume text here..." className={t.textarea} />
      {fileStatus && <p className={t.status}>{fileStatus}</p>}
    </div>
  )
}
