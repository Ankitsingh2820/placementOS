import { useJobs } from '../../hooks/useJobs'
import { useTracker } from '../../hooks/useTracker'
import { JobFilters } from './JobFilters'
import { JobCard } from './JobCard'
import { ResumeMatch } from './ResumeMatch'
import { Briefcase, Globe, Wifi } from 'lucide-react'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 skeleton rounded-md w-3/4" />
            <div className="h-3 skeleton rounded-md w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-20 skeleton rounded-full" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 skeleton rounded-md w-full" />
          <div className="h-3 skeleton rounded-md w-4/5" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-12 skeleton rounded-md" />
          <div className="h-5 w-16 skeleton rounded-md" />
          <div className="h-5 w-10 skeleton rounded-md" />
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60 flex gap-2">
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 flex-1 skeleton rounded-xl" />
        <div className="h-8 w-16 skeleton rounded-xl" />
      </div>
    </div>
  )
}

function StatsBar({ jobs, loading }) {
  const remote = jobs.filter(j => j.work_type === 'remote').length
  const worldwide = jobs.filter(j => j.eligibility === 'green').length
  return (
    <div className="flex items-center gap-5 mb-5 px-1">
      <div className="flex items-center gap-2 text-slate-500">
        <Briefcase size={14} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">{loading ? '—' : jobs.length}</span>
        <span className="text-xs text-slate-400">jobs</span>
      </div>
      <div className="w-px h-4 bg-slate-200" />
      <div className="flex items-center gap-2 text-slate-500">
        <Wifi size={14} className="text-blue-400" />
        <span className="text-sm font-semibold text-slate-700">{loading ? '—' : remote}</span>
        <span className="text-xs text-slate-400">remote</span>
      </div>
      <div className="w-px h-4 bg-slate-200" />
      <div className="flex items-center gap-2 text-slate-500">
        <Globe size={14} className="text-emerald-400" />
        <span className="text-sm font-semibold text-slate-700">{loading ? '—' : worldwide}</span>
        <span className="text-xs text-slate-400">worldwide</span>
      </div>
    </div>
  )
}

export function JobsPage() {
  const { jobs, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch } = useJobs()
  const { addRow } = useTracker()

  function handleSave(job) {
    const added = addRow(job)
    if (!added) alert('Already in tracker.')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Remote Jobs</h1>
        <p className="text-slate-400 text-sm mt-1">India-friendly listings from top remote boards</p>
      </div>

      <JobFilters filters={filters} setFilters={setFilters} onRefresh={refetch} />
      <ResumeMatch matchStatus={matchStatus} onMatch={matchResume} onClear={clearMatch} />
      <StatsBar jobs={jobs} loading={loading} />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Briefcase size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No jobs match your filters</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">Try adjusting your search terms or click Refresh to reload the latest listings.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              matchScore={matchScores[job.id] || 0}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
