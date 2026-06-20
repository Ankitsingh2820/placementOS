import { useState } from 'react'
import { useTracker } from '../../hooks/useTracker'

const DIMS = ['clarity', 'structure', 'relevance', 'specificity', 'confidence']

export function ScorecardStage({ scorecard, outreachMessage, setOutreachMessage, currentJob, onReset }) {
  const [copied, setCopied] = useState(false)
  const { addRow } = useTracker()

  const overall = scorecard?.overall || {}
  const avgScore = DIMS.reduce((s, d) => s + (overall[d] || 0), 0) / DIMS.length

  function copyOutreach() {
    navigator.clipboard.writeText(outreachMessage).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleAddTracker() {
    if (currentJob) {
      addRow(currentJob, avgScore.toFixed(1))
      alert('Added to tracker!')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Scorecard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Overall: {avgScore.toFixed(1)} / 5</p>
        </div>
        <button onClick={onReset}
          className="text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg transition-colors">
          New Session
        </button>
      </div>

      {/* Overall scores */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Overall</h3>
        <div className="grid grid-cols-5 gap-3">
          {DIMS.map(d => (
            <div key={d} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 capitalize mb-1">{d}</p>
              <p className="text-2xl font-bold text-primary">{overall[d] ?? '–'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Answer breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Answer Breakdown</h3>
        <div className="space-y-3">
          {(scorecard?.answers || []).map((a, i) => {
            const isWeak = i === scorecard.weakest_answer_index
            const avg = DIMS.reduce((s, d) => s + (a.scores?.[d] || 0), 0) / DIMS.length
            return (
              <div key={i} className={`rounded-xl p-4 border ${isWeak ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                {isWeak && <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full mb-2 inline-block">Weakest answer</span>}
                <p className="text-sm font-medium text-slate-800 mb-1">Q: {a.question}</p>
                <p className="text-xs text-slate-500 mb-2">Avg score: {avg.toFixed(1)}/5</p>
                {a.good_phrases?.length > 0 && (
                  <p className="text-xs text-emerald-700">✓ {a.good_phrases.join(' · ')}</p>
                )}
                {a.weak_phrases?.length > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">✗ {a.weak_phrases.join(' · ')}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rewritten answer */}
      {scorecard?.rewritten_answer && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Rewritten Strong Answer</h3>
          <div className="border-l-4 border-primary bg-blue-50 px-4 py-3 rounded-r-xl text-sm text-slate-800 leading-relaxed">
            {scorecard.rewritten_answer}
          </div>
        </div>
      )}

      {/* Outreach */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Cold Outreach Message</h3>
        {outreachMessage
          ? <>
              <textarea rows={5}
                value={outreachMessage}
                onChange={e => setOutreachMessage(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              />
              <div className="flex gap-3">
                <button onClick={copyOutreach}
                  className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors">
                  {copied ? 'Copied!' : 'Copy Message'}
                </button>
                <button onClick={handleAddTracker}
                  className="text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
                  Add to Tracker
                </button>
              </div>
            </>
          : <p className="text-sm text-slate-400 animate-pulse">Generating outreach message...</p>
        }
      </div>
    </div>
  )
}
