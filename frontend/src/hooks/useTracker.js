import { useState, useCallback } from 'react'

const KEY = 'placements_tracker'
export const STATUSES = ['Saved', 'Applied', 'Outreach sent', 'Replied', 'Interview', 'Offer', 'Rejected']

export function useTracker() {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  const persist = useCallback((next) => {
    setRows(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }, [])

  const addRow = useCallback((job, prepScore = '') => {
    if (rows.find(r => r.url === job.url && job.url)) return false
    persist([{
      id: Date.now().toString(),
      company: job.company || '', role: job.title || '',
      source: job.source || '', url: job.url || '',
      date_applied: new Date().toISOString().slice(0, 10),
      prep_score: prepScore, status: 'Saved', followup_date: '',
    }, ...rows])
    return true
  }, [rows, persist])

  const updateRow = useCallback((id, patch) => {
    persist(rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [rows, persist])

  const deleteRow = useCallback((id) => persist(rows.filter(r => r.id !== id)), [rows, persist])

  const exportCSV = useCallback(() => {
    const headers = ['Company', 'Role', 'Source', 'Date Applied', 'Prep Score', 'Status', 'Follow-up', 'URL']
    const lines = [headers.join(','), ...rows.map(r =>
      [r.company, r.role, r.source, r.date_applied, r.prep_score, r.status, r.followup_date, r.url]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    )]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `placements-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }, [rows])

  return { rows, addRow, updateRow, deleteRow, exportCSV }
}
