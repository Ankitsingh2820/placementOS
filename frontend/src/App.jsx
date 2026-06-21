import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { InterviewProvider } from './context/InterviewContext'
import { Sidebar } from './components/layout/Sidebar'
import { JobsPage } from './components/jobs/JobsPage'
import { InterviewPage } from './components/interview/InterviewPage'
import { TrackerPage } from './components/tracker/TrackerPage'
import { ResumeTailorPage } from './components/resume/ResumeTailorPage'
import { CoachPage } from './components/coach/CoachPage'
import { ScoutPage } from './components/scout/ScoutPage'
import { ChatPage } from './components/chat/ChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <InterviewProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: '#080E1A' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/"          element={<JobsPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/tailor"    element={<ResumeTailorPage />} />
              <Route path="/coach"     element={<CoachPage />} />
              <Route path="/tracker"   element={<TrackerPage />} />
              <Route path="/scout"     element={<ScoutPage />} />
              <Route path="/chat"      element={<ChatPage />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </InterviewProvider>
    </BrowserRouter>
  )
}
