import { Search, RefreshCw } from 'lucide-react'

export function JobFilters({ filters, setFilters, onRefresh }) {
  const set = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  const selectCls = 'bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer hover:border-slate-300 transition-colors'

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      {/* Search input */}
      <div className="relative flex-1 min-w-52">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text" placeholder="Search title, company, stack..."
          value={filters.q} onChange={set('q')}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-slate-300 transition-colors"
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

      <button onClick={onRefresh}
        className="flex items-center gap-2 text-sm font-medium bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl transition-colors">
        <RefreshCw size={13} />
        Refresh
      </button>
    </div>
  )
}
