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

export async function* streamTailor({ resume, jd }) {
  const r = await fetch('/resume/tailor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd }),
  })
  if (!r.ok) throw new Error('Failed to tailor resume')
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

export async function* streamCoach({ resume, job }) {
  const r = await fetch('/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, job }),
  })
  if (!r.ok) throw new Error('Coach request failed')
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

export async function scoutJobs(query) {
  const r = await fetch('/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!r.ok) throw new Error('Scout request failed')
  return r.json()
}

export async function generateDigest(resume) {
  const r = await fetch('/scout/digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume }),
  })
  if (!r.ok) throw new Error('Digest request failed')
  return r.json()
}

export async function analyzeGap({ scorecard, jd }) {
  const r = await fetch('/interview/gap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scorecard, jd }),
  })
  if (!r.ok) throw new Error('Gap analysis request failed')
  return r.json()
}

export async function getAtsKeywords({ resume, jd }) {
  const r = await fetch('/resume/ats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd }),
  })
  if (!r.ok) throw new Error('ATS analysis request failed')
  return r.json()
}

export async function* streamChat({ message, history, resume, job }) {
  const r = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, resume: resume || '', job: job || {} }),
  })
  if (!r.ok) throw new Error('Chat request failed')
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = JSON.parse(line.slice(6))
      if (json.done) return
      if (json.text) yield json.text
    }
  }
}

export async function fetchProblems({ jobTitle = '', jobCompany = '', jobDescription = '' } = {}) {
  const params = new URLSearchParams()
  if (jobTitle) params.set('job_title', jobTitle)
  if (jobCompany) params.set('job_company', jobCompany)
  if (jobDescription) params.set('job_description', jobDescription.slice(0, 500))
  const r = await fetch(`/code/problems?${params}`)
  if (!r.ok) throw new Error('Failed to fetch problems')
  return r.json()
}

export async function evaluateCode({ problem, code, language }) {
  const r = await fetch('/code/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, code, language }),
  })
  if (!r.ok) throw new Error('Evaluation failed')
  return r.json()
}

export async function fetchHint({ problem, code, language }) {
  const r = await fetch('/code/hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, code, language }),
  })
  if (!r.ok) throw new Error('Hint request failed')
  return r.json()
}

export async function fetchCompanies() {
  const r = await fetch('/code/companies')
  if (!r.ok) throw new Error('Failed to fetch companies')
  return r.json()
}

export async function fetchCompanyProblems(company) {
  const r = await fetch(`/code/problems?company=${encodeURIComponent(company)}`)
  if (!r.ok) throw new Error('Failed to fetch company problems')
  return r.json()
}

export async function fetchProblemDetail(slug) {
  const r = await fetch(`/code/problem/${encodeURIComponent(slug)}`)
  if (!r.ok) throw new Error('Failed to fetch problem')
  return r.json()
}

export async function generateRoadmap({ domain, level }) {
  const r = await fetch('/career/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, level }),
  })
  if (!r.ok) throw new Error('Could not build roadmap')
  return r.json()
}
