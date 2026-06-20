import { useState, useMemo, useCallback, useEffect } from 'react'
import { fetchJobs, matchResume as apiMatch } from '../lib/api'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ q: '', eligibility: '', source: '', workType: '' })
  const [matchScores, setMatchScores] = useState({})
  const [matchStatus, setMatchStatus] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    try { setJobs(await fetchJobs()) }
    catch { setJobs([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase()
    let result = jobs
    if (q) result = result.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.tags || []).some(t => t.toLowerCase().includes(q))
    )
    if (filters.eligibility) result = result.filter(j => j.eligibility === filters.eligibility)
    if (filters.source)      result = result.filter(j => j.source === filters.source)
    if (filters.workType)    result = result.filter(j => j.work_type === filters.workType)
    if (Object.keys(matchScores).length)
      result = [...result].sort((a, b) => (matchScores[b.id] || 0) - (matchScores[a.id] || 0))
    return result
  }, [jobs, filters, matchScores])

  const matchResume = useCallback(async (resumeText) => {
    setMatchStatus('Analysing resume...')
    try {
      const data = await apiMatch(resumeText)
      const skills = (data.skills || []).map(s => s.toLowerCase())
      const scores = {}
      for (const j of jobs) {
        const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.description || ''}`.toLowerCase()
        const hits = skills.filter(s => hay.includes(s)).length
        scores[j.id] = skills.length ? Math.round((hits / skills.length) * 100) : 0
      }
      setMatchScores(scores)
      const matched = Object.values(scores).filter(s => s > 0).length
      setMatchStatus(`${skills.length} skills found · ${matched} jobs matched`)
    } catch {
      setMatchStatus('Could not analyse resume. Try again.')
    }
  }, [jobs])

  const clearMatch = useCallback(() => {
    setMatchScores({})
    setMatchStatus('')
  }, [])

  return { jobs: filtered, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch }
}
