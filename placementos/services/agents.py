import json
import re
from services.claude import get_client, MODEL

FIT_PROMPT = """\
Evaluate how well this candidate fits the job description.

Resume:
{resume}

Job Description:
{jd}

Return ONLY valid JSON — no markdown, no explanation:
{{
  "score": 0,
  "strengths": ["3 specific strengths from resume matching JD"],
  "gaps": ["2 specific gaps or missing requirements"],
  "verdict": "one sentence summary"
}}
"""

FOLLOWUP_PROMPT = """\
Write a follow-up email to send 5 days after applying for this role.

Role: {role}
Company: {company}
Original outreach: {outreach_snippet}

Requirements:
- Under 60 words
- Friendly, not pushy
- Reference the specific role by name
- End with a soft ask (15-min call or portfolio review)
- Return ONLY the email body, no subject line, no explanation
"""

RANK_PROMPT = """\
Rank the best job matches for the criteria below.

Criteria:
{criteria}

Available jobs (JSON):
{jobs_json}

Return ONLY a valid JSON array of the top {top_k} matches — no markdown:
[
  {{
    "job_id": "exact id from the list",
    "score": 0,
    "reason": "one sentence explaining the match"{action_field}
  }}
]

Use only job_ids from the provided list. Rank by how well each job fits the criteria.
"""

_ACTION_FIELD = ',\n    "action": "one specific thing to do before applying"'

GAP_PROMPT = """\
Analyze this mock interview scorecard against the job description. Identify gaps and create a study plan.

Job Description:
{jd}

Scorecard:
{scorecard_json}

Return ONLY valid JSON — no markdown:
{{
  "weak_areas": ["2-3 specific behavioral competencies the candidate struggled with"],
  "study_plan": [
    {{
      "area": "e.g. Quantifying Results",
      "issue": "what went wrong in the interview",
      "exercise": "specific 10-minute practice exercise to fix it"
    }}
  ],
  "practice_prompts": ["3 follow-up interview questions targeting the weak areas"]
}}
"""

ATS_PROMPT = """\
Extract ATS keywords from the job description and score the resume against them.

Job Description:
{jd}

Resume:
{resume}

Return ONLY valid JSON — no markdown:
{{
  "required": ["must-have skills and keywords from JD"],
  "preferred": ["nice-to-have skills and keywords from JD"],
  "present": ["keywords from required+preferred that appear in the resume"],
  "missing": ["keywords from required+preferred NOT in the resume"],
  "ats_score": 0
}}
"""


def _parse_json(raw: str, fallback):
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
    try:
        return json.loads(raw.strip())
    except Exception:
        return fallback


async def _call(prompt: str, max_tokens: int = 512) -> str:
    client = get_client()
    r = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0,
    )
    return r.choices[0].message.content


async def analyze_fit(resume: str, jd: str) -> dict:
    raw = await _call(FIT_PROMPT.format(resume=resume[:4000], jd=jd[:3000]), max_tokens=512)
    return _parse_json(raw, {"score": 0, "strengths": [], "gaps": [], "verdict": "Could not analyze fit."})


async def generate_followup(role: str, company: str, outreach_snippet: str) -> str:
    try:
        raw = await _call(FOLLOWUP_PROMPT.format(role=role, company=company, outreach_snippet=outreach_snippet[:200]), max_tokens=200)
        return raw.strip()
    except Exception:
        return ""


async def rank_jobs(criteria: str, jobs: list, top_k: int = 10, with_action: bool = False) -> list:
    slim = [
        {"job_id": j["id"], "title": j["title"], "company": j["company"],
         "description": j.get("description", "")[:300], "tags": j.get("tags", [])}
        for j in jobs[:60]
    ]
    jobs_json = json.dumps(slim)
    if len(jobs_json) > 8000:
        slim = slim[:max(1, 8000 * len(slim) // len(jobs_json))]
        jobs_json = json.dumps(slim)
    prompt = RANK_PROMPT.format(
        criteria=criteria[:2000],
        jobs_json=jobs_json,
        top_k=top_k,
        action_field=_ACTION_FIELD if with_action else "",
    )
    raw = await _call(prompt, max_tokens=1024)
    results = _parse_json(raw, [])
    return [r for r in results if isinstance(r, dict) and r.get("job_id")]


async def scout_jobs(query: str, jobs: list) -> list:
    ranked = await rank_jobs(query, jobs, top_k=5, with_action=False)
    job_map = {j["id"]: j for j in jobs}
    return [
        {"job": job_map[r["job_id"]], "score": r.get("score", 0), "reason": r.get("reason", "")}
        for r in ranked if r["job_id"] in job_map
    ]


async def analyze_gap(scorecard: dict, jd: str) -> dict:
    raw = await _call(GAP_PROMPT.format(jd=jd[:3000], scorecard_json=json.dumps(scorecard)[:4000]), max_tokens=1024)
    return _parse_json(raw, {"weak_areas": [], "study_plan": [], "practice_prompts": []})


async def analyze_ats(resume: str, jd: str) -> dict:
    raw = await _call(ATS_PROMPT.format(resume=resume[:4000], jd=jd[:3000]), max_tokens=768)
    return _parse_json(raw, {"required": [], "preferred": [], "present": [], "missing": [], "ats_score": 0})


async def generate_digest(resume: str, jobs: list) -> list:
    ranked = await rank_jobs(resume, jobs, top_k=10, with_action=True)
    job_map = {j["id"]: j for j in jobs}
    results = []
    for r in ranked:
        jid = r.get("job_id", "")
        if jid not in job_map:
            continue
        job = job_map[jid]
        results.append({
            "job_id": jid,
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "score": r.get("score", 0),
            "reason": r.get("reason", ""),
            "action": r.get("action", ""),
            "url": job.get("url", ""),
            "eligibility": job.get("eligibility", ""),
            "work_type": job.get("work_type", ""),
            "description": job.get("description", ""),
        })
    return results
