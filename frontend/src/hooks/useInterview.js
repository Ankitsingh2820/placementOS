import { useState, useRef, useCallback } from 'react'
import { streamInterview, generateOutreach } from '../lib/api'

const SCORECARD_RE = /<scorecard>([\s\S]*?)<\/scorecard>/

export function useInterview() {
  const [stage, setStage] = useState('intake')
  const [history, setHistory] = useState([])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [question, setQuestion] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [scorecard, setScorecard] = useState(null)
  const [outreachMessage, setOutreachMessage] = useState('')

  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const historyRef = useRef([])
  const qAskedRef = useRef(0)

  const askNext = useCallback(async ({ resume, jd, action }) => {
    setLoadingQuestion(true)
    setQuestion('')
    let fullText = ''
    try {
      for await (const payload of streamInterview({
        resume, jd,
        history: historyRef.current,
        action,
        questionsAsked: qAskedRef.current,
      })) {
        if (payload.done) break
        if (payload.text) { fullText += payload.text; setQuestion(fullText) }
      }
    } finally { setLoadingQuestion(false) }

    const match = fullText.match(SCORECARD_RE)
    if (match) {
      try { setScorecard(JSON.parse(match[1])); setStage('scorecard') } catch {}
      return
    }

    historyRef.current = [...historyRef.current, { role: 'assistant', content: fullText }]
    setHistory([...historyRef.current])
    qAskedRef.current += 1
    setQuestionsAsked(qAskedRef.current)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(fullText))
    }
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'
    recognitionRef.current = recog
    transcriptRef.current = ''

    recog.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      transcriptRef.current += final
      setTranscript((transcriptRef.current + interim).trim())
    }
    recog.onstart = () => setIsListening(true)
    recog.onend   = () => setIsListening(false)
    recog.start()
    return true
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    return transcriptRef.current.trim()
  }, [])

  const submitAnswer = useCallback(({ resume, jd }) => {
    const answer = stopListening()
    if (!answer) return false
    historyRef.current = [...historyRef.current, { role: 'user', content: answer }]
    setHistory([...historyRef.current])
    setTranscript('')
    transcriptRef.current = ''
    askNext({ resume, jd, action: qAskedRef.current >= 8 ? 'end' : 'next' })
    return true
  }, [stopListening, askNext])

  const fetchOutreach = useCallback(async ({ resume, company, role, github }) => {
    try {
      const data = await generateOutreach({ resume, company, role, github })
      setOutreachMessage(data.message)
    } catch { setOutreachMessage('') }
  }, [])

  const reset = useCallback(() => {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    historyRef.current = []
    qAskedRef.current = 0
    setStage('intake'); setHistory([]); setQuestionsAsked(0)
    setQuestion(''); setTranscript(''); setIsListening(false)
    setLoadingQuestion(false); setScorecard(null); setOutreachMessage('')
  }, [])

  return {
    stage, setStage,
    history, questionsAsked,
    question, transcript,
    isListening, loadingQuestion,
    scorecard, outreachMessage, setOutreachMessage,
    askNext, startListening, stopListening, submitAnswer, fetchOutreach, reset,
  }
}
