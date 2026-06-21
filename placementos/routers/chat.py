import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.claude import stream_chat

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list = []
    resume: str = ""
    job: dict = {}


@router.post("/chat")
async def chat(body: ChatRequest):
    job_str = ""
    if body.job:
        job_str = f"{body.job.get('title', '')} at {body.job.get('company', '')}\n{body.job.get('description', '')}"

    async def event_stream():
        async for chunk in stream_chat(
            message=body.message,
            history=body.history,
            resume=body.resume,
            job=job_str,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
