import { useState } from 'react'
import { useInterviewContext } from '../../context/InterviewContext'

export function ResumeMatch({ matchStatus, onMatch, onClear }) {
  const { resumeText } = useInterviewContext()
  const [busy, setBusy] = useState(false)

  async function handleMatch() {
    if (!resumeText) return alert('Paste your resume text in the Interview Prep tab first.')
    setBusy(true)
    try { await onMatch(resumeText) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="text-sm text-slate-600 flex-1 min-w-0">
        {matchStatus || 'Match jobs to your resume for personalised rankings.'}
      </p>
      <button
        onClick={handleMatch}
        disabled={busy}
        className="text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors">
        {busy ? 'Analysing...' : 'Match my resume'}
      </button>
      {matchStatus && (
        <button
          onClick={onClear}
          className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors">
          Clear
        </button>
      )}
    </div>
  )
}
