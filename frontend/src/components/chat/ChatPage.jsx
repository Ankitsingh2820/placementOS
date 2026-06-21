import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { streamChat } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

const SUGGESTIONS = [
  'How can I improve my resume bullet points?',
  'What skills should I add for remote jobs?',
  'Review my resume summary section',
  'How do I quantify achievements on my resume?',
  'What certifications are worth getting for a dev role?',
  'How should I explain a gap in my employment?',
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
        isUser ? 'bg-primary' : 'bg-slate-700'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-slate-300" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-white rounded-tr-sm'
          : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-sm'
      }`}>
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}

export function ChatPage() {
  const { resumeText, currentJob } = useInterviewContext()
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const userMsg = text.trim()
    if (!userMsg || loading) return
    setInput('')

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const assistantId = Date.now()
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, id: assistantId }])

    try {
      for await (const chunk of streamChat({
        message: userMsg,
        history,
        resume: resumeText,
        job: currentJob,
      })) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        ))
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
          : m
      ))
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ))
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Career Coach</h2>
            <p className="text-xs text-slate-500">
              {currentJob
                ? `Context: ${currentJob.title} at ${currentJob.company}`
                : resumeText ? 'Resume loaded · Ask anything' : 'Ask about resume improvements & career growth'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-xs text-slate-500">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                <Sparkles size={28} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Career Coach</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Ask me anything about your resume, career path, or how to land remote jobs.
              </p>
            </div>

            {/* Quick suggestions */}
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-xs text-slate-300 bg-slate-800/60 border border-slate-700/50 hover:border-primary/40 hover:bg-primary/5 px-4 py-2.5 rounded-xl transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={msg.id ?? i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-700/50 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about resume improvements, skills, career advice…"
            className="flex-1 bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
