import { useTracker, STATUSES } from '../../hooks/useTracker'
import { Trash2, Download } from 'lucide-react'

export function TrackerPage() {
  const { rows, updateRow, deleteRow, exportCSV } = useTracker()

  const selectCls = 'border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Tracker</h2>
          <p className="text-slate-500 text-sm mt-0.5">{rows.length} application{rows.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <p className="font-semibold text-lg">No applications yet</p>
          <p className="text-sm mt-1">Click "Save" on a job card or "Add to Tracker" after a mock session.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Company', 'Role', 'Board', 'Date Applied', 'Prep Score', 'Status', 'Follow-up', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">
                      {row.url
                        ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.company}</a>
                        : row.company}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-44 truncate">{row.role}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{row.source || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.date_applied || '—'}</td>
                    <td className="px-4 py-3">
                      {row.prep_score
                        ? <span className="text-xs font-bold text-primary">{row.prep_score}/5</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select value={row.status} onChange={e => updateRow(row.id, { status: e.target.value })} className={selectCls}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="date" value={row.followup_date || ''}
                        onChange={e => updateRow(row.id, { followup_date: e.target.value })}
                        className={selectCls} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteRow(row.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
