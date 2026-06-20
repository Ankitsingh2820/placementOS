// ── State ──────────────────────────────────────────────────────────────────
const state = {
  jobs: [],
  history: [],
  questionsAsked: 0,
  currentTranscript: '',
  recognition: null,
  currentJob: null,
  scorecard: null,
  matchSkills: [],   // extracted from resume by /resume/match
  matchScores: {},   // { jobId: 0-100 }
};

const MAX_Q = 8;
const TABS = ['jobs', 'interview', 'tracker'];
const TRACKER_KEY = 'placements_tracker';
const STATUSES = ['Saved', 'Applied', 'Outreach sent', 'Replied', 'Interview', 'Offer', 'Rejected'];

// ── Utilities ──────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

// ── Resume PDF Upload ──────────────────────────────────────────────────────
async function uploadResumePDF(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('resume-upload-status');
  status.style.color = '#6366f1';
  status.textContent = 'Parsing PDF...';

  const form = new FormData();
  form.append('file', file);

  try {
    const r = await fetch('/parse-resume', { method: 'POST', body: form });
    const data = await r.json();

    if (!r.ok) {
      status.style.color = '#ef4444';
      status.textContent = data.detail || 'Could not parse PDF.';
      return;
    }

    document.getElementById('resume-input').value = data.text;
    status.style.color = '#059669';
    status.textContent = `Resume loaded from "${file.name}" (${data.text.split(/\s+/).length} words)`;
  } catch (e) {
    status.style.color = '#ef4444';
    status.textContent = 'Upload failed. Try pasting your resume instead.';
  }

  // Reset the input so the same file can be re-uploaded if needed
  input.value = '';
}

// ── Tab navigation ─────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('nav button')[TABS.indexOf(name)].classList.add('active');
  if (name === 'tracker') renderTracker();
}

// ── Job Feed ───────────────────────────────────────────────────────────────
async function loadJobs() {
  const grid = document.getElementById('job-grid');
  grid.innerHTML = '<div class="empty-state"><strong>Loading...</strong><p>Fetching from job boards</p></div>';
  try {
    const r = await fetch('/jobs');
    if (!r.ok) throw new Error('Server error');
    state.jobs = await r.json();
    if (!state.jobs.length) {
      grid.innerHTML = '<div class="empty-state"><strong>No jobs loaded yet</strong><p>Job boards may take a moment to refresh on first start.</p></div>';
      return;
    }
    renderJobs(state.jobs);
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><strong>Could not load jobs</strong><p>Is the server running?</p></div>';
  }
}

function filterJobs() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const elig = document.getElementById('eligibility-filter').value;
  const src = document.getElementById('source-filter').value;
  const wt = document.getElementById('worktype-filter').value;

  let filtered = state.jobs;
  if (q) {
    filtered = filtered.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  if (elig) filtered = filtered.filter(j => j.eligibility === elig);
  if (src)  filtered = filtered.filter(j => j.source === src);
  if (wt)   filtered = filtered.filter(j => j.work_type === wt);

  if (Object.keys(state.matchScores).length) {
    filtered = [...filtered].sort((a, b) =>
      (state.matchScores[b.id] || 0) - (state.matchScores[a.id] || 0)
    );
  }
  renderJobs(filtered);
}

// ── Resume match ───────────────────────────────────────────────────────────
function toggleMatchPanel() {
  const body = document.getElementById('match-panel-body');
  const chevron = document.getElementById('match-panel-chevron');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chevron.textContent = open ? '▼' : '▲';
}

async function onMatchFileChange(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('match-file-status');
  status.textContent = 'Parsing PDF...';
  const form = new FormData();
  form.append('file', file);
  try {
    const r = await fetch('/parse-resume', { method: 'POST', body: form });
    const data = await r.json();
    if (!r.ok) { status.textContent = data.detail || 'Could not parse PDF.'; return; }
    document.getElementById('match-resume-text').value = data.text;
    status.textContent = `Loaded "${file.name}" (${data.text.split(/\s+/).length} words)`;
  } catch {
    status.textContent = 'Upload failed. Paste your resume instead.';
  }
  input.value = '';
}

async function matchResume() {
  const resume = document.getElementById('match-resume-text').value.trim();
  if (!resume) { toast('Paste your resume or upload a PDF first.'); return; }

  const statusEl = document.getElementById('match-status');
  statusEl.textContent = 'Analysing resume...';
  document.querySelector('#match-panel button').disabled = true;

  try {
    const r = await fetch('/resume/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume }),
    });
    const data = await r.json();
    const skills = (data.skills || []).map(s => s.toLowerCase());
    state.matchSkills = skills;

    // Score every job
    state.matchScores = {};
    for (const j of state.jobs) {
      const hay = `${j.title} ${(j.tags || []).join(' ')} ${j.description || ''}`.toLowerCase();
      const hits = skills.filter(s => hay.includes(s)).length;
      state.matchScores[j.id] = skills.length ? Math.round((hits / skills.length) * 100) : 0;
    }

    const matched = Object.values(state.matchScores).filter(s => s > 0).length;
    statusEl.textContent = `${skills.length} skills found · ${matched} jobs matched`;
    document.getElementById('match-clear-btn').style.display = 'inline-flex';
    filterJobs();
  } catch {
    statusEl.textContent = 'Could not analyse resume. Try again.';
  }
  document.querySelector('#match-panel button').disabled = false;
}

function clearMatch() {
  state.matchSkills = [];
  state.matchScores = {};
  document.getElementById('match-status').textContent = '';
  document.getElementById('match-clear-btn').style.display = 'none';
  filterJobs();
}

function renderJobs(jobs) {
  const grid = document.getElementById('job-grid');
  if (!jobs.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No jobs match your filters.</strong></div>';
    return;
  }
  grid.innerHTML = jobs.map(jobCard).join('');
}

function jobCard(j) {
  const eligLabel = { green: 'Worldwide', yellow: 'Check timezone', red: 'Region-locked' };
  const wtLabel = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' };
  const wtClass = { remote: 'badge-worktype-remote', hybrid: 'badge-worktype-hybrid', onsite: 'badge-worktype-onsite' };
  const tags = (j.tags || []).map(t => `<span class="job-tag">${esc(t)}</span>`).join('');
  const salary = j.salary ? `<div class="job-salary">${esc(j.salary)}</div>` : '';
  const dateStr = (j.posted_at || '').slice(0, 10);
  const wt = j.work_type || 'remote';
  const score = state.matchScores[j.id];
  const matchBadge = score > 0
    ? `<span class="badge ${score >= 60 ? 'badge-match-strong' : score >= 30 ? 'badge-match-good' : 'badge-match-weak'}">${score}% match</span>`
    : '';
  const jobData = encodeURIComponent(JSON.stringify(j));
  return `
    <div class="job-card${score >= 60 ? ' job-card-matched' : ''}">
      <div class="job-card-header">
        <div>
          <div class="job-title">${esc(j.title)}</div>
          <div class="job-company">${esc(j.company)}</div>
        </div>
        <span class="badge badge-${esc(j.eligibility)}">${esc(eligLabel[j.eligibility] || j.eligibility)}</span>
      </div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <span class="badge badge-source">${esc(j.source)}</span>
        <span class="badge ${esc(wtClass[wt] || 'badge-worktype-remote')}">${esc(wtLabel[wt] || wt)}</span>
        ${matchBadge}
        ${dateStr ? `<span style="font-size:0.75rem;color:#94a3b8;">${esc(dateStr)}</span>` : ''}
      </div>
      ${tags ? `<div class="job-tags">${tags}</div>` : ''}
      ${salary}
      <div class="job-actions">
        <button class="btn btn-primary btn-sm" onclick="prepForJob('${jobData}')">Prep for this role</button>
        ${j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noopener" class="btn btn-apply btn-sm">Apply Now</a>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="saveToTracker('${jobData}')">Save</button>
      </div>
    </div>`;
}

function prepForJob(encoded) {
  const j = JSON.parse(decodeURIComponent(encoded));
  state.currentJob = j;
  const jdText = [j.title, j.company ? `Company: ${j.company}` : '', j.description || ''].filter(Boolean).join('\n\n');
  document.getElementById('jd-input').value = jdText;
  switchTab('interview');
  showStage('intake');
  toast(`JD loaded for "${j.title}" — paste your resume and start!`);
}

// ── Interview ──────────────────────────────────────────────────────────────
function showStage(name) {
  document.querySelectorAll('.interview-stage').forEach(s => s.classList.remove('active'));
  document.getElementById('stage-' + name).classList.add('active');
}

function startInterview() {
  const resume = document.getElementById('resume-input').value.trim();
  const jd = document.getElementById('jd-input').value.trim();
  if (!resume) { toast('Please paste your resume before starting.'); return; }
  if (!jd) { toast('Please paste a job description (or load one from the Jobs tab).'); return; }

  state.history = [];
  state.questionsAsked = 0;
  state.currentTranscript = '';
  state.scorecard = null;

  showStage('interview');
  updateProgress();
  document.getElementById('question-display').textContent = 'Preparing your first question...';
  document.getElementById('transcript-display').textContent = 'Your answer will appear here as you speak...';
  document.getElementById('btn-listen').disabled = true;
  document.getElementById('btn-done').disabled = true;

  askNext('next');
}

function updateProgress() {
  const pct = Math.min((state.questionsAsked / MAX_Q) * 100, 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('q-counter').textContent =
    state.questionsAsked > 0 ? `Question ${state.questionsAsked} of ${MAX_Q}` : 'Starting...';
}

async function askNext(action) {
  const resume = document.getElementById('resume-input').value.trim();
  const jd = document.getElementById('jd-input').value.trim();
  const qDisplay = document.getElementById('question-display');

  document.getElementById('btn-listen').disabled = true;
  document.getElementById('btn-done').disabled = true;
  qDisplay.textContent = '';

  try {
    const r = await fetch('/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume,
        jd,
        history: state.history,
        action,
        questions_asked: state.questionsAsked,
      }),
    });

    if (!r.ok) {
      qDisplay.textContent = 'Error communicating with server. Please try again.';
      return;
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.done) break;
          if (payload.text) {
            fullText += payload.text;
            qDisplay.textContent = fullText;
          }
        } catch (_) {}
      }
    }

    // Check if this is a scorecard response
    const scorecardMatch = fullText.match(/<scorecard>([\s\S]*?)<\/scorecard>/);
    if (scorecardMatch) {
      try {
        state.scorecard = JSON.parse(scorecardMatch[1].trim());
        renderScorecard(state.scorecard);
        generateOutreach();
        showStage('scorecard');
      } catch (e) {
        qDisplay.textContent = 'Error parsing scorecard. Please try ending the session again.';
      }
      return;
    }

    // Normal question — add to history, enable controls, speak aloud
    state.history.push({ role: 'assistant', content: fullText });
    state.questionsAsked++;
    updateProgress();
    state.currentTranscript = '';
    document.getElementById('transcript-display').textContent = 'Your answer will appear here as you speak...';
    document.getElementById('btn-listen').disabled = false;
    speakText(fullText);

  } catch (e) {
    qDisplay.textContent = 'Network error. Please check your connection and try again.';
  }
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    // No TTS — just enable controls immediately
    document.getElementById('btn-done').disabled = false;
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.onend = () => { document.getElementById('btn-done').disabled = false; };
  // Fallback: enable controls after 10s even if TTS stalls
  setTimeout(() => { document.getElementById('btn-done').disabled = false; }, 10000);
  window.speechSynthesis.speak(utt);
}

function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Speech recognition not supported in this browser. Please type your answer below and click Done Answering.');
    document.getElementById('transcript-display').contentEditable = 'true';
    document.getElementById('transcript-display').focus();
    document.getElementById('btn-done').disabled = false;
    return;
  }

  const recog = new SR();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = 'en-US';
  state.recognition = recog;

  recog.onstart = () => {
    document.getElementById('rec-indicator').classList.add('active');
    document.getElementById('btn-listen').textContent = '🎙 Listening...';
    document.getElementById('btn-listen').disabled = true;
    document.getElementById('btn-done').disabled = false;
  };

  recog.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    state.currentTranscript += final;
    const display = (state.currentTranscript + interim).trim();
    document.getElementById('transcript-display').textContent = display || 'Listening...';
  };

  recog.onerror = (e) => {
    document.getElementById('rec-indicator').classList.remove('active');
    document.getElementById('btn-listen').textContent = '🎙 Start Speaking';
    document.getElementById('btn-listen').disabled = false;
    if (e.error !== 'no-speech') toast('Mic error: ' + e.error + '. Try again.');
  };

  recog.onend = () => {
    document.getElementById('rec-indicator').classList.remove('active');
    document.getElementById('btn-listen').textContent = '🎙 Start Speaking';
    document.getElementById('btn-listen').disabled = false;
  };

  recog.start();
}

function submitAnswer() {
  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }
  document.getElementById('rec-indicator').classList.remove('active');
  document.getElementById('btn-listen').textContent = '🎙 Start Speaking';
  document.getElementById('btn-done').disabled = true;

  // Support text fallback (contentEditable)
  const transcriptEl = document.getElementById('transcript-display');
  let answer = state.currentTranscript.trim();
  if (transcriptEl.contentEditable === 'true') {
    answer = transcriptEl.textContent.trim();
    transcriptEl.contentEditable = 'false';
  }

  if (!answer) {
    toast('No answer recorded. Click "Start Speaking" and speak your answer, then click "Done Answering".');
    document.getElementById('btn-listen').disabled = false;
    return;
  }

  state.history.push({ role: 'user', content: answer });

  if (state.questionsAsked >= MAX_Q) {
    endSession();
  } else {
    askNext('next');
  }
}

function endSession() {
  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }
  document.getElementById('rec-indicator').classList.remove('active');
  askNext('end');
}

function resetInterview() {
  state.history = [];
  state.questionsAsked = 0;
  state.currentTranscript = '';
  state.scorecard = null;
  state.currentJob = null;
  document.getElementById('jd-input').value = '';
  showStage('intake');
  // Reset outreach panel
  document.getElementById('outreach-loading').style.display = 'block';
  document.getElementById('outreach-loading').textContent = 'Generating your outreach message...';
  document.getElementById('outreach-text').style.display = 'none';
  document.getElementById('outreach-actions').style.display = 'none';
}

// ── Scorecard ──────────────────────────────────────────────────────────────
const DIMS = ['clarity', 'structure', 'relevance', 'specificity', 'confidence'];

function renderScorecard(sc) {
  const overall = sc.overall || {};
  document.getElementById('overall-scores').innerHTML = DIMS.map(d => `
    <div class="score-cell">
      <div class="dim">${d}</div>
      <div class="val">${overall[d] || '–'}</div>
    </div>`).join('');

  const breakdown = document.getElementById('answer-breakdown');
  breakdown.innerHTML = (sc.answers || []).map((a, i) => {
    const isWeak = i === sc.weakest_answer_index;
    const scores = a.scores || {};
    const avg = (DIMS.reduce((s, d) => s + (scores[d] || 0), 0) / DIMS.length).toFixed(1);
    const good = (a.good_phrases || []).map(p => `"${esc(p)}"`).join(' · ');
    const weak = (a.weak_phrases || []).map(p => `"${esc(p)}"`).join(' · ');
    return `
      <div class="answer-review${isWeak ? ' weakest' : ''}">
        ${isWeak ? '<span class="badge badge-yellow" style="margin-bottom:8px; display:inline-block;">Weakest answer</span>' : ''}
        <div style="font-weight:600; margin-bottom:6px; font-size:0.9rem;">Q: ${esc(a.question)}</div>
        <div style="font-size:0.82rem; color:#475569; margin-bottom:6px;">Average: ${avg}/5</div>
        ${good ? `<div style="font-size:0.82rem; color:#059669; margin-bottom:3px;">✓ ${good}</div>` : ''}
        ${weak ? `<div style="font-size:0.82rem; color:#dc2626;">✗ ${weak}</div>` : ''}
      </div>`;
  }).join('');

  document.getElementById('rewritten-answer').textContent = sc.rewritten_answer || '';
}

// ── Outreach ───────────────────────────────────────────────────────────────
async function generateOutreach() {
  const resume = document.getElementById('resume-input').value.trim();
  const github = document.getElementById('github-input').value.trim();
  const company = state.currentJob?.company || 'the company';
  const role = state.currentJob?.title || 'the role';

  document.getElementById('outreach-loading').style.display = 'block';
  document.getElementById('outreach-text').style.display = 'none';
  document.getElementById('outreach-actions').style.display = 'none';

  try {
    const r = await fetch('/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, company, role, github }),
    });
    const data = await r.json();
    document.getElementById('outreach-loading').style.display = 'none';
    document.getElementById('outreach-text').style.display = 'block';
    document.getElementById('outreach-text').value = data.message;
    document.getElementById('outreach-actions').style.display = 'flex';
  } catch (e) {
    document.getElementById('outreach-loading').textContent = 'Could not generate message. Check your connection.';
  }
}

function copyOutreach() {
  const txt = document.getElementById('outreach-text').value;
  navigator.clipboard.writeText(txt)
    .then(() => toast('Message copied to clipboard!'))
    .catch(() => {
      document.getElementById('outreach-text').select();
      document.execCommand('copy');
      toast('Message copied!');
    });
}

// ── Tracker ────────────────────────────────────────────────────────────────
function getTracker() {
  try { return JSON.parse(localStorage.getItem(TRACKER_KEY) || '[]'); }
  catch (_) { return []; }
}

function saveTracker(rows) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(rows));
}

function addToTracker() {
  const rows = getTracker();
  const overall = state.scorecard?.overall || {};
  const avgScore = state.scorecard
    ? (DIMS.reduce((s, d) => s + (overall[d] || 0), 0) / DIMS.length).toFixed(1)
    : '';

  const row = {
    id: Date.now().toString(),
    company: state.currentJob?.company || '',
    role: state.currentJob?.title || '',
    source: state.currentJob?.source || '',
    url: state.currentJob?.url || '',
    date_applied: new Date().toISOString().slice(0, 10),
    prep_score: avgScore,
    status: 'Applied',
    followup_date: '',
  };

  rows.unshift(row);
  saveTracker(rows);
  switchTab('tracker');
  toast('Added to tracker!');
}

function saveToTracker(encoded) {
  const job = JSON.parse(decodeURIComponent(encoded));
  const rows = getTracker();
  if (job.url && rows.find(r => r.url === job.url)) {
    toast('Already in tracker.');
    return;
  }
  rows.unshift({
    id: Date.now().toString(),
    company: job.company,
    role: job.title,
    source: job.source,
    url: job.url || '',
    date_applied: '',
    prep_score: '',
    status: 'Saved',
    followup_date: '',
  });
  saveTracker(rows);
  toast(`"${job.title}" saved to tracker.`);
}

function renderTracker() {
  const rows = getTracker();
  const tbody = document.getElementById('tracker-body');
  const empty = document.getElementById('tracker-empty');

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>
        ${row.url
          ? `<a href="${esc(row.url)}" target="_blank" rel="noopener" style="color:#6366f1;text-decoration:none;font-weight:500;">${esc(row.company)}</a>`
          : esc(row.company)}
      </td>
      <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(row.role)}</td>
      <td><span class="badge badge-source">${esc(row.source || '—')}</span></td>
      <td>${row.date_applied || '—'}</td>
      <td>${row.prep_score ? `<strong style="color:#6366f1">${row.prep_score}/5</strong>` : '—'}</td>
      <td>
        <select class="status-select" onchange="updateStatus('${esc(row.id)}', this.value)">
          ${STATUSES.map(s => `<option${s === row.status ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="date" value="${esc(row.followup_date || '')}"
          style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;"
          onchange="updateFollowup('${esc(row.id)}', this.value)">
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="deleteRow('${esc(row.id)}')" style="color:#ef4444;">Remove</button>
      </td>
    </tr>`).join('');
}

function updateStatus(id, status) {
  const rows = getTracker();
  const row = rows.find(r => r.id === id);
  if (row) { row.status = status; saveTracker(rows); }
}

function updateFollowup(id, date) {
  const rows = getTracker();
  const row = rows.find(r => r.id === id);
  if (row) { row.followup_date = date; saveTracker(rows); }
}

function deleteRow(id) {
  saveTracker(getTracker().filter(r => r.id !== id));
  renderTracker();
}

function exportCSV() {
  const rows = getTracker();
  if (!rows.length) { toast('No applications to export.'); return; }
  const headers = ['Company', 'Role', 'Source', 'Date Applied', 'Prep Score', 'Status', 'Follow-up Date', 'URL'];
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      [r.company, r.role, r.source, r.date_applied, r.prep_score, r.status, r.followup_date, r.url]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `placements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast('CSV exported!');
}

// ── Boot ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadJobs();
  renderTracker();
});
