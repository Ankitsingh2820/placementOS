import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)
const RESUME_KEY = 'placements_resume'

export function InterviewProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)
  const [resumeText, setResumeTextState] = useState(() => {
    try { return localStorage.getItem(RESUME_KEY) || '' } catch { return '' }
  })
  const [githubUrl, setGithubUrl] = useState('')
  const [seedChat, setSeedChat] = useState('')

  const setResumeText = (value) => {
    setResumeTextState(value)
    try {
      if (value) localStorage.setItem(RESUME_KEY, value)
      else localStorage.removeItem(RESUME_KEY)
    } catch { /* ignore quota / private-mode errors */ }
  }

  return (
    <InterviewContext.Provider value={{
      currentJob, setCurrentJob,
      resumeText, setResumeText,
      githubUrl, setGithubUrl,
      seedChat, setSeedChat,
    }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterviewContext = () => useContext(InterviewContext)
