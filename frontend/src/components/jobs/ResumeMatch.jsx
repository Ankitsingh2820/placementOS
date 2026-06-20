import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react'
import { parseResumePDF } from '../../lib/api'

export function ResumeMatch({ matchStatus, onMatch, onClear }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fileStatus, setFileStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileStatus('Parsing PDF...')
    try {
      const data = await parseResumePDF(file)
      setText(data.text)
      setFileStatus(`Loaded "${file.name}" (${data.text.split(/\s+/).length} words)`)
    } catch (err) {
      setFileStatus(err.message || 'Could not parse PDF.')
    }
    e.target.value = ''
  }

  async function handleMatch() {
    if (!text.trim()) { alert('Paste your resume or upload a PDF first.'); return }
    setLoading(true)
    await onMatch(text)
    setLoading(false)
  }

  const hasMatch = !!matchStatus && matchStatus.includes('found')

  return (
    <div className="bg-white border border-slate-200 rounded-xl mb-5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles size={16} className="text-primary" />
          Match jobs to my resume
          {hasMatch && <span className="text-xs font-normal text-slate-500 ml-1">— {matchStatus}</span>}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="flex gap-4 mt-4 flex-wrap">
            {/* PDF upload */}
            <div className="flex flex-col gap-1.5 min-w-44">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upload PDF</label>
              <button onClick={() => fileRef.current?.click()}
                className="text-sm border border-dashed border-slate-300 hover:border-primary hover:text-primary text-slate-500 px-3 py-2 rounded-lg transition-colors text-left">
                Choose file...
              </button>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
              {fileStatus && <p className="text-xs text-slate-500">{fileStatus}</p>}
            </div>

            {/* Paste */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-56">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Or paste resume text</label>
              <textarea
                rows={4}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your resume here..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 items-center mt-4">
            <button onClick={handleMatch} disabled={loading}
              className="text-sm font-semibold bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
              {loading ? 'Analysing...' : 'Find matching jobs'}
            </button>
            {hasMatch && (
              <button onClick={onClear}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <X size={14} /> Clear match
              </button>
            )}
            {matchStatus && !hasMatch && (
              <span className="text-sm text-slate-500">{matchStatus}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
