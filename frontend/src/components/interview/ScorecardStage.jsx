import { useState } from 'react'
import { useTracker } from '../../hooks/useTracker'
import { analyzeGap } from '../../lib/api'

const DIMS = ['clarity', 'structure', 'relevance', 'specificity', 'confidence']

export function ScorecardStage({ scorecard, outreachMessage, setOutreachMessage, currentJob, onReset }) {
  const [copied, setCopied] = useState(false)
  const [gap, setGap] = useState(null)
  const [gapStatus, setGapStatus] = useState('idle') // idle | loading | done
  const { addRow } = useTracker()

  async function handleGapAnalysis() {
    if (!scorecard || !currentJob) return
    setGapStatus('loading')
    try {
      const jd = `${currentJob.title} at ${currentJob.company}\n\n${currentJob.description || ''}`
      const result = await analyzeGap({ scorecard, jd })
      setGap(result)
      setGapStatus('done')
    } catch {
      setGapStatus('idle')
    }
  }

  const overall = scorecard?.overall || {}
  const avgScore = DIMS.reduce((s, d) => s + (overall[d] || 0), 0) / DIMS.length

  function copyOutreach() {
    navigator.clipboard.writeText(outreachMessage)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
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

      {/* Gap Analyzer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Interview Gap Analysis</h3>
          {gapStatus === 'idle' && (
            <button onClick={handleGapAnalysis}
              className="text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors">
              Analyze Gaps
            </button>
          )}
        </div>

        {gapStatus === 'loading' && <p className="text-sm text-slate-400 animate-pulse">Analyzing your performance gaps...</p>}

        {gapStatus === 'done' && gap && (
          <div className="space-y-4">
            {gap.weak_areas?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-2">Weak Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {gap.weak_areas.map((a, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {gap.study_plan?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Study Plan</p>
                <div className="space-y-2">
                  {gap.study_plan.map((item, i) => (
                    <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-indigo-800 mb-0.5">{item.area}</p>
                      <p className="text-xs text-slate-600 mb-1">Issue: {item.issue}</p>
                      <p className="text-xs text-indigo-700">Exercise: {item.exercise}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gap.practice_prompts?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Practice These Questions</p>
                <div className="space-y-1.5">
                  {gap.practice_prompts.map((q, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700">
                      {i + 1}. {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
