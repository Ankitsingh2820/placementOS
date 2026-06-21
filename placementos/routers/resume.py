import io
import json
import pypdf
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.claude import get_client, MODEL, stream_tailor_resume
from services.agents import analyze_ats

router = APIRouter()

EXTRACT_PROMPT = """\
You are a resume parser. Extract structured information from the resume below.

Return ONLY a valid JSON object — no markdown, no explanation:
{{
  "skills": ["list every technical skill, language, framework, tool, database, cloud service"],
  "titles": ["job titles the candidate has held or is targeting, lowercase"],
  "level": "junior"
}}

Rules:
- skills: be exhaustive — include python, fastapi, react, aws, docker, sql, etc.
- titles: e.g. ["backend engineer", "fullstack developer", "data scientist"]
- level: "junior" (0-2 yrs), "mid" (2-5 yrs), "senior" (5+ yrs)

Resume:
{resume}
"""


@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read PDF. Try copy-pasting your resume instead.")

    if not text:
        raise HTTPException(status_code=422, detail="No text found in PDF. It may be image-based. Try copy-pasting instead.")

    return {"text": text}


class TailorRequest(BaseModel):
    resume: str
    jd: str


@router.post("/resume/tailor")
async def tailor_resume(body: TailorRequest):
    if not body.resume.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not body.jd.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    async def generate():
        async for chunk in stream_tailor_resume(body.resume, body.jd):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


class MatchRequest(BaseModel):
    resume: str


@router.post("/resume/match")
async def match_resume(body: MatchRequest):
    text = body.resume
    if not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")

    client = get_client()
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": EXTRACT_PROMPT.format(resume=text[:4000])}],
        max_tokens=512,
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"skills": [], "titles": [], "level": "mid"}

    return data


class ATSRequest(BaseModel):
    resume: str
    jd: str


@router.post("/resume/ats")
async def ats_keywords(body: ATSRequest):
    if not body.resume.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not body.jd.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")
    return await analyze_ats(body.resume, body.jd)
