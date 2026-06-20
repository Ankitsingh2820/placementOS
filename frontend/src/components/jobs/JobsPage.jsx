import { useJobs } from '../../hooks/useJobs'
import { useTracker } from '../../hooks/useTracker'
import { JobFilters } from './JobFilters'
import { JobCard } from './JobCard'
import { ResumeMatch } from './ResumeMatch'

export function JobsPage() {
  const { jobs, loading, filters, setFilters, matchScores, matchStatus, matchResume, clearMatch, refetch } = useJobs()
  const { addRow } = useTracker()

  function handleSave(job) {
    const added = addRow(job)
    // visual feedback via title flicker — simple approach
    if (!added) alert('Already in tracker.')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Remote Jobs</h2>
        <p className="text-slate-500 text-sm mt-0.5">India-friendly listings from top remote boards</p>
      </div>

      <JobFilters filters={filters} setFilters={setFilters} onRefresh={refetch} />
      <ResumeMatch matchStatus={matchStatus} onMatch={matchResume} onClear={clearMatch} />

      {loading && (
        <div className="text-center py-20 text-slate-400">Loading jobs...</div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="font-semibold">No jobs match your filters.</p>
          <p className="text-sm mt-1">Try adjusting your search or click Refresh.</p>
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
