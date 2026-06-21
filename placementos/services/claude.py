import os
from groq import AsyncGroq

_client = None
MODEL = "llama-3.3-70b-versatile"


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    return _client


INTERVIEW_SYSTEM = """\
You are a professional interviewer conducting a behavioral mock interview.

## Candidate Resume
{resume}

## Job Description
{jd}

## Rules
1. Ask ONE question per turn, 1–2 sentences max. Be specific to the resume and JD.
2. After each candidate answer, decide:
   - FOLLOW UP: answer was vague, skipped the Result, or missed a key point — probe that specific weakness
   - ADVANCE: answer was complete — move to the next JD topic
3. Use behavioral STAR structure (Situation, Task, Action, Result).
4. Questions asked so far: {questions_asked} of {max_questions}.
5. When questions_asked >= {max_questions} OR action is "end", output ONLY the scorecard JSON \
wrapped in <scorecard> tags. Never output the scorecard before then.

## Scorecard format (use ONLY when session ends)
<scorecard>
{{
  "answers": [
    {{
      "question": "...",
      "answer_summary": "one sentence",
      "scores": {{"clarity": 1, "structure": 1, "relevance": 1, "specificity": 1, "confidence": 1}},
      "good_phrases": ["exact quote from answer"],
      "weak_phrases": ["exact quote from answer"]
    }}
  ],
  "overall": {{"clarity": 1, "structure": 1, "relevance": 1, "specificity": 1, "confidence": 1}},
  "weakest_answer_index": 0,
  "rewritten_answer": "Strong 150-200 word rewrite of the weakest answer using full STAR structure."
}}
</scorecard>
"""

OUTREACH_PROMPT = """\
Write a cold outreach LinkedIn/email message for a job application. Requirements:
- Under 80 words total
- Open with: "I saw {company} is hiring a {role}."
- Mention ONE specific, relevant project or achievement from the resume (with a concrete result)
- State: "I work remotely from India with 3-4 hrs overlap with your team."
- End with the GitHub link if provided, and offer to do a short task
- Lead with results, NOT "I'm passionate and hardworking"
- Return ONLY the message text, no explanation or subject line

Resume: {resume}
GitHub: {github}
Company: {company}
Role: {role}
"""


async def stream_interview(
    resume: str,
    jd: str,
    history: list,
    action: str,
    questions_asked: int,
    max_questions: int,
):
    system = INTERVIEW_SYSTEM.format(
        resume=resume,
        jd=jd,
        questions_asked=questions_asked,
        max_questions=max_questions,
    )
    messages = [{"role": "system", "content": system}]
    messages += list(history)
    if action == "end":
        messages.append({
            "role": "user",
            "content": "Please end the session now and give me my full scorecard.",
        })

    client = get_client()
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=2048,
        stream=True,
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        if text:
            yield text


TAILOR_PROMPT = """\
You are a professional resume writer. Rewrite the candidate's resume to better match the job description.

Rules:
- Keep ALL facts accurate — never invent experience, companies, or results
- Rewrite bullet points to use the JD's exact keywords and phrasing naturally
- Prioritise experiences most relevant to the JD; move them higher within each role
- Use strong action verbs and preserve (or sharpen) quantified results
- Keep the same sections and overall structure as the original
- Return ONLY the rewritten resume text, no explanation or commentary

Job Description:
{jd}

Original Resume:
{resume}
"""


async def stream_tailor_resume(resume: str, jd: str):
    prompt = TAILOR_PROMPT.format(resume=resume[:6000], jd=jd[:3000])
    client = get_client()
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        stream=True,
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        if text:
            yield text


CHAT_SYSTEM = """\
You are an expert career coach and resume specialist embedded inside PlacementOS, an AI-powered job placement tool.

Your role is to help the user:
- Improve their resume (wording, structure, ATS keywords, bullet points, quantifying results)
- Suggest career moves, skills to learn, and certifications worth pursuing
- Explain how to position themselves for specific roles
- Give honest, actionable feedback — not generic advice

Context you have:
- Resume: {resume}
- Current target job: {job}

Rules:
- Be specific and direct. Reference the user's actual resume content when relevant.
- If no resume is provided, give general best-practice advice and ask them to paste their resume.
- Use bullet points and short paragraphs. Don't write walls of text.
- When suggesting resume improvements, show the before/after where possible.
- Keep answers concise — 3-5 sentences or a short list, unless the user asks for more detail.
"""


async def stream_chat(message: str, history: list, resume: str = "", job: str = ""):
    system = CHAT_SYSTEM.format(
        resume=resume[:4000] if resume else "Not provided — user hasn't pasted their resume yet.",
        job=job[:1000] if job else "Not specified.",
    )
    messages = [{"role": "system", "content": system}]
    messages += list(history)
    messages.append({"role": "user", "content": message})

    client = get_client()
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1024,
        stream=True,
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        if text:
            yield text


async def generate_outreach(resume: str, company: str, role: str, github: str) -> str:
    prompt = OUTREACH_PROMPT.format(
        resume=resume,
        company=company,
        role=role,
        github=github or "not provided",
    )
    client = get_client()
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )
    return response.choices[0].message.content
