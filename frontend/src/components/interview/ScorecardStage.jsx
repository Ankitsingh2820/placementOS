export function ScorecardStage({ scorecard, outreachMessage, setOutreachMessage, currentJob, onReset }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your Scorecard</h2>
        <pre className="text-xs text-slate-500 overflow-auto">{JSON.stringify(scorecard?.overall, null, 2)}</pre>
        <button onClick={onReset} className="mt-6 text-sm text-primary underline">Start New Session</button>
      </div>
    </div>
  )
}
