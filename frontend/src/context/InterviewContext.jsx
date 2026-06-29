import { createContext, useContext, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [seedChat, setSeedChat] = useState('')

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
