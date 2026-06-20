export function JobFilters({ filters, setFilters, onRefresh }) {
  const set = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  const inputCls = 'bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="flex flex-wrap gap-3 items-center mb-5">
      <input
        type="text" placeholder="Search title, company, stack..."
        value={filters.q} onChange={set('q')}
        className={`${inputCls} flex-1 min-w-48`}
      />
      <select value={filters.eligibility} onChange={set('eligibility')} className={inputCls}>
        <option value="">All eligibility</option>
        <option value="green">Worldwide</option>
        <option value="yellow">Check timezone</option>
      </select>
      <select value={filters.source} onChange={set('source')} className={inputCls}>
        <option value="">All boards</option>
        {['WWR','RemoteOK','Remotive','Himalayas','JSearch','Adzuna'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select value={filters.workType} onChange={set('workType')} className={inputCls}>
        <option value="">Remote &amp; Onsite</option>
        <option value="remote">Remote only</option>
        <option value="hybrid">Hybrid</option>
        <option value="onsite">Onsite only</option>
      </select>
      <button onClick={onRefresh}
        className="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
        Refresh
      </button>
    </div>
  )
}
