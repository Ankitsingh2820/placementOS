import { Mic, CheckCircle, StopCircle } from 'lucide-react'

const MAX_Q = 8

export function SessionStage({ question, transcript, isListening, loadingQuestion, questionsAsked, onListen, onSubmit, onEnd }) {
  const pct = Math.round((questionsAsked / MAX_Q) * 100)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mock Interview</h3>
          <span className="text-xs text-slate-400">Question {questionsAsked} of {MAX_Q}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full mb-6">
          <div className="h-full bg-mint rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="border-l-4 border-primary bg-blue-50 rounded-r-xl px-5 py-4 mb-5 min-h-16">
          {loadingQuestion
            ? <p className="text-slate-400 text-sm animate-pulse">Generating question...</p>
            : <p className="text-slate-800 leading-relaxed">{question || 'Preparing your first question...'}</p>
          }
        </div>

        <div className="border border-dashed border-slate-200 rounded-xl px-4 py-3 min-h-20 mb-5 bg-slate-50">
          <p className={`text-sm leading-relaxed ${transcript ? 'text-slate-700' : 'text-slate-400'}`}>
            {transcript || 'Your answer will appear here as you speak...'}
          </p>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {isListening
            ? <button onClick={onListen}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 font-medium px-4 py-2.5 rounded-lg text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </button>
            : <button onClick={onListen} disabled={loadingQuestion}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                <Mic size={16} /> Start Speaking
              </button>
          }
          <button onClick={onSubmit} disabled={!transcript && !isListening}
            className="flex items-center gap-2 bg-mint hover:bg-mint-hover disabled:opacity-40 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
            <CheckCircle size={16} /> Done Answering
          </button>
          <button onClick={onEnd}
            className="ml-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors">
            <StopCircle size={15} /> End Session
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Tip: Click "Done Answering" when you finish — you will never be cut off.
        </p>
      </div>
    </div>
  )
}
