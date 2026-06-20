import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')

  return (
    <InterviewContext.Provider value={{ currentJob, setCurrentJob, resumeText, setResumeText, githubUrl, setGithubUrl }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterviewContext = () => useContext(InterviewContext)
