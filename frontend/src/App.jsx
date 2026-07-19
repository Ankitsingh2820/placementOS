import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Menu, Cpu } from 'lucide-react'
import { InterviewProvider } from './context/InterviewContext'
import { Sidebar } from './components/layout/Sidebar'
import { JobsPage } from './components/jobs/JobsPage'
import { InterviewPage } from './components/interview/InterviewPage'
import { TrackerPage } from './components/tracker/TrackerPage'
import { ResumeTailorPage } from './components/resume/ResumeTailorPage'
import { CoachPage } from './components/coach/CoachPage'
import { ScoutPage } from './components/scout/ScoutPage'
import { ChatPage } from './components/chat/ChatPage'
import { CodePage } from './components/code/CodePage'
import { CareerPage } from './components/career/CareerPage'

export default function App() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <BrowserRouter>
      <InterviewProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: '#080E1A' }}>
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile top bar — hidden on lg+ where the sidebar is always visible */}
            <header className="lg:hidden flex items-center gap-3 px-4 h-14 shrink-0 border-b border-sidebar-border bg-sidebar">
              <button
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                  <Cpu size={12} className="text-white" />
                </div>
                <span className="text-white font-semibold text-sm tracking-tight">PlacementOS</span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
              <Routes>
                <Route path="/"          element={<JobsPage />} />
                <Route path="/interview" element={<InterviewPage />} />
                <Route path="/tailor"    element={<ResumeTailorPage />} />
                <Route path="/coach"     element={<CoachPage />} />
                <Route path="/tracker"   element={<TrackerPage />} />
                <Route path="/scout"     element={<ScoutPage />} />
                <Route path="/chat"      element={<ChatPage />} />
                <Route path="/code"      element={<CodePage />} />
                <Route path="/career"    element={<CareerPage />} />
                <Route path="*"          element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </InterviewProvider>
    </BrowserRouter>
  )
}
