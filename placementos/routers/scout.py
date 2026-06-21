from fastapi import APIRouter
from pydantic import BaseModel
from services.agents import scout_jobs, generate_digest
from services.feed import get_cached_jobs

router = APIRouter()


class ScoutRequest(BaseModel):
    query: str


class DigestRequest(BaseModel):
    resume: str


@router.post("/scout")
async def scout(body: ScoutRequest):
    jobs = get_cached_jobs()
    return await scout_jobs(body.query, jobs)


@router.post("/scout/digest")
async def digest(body: DigestRequest):
    jobs = get_cached_jobs()
    return await generate_digest(body.resume, jobs)
