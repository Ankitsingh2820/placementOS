import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { InterviewProvider } from './context/InterviewContext'
import { Sidebar } from './components/layout/Sidebar'
import { JobsPage } from './components/jobs/JobsPage'
import { InterviewPage } from './components/interview/InterviewPage'
import { TrackerPage } from './components/tracker/TrackerPage'
import { ResumeTailorPage } from './components/resume/ResumeTailorPage'
import { CoachPage } from './components/coach/CoachPage'

export default function App() {
  return (
    <BrowserRouter>
      <InterviewProvider>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/"          element={<JobsPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/tailor"    element={<ResumeTailorPage />} />
              <Route path="/coach"     element={<CoachPage />} />
              <Route path="/tracker"   element={<TrackerPage />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </InterviewProvider>
    </BrowserRouter>
  )
}
