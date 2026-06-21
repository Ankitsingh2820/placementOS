import json
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.claude import stream_interview
from services.agents import analyze_gap

router = APIRouter()


class InterviewRequest(BaseModel):
    resume: str
    jd: str
    history: list[dict]
    action: str = "next"
    questions_asked: int = 0


class GapRequest(BaseModel):
    scorecard: dict
    jd: str


@router.post("/interview")
async def interview(body: InterviewRequest):
    max_q = int(os.getenv("MAX_INTERVIEW_QUESTIONS", "8"))

    async def generate():
        async for chunk in stream_interview(
            body.resume,
            body.jd,
            body.history,
            body.action,
            body.questions_asked,
            max_q,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/interview/gap")
async def gap_analysis(body: GapRequest):
    return await analyze_gap(body.scorecard, body.jd)
