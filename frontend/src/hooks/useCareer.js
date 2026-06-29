import { useState, useCallback } from 'react'

const KEY = 'placements_career'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function useCareer() {
  const [track, setTrackState] = useState(load)

  const setTrack = useCallback(({ domain, level, resume, roadmap }) => {
    const next = { domain, level, resume: resume || '', roadmap, completedSteps: [] }
    localStorage.setItem(KEY, JSON.stringify(next))
    setTrackState(next)
  }, [])

  const toggleStep = useCallback((stepId) => {
    setTrackState(prev => {
      if (!prev) return prev
      const has = prev.completedSteps.includes(stepId)
      const completedSteps = has
        ? prev.completedSteps.filter(id => id !== stepId)
        : [...prev.completedSteps, stepId]
      const next = { ...prev, completedSteps }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetTrack = useCallback(() => {
    localStorage.removeItem(KEY)
    setTrackState(null)
  }, [])

  const totalSteps = track?.roadmap?.modules?.reduce((n, m) => n + m.steps.length, 0) || 0
  const completed = track?.completedSteps?.length || 0
  const readiness = totalSteps ? Math.round((completed / totalSteps) * 100) : 0

  return { track, setTrack, toggleStep, resetTrack, readiness, totalSteps, completed }
}
