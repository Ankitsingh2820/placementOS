from fastapi import APIRouter
from pydantic import BaseModel
from services.claude import generate_outreach

router = APIRouter()


class OutreachRequest(BaseModel):
    resume: str
    company: str
    role: str
    github: str = ""


@router.post("/outreach")
async def outreach_endpoint(body: OutreachRequest):
    message = await generate_outreach(body.resume, body.company, body.role, body.github)
    return {"message": message}
