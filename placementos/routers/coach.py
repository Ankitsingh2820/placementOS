import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.agents import analyze_fit, generate_followup
from services.claude import stream_tailor_resume, generate_outreach

router = APIRouter()


class CoachRequest(BaseModel):
    resume: str
    job: dict


@router.post("/coach")
async def coach(body: CoachRequest):
    resume = body.resume
    job = body.job
    jd = f"{job.get('title', '')} at {job.get('company', '')}\n\n{job.get('description', '')}"
    company = job.get("company", "")
    role = job.get("title", "")

    async def generate():
        fit = await analyze_fit(resume, jd)
        yield f"data: {json.dumps({'step': 'fit', 'data': fit})}\n\n"

        async for chunk in stream_tailor_resume(resume, jd):
            yield f"data: {json.dumps({'step': 'tailor', 'text': chunk})}\n\n"
        yield f"data: {json.dumps({'step': 'tailor_done'})}\n\n"

        outreach = await generate_outreach(resume, company, role, "")
        yield f"data: {json.dumps({'step': 'outreach', 'data': {'message': outreach}})}\n\n"

        followup = await generate_followup(role, company, outreach[:200])
        yield f"data: {json.dumps({'step': 'followup', 'data': {'message': followup}})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
