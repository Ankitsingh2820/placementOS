import { useState, useCallback } from 'react'

const KEY = 'placements_tracker'
export const STATUSES = ['Saved', 'Applied', 'Outreach sent', 'Replied', 'Interview', 'Offer', 'Rejected']

export function useTracker() {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  const addRow = useCallback((job, prepScore = '') => {
    setRows(prev => {
      if (prev.find(r => r.url === job.url && job.url)) return prev
      const next = [{
        id: Date.now().toString(),
        company: job.company || '', role: job.title || '',
        source: job.source || '', url: job.url || '',
        date_applied: new Date().toISOString().slice(0, 10),
        prep_score: prepScore, status: 'Saved', followup_date: '',
      }, ...prev]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
    return true
  }, [])

  const updateRow = useCallback((id, patch) => {
    setRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteRow = useCallback((id) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

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
