import { useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'

export function JobFilters({ filters, setFilters, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/jobs/refresh', { method: 'POST' })
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }
  const set = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  const selectCls = 'bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer hover:border-slate-600 transition-colors'

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <div className="relative flex-1 min-w-52">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text" placeholder="Search title, company, stack..."
          value={filters.q} onChange={set('q')}
          className="w-full bg-slate-800 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-slate-600 transition-colors"
        />
      </div>

      <select value={filters.eligibility} onChange={set('eligibility')} className={selectCls}>
        <option value="">All regions</option>
        <option value="green">Worldwide</option>
        <option value="yellow">Check timezone</option>
      </select>

      <select value={filters.source} onChange={set('source')} className={selectCls}>
        <option value="">All boards</option>
        {['WWR','RemoteOK','Remotive','Himalayas','JSearch','Adzuna'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select value={filters.workType} onChange={set('workType')} className={selectCls}>
        <option value="">All types</option>
        <option value="remote">Remote only</option>
        <option value="hybrid">Hybrid</option>
        <option value="onsite">Onsite</option>
      </select>

      <button onClick={handleRefresh} disabled={refreshing}
        className="flex items-center gap-2 text-sm font-medium bg-slate-800 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-700 text-slate-300 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors">
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Fetching…' : 'Refresh'}
      </button>
    </div>
  )
}
