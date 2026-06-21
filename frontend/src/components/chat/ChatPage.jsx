import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, FileText, TrendingUp, Target, Award, Briefcase, Globe } from 'lucide-react'
import { streamChat } from '../../lib/api'
import { useInterviewContext } from '../../context/InterviewContext'

const SUGGESTIONS = [
  { icon: FileText,   label: 'Resume Bullets',   text: 'How can I improve my resume bullet points to be more impactful?' },
  { icon: TrendingUp, label: 'Skills Gap',        text: 'What skills should I learn to land remote dev jobs faster?' },
  { icon: Target,     label: 'Quantify Impact',   text: 'How do I quantify achievements on my resume with no metrics?' },
  { icon: Award,      label: 'Certifications',    text: 'What certifications are actually worth getting for a developer role?' },
  { icon: Briefcase,  label: 'Employment Gap',    text: 'How should I explain a gap in my employment history?' },
  { icon: Globe,      label: 'Remote Strategy',   text: 'How do I position myself to get hired for remote-first companies?' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
      ))}
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const isEmpty = !msg.content && msg.streaming

  return (
    <div className={`flex gap-3 items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mb-0.5 ${
        isUser
          ? 'bg-primary shadow-sm shadow-primary/40'
          : 'bg-gradient-to-br from-indigo-600 to-violet-700 shadow-sm shadow-indigo-500/30'
      }`}>
        {isUser
          ? <User size={13} className="text-white" />
          : <Bot size={13} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-white rounded-br-sm shadow-md shadow-primary/20'
            : 'bg-slate-800/80 border border-slate-700/40 text-slate-200 rounded-bl-sm shadow-md shadow-black/20'
        }`}>
          {isEmpty ? <TypingDots /> : (
            <>
              {msg.content}
              {msg.streaming && msg.content && (
                <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-middle rounded-full" />
              )}
            </>
          )}
        </div>
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
      for await (const chunk of streamChat({ message: userMsg, history, resume: resumeText, job: currentJob })) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.', streaming: false } : m
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
    <div className="flex flex-col h-full min-h-screen">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="relative shrink-0 px-6 py-5 border-b border-slate-700/40 overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1a1f35 100%)' }}>
        {/* subtle glow */}
        <div className="absolute top-0 left-0 w-48 h-24 rounded-full opacity-20 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)', filter: 'blur(20px)' }} />

        <div className="relative flex items-center gap-4">
          {/* Bot icon */}
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
                 style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              <Bot size={20} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-mint rounded-full border-2 border-slate-900 animate-pulse" />
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">AI Career Coach</h2>
              <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                llama-3.3-70b
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentJob
                ? `📌 ${currentJob.title} at ${currentJob.company}`
                : resumeText
                  ? '📄 Resume loaded — ask anything'
                  : 'Resume improvements · Career advice · Job strategy'}
            </p>
          </div>

          {/* Context pills */}
          <div className="ml-auto flex items-center gap-2">
            {resumeText && (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                Resume ✓
              </span>
            )}
            {currentJob && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full">
                Job ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center pt-6 gap-8">
            {/* Hero */}
            <div className="text-center">
              <div className="relative inline-block mb-5">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40"
                     style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
                  <Sparkles size={32} className="text-white" />
                </div>
                <div className="absolute inset-0 rounded-3xl opacity-40 blur-xl"
                     style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                I'm your personal career coach. Ask me anything about your resume, skills, or job search strategy.
              </p>
            </div>

            {/* Suggestion grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
                <button key={label} onClick={() => send(text)}
                  className="group flex flex-col gap-2 text-left p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 hover:bg-indigo-500/8 hover:border-indigo-500/40 transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/25 transition-colors">
                    <Icon size={15} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300 leading-snug">{label}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{text}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={msg.id ?? i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pb-6 pt-4 border-t border-slate-700/40"
           style={{ background: 'linear-gradient(to top, #080E1A 80%, transparent)' }}>
        <div className="relative flex items-end gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/10 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your resume, skills, career strategy…"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none max-h-36 leading-relaxed"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                : '#1E293B',
              boxShadow: input.trim() && !loading ? '0 4px 14px rgba(79,70,229,0.4)' : 'none',
            }}>
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-2.5 text-center tracking-wide">
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
