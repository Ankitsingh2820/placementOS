export async function fetchJobs() {
  const r = await fetch('/jobs')
  if (!r.ok) throw new Error('Failed to fetch jobs')
  return r.json()
}

export async function matchResume(resume) {
  const r = await fetch('/resume/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume }),
  })
  if (!r.ok) throw new Error('Failed to match resume')
  return r.json()
}

export async function parseResumePDF(file) {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch('/parse-resume', { method: 'POST', body: form })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.detail || 'Failed to parse PDF')
  }
  return r.json()
}

export async function* streamInterview({ resume, jd, history, action, questionsAsked }) {
  const r = await fetch('/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd, history, action, questions_asked: questionsAsked }),
  })
  if (!r.ok) throw new Error('Interview request failed')
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try { yield JSON.parse(line.slice(6)) } catch {}
    }
  }
}

export async function generateOutreach({ resume, company, role, github }) {
  const r = await fetch('/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, company, role, github }),
  })
  if (!r.ok) throw new Error('Failed to generate outreach')
  return r.json()
}
