import { useRef, useEffect } from 'react'
import { useInterviewContext } from '../../context/InterviewContext'
import { useInterview } from '../../hooks/useInterview'
import { IntakeStage } from './IntakeStage'
import { SessionStage } from './SessionStage'
import { ScorecardStage } from './ScorecardStage'

export function InterviewPage() {
  const { currentJob, resumeText, githubUrl } = useInterviewContext()
  const iv = useInterview()

  // Store resume+jd+github across renders so callbacks always have current values
  const sessionRef = useRef({ resume: '', jd: '', github: '' })

  function handleStart({ resume, jd, github }) {
    sessionRef.current = { resume, jd, github }
    iv.setStage('session')
    iv.askNext({ resume, jd, action: 'next' })
  }

  function handleSubmit() {
    iv.submitAnswer({ resume: sessionRef.current.resume, jd: sessionRef.current.jd })
  }

  function handleEnd() {
    iv.stopListening()
    iv.askNext({ resume: sessionRef.current.resume, jd: sessionRef.current.jd, action: 'end' })
  }

  // Fetch outreach once scorecard arrives
  useEffect(() => {
    if (iv.scorecard && currentJob) {
      iv.fetchOutreach({
        resume: sessionRef.current.resume,
        company: currentJob.company,
        role: currentJob.title,
        github: sessionRef.current.github,
      })
    }
  }, [iv.scorecard])

  if (iv.stage === 'intake') return <IntakeStage onStart={handleStart} />

  if (iv.stage === 'session') return (
    <SessionStage
      question={iv.question}
      transcript={iv.transcript}
      isListening={iv.isListening}
      loadingQuestion={iv.loadingQuestion}
      questionsAsked={iv.questionsAsked}
      onListen={iv.isListening ? iv.stopListening : iv.startListening}
      onSubmit={handleSubmit}
      onEnd={handleEnd}
    />
  )

  if (iv.stage === 'scorecard') return (
    <ScorecardStage
      scorecard={iv.scorecard}
      outreachMessage={iv.outreachMessage}
      setOutreachMessage={iv.setOutreachMessage}
      currentJob={currentJob}
      onReset={iv.reset}
    />
  )

  return null
}
