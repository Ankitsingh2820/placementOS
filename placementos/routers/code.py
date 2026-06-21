from fastapi import APIRouter
from pydantic import BaseModel
from services.codeproblems import get_problems, evaluate_solution, get_hint

router = APIRouter()


class EvaluateRequest(BaseModel):
    problem: dict
    code: str
    language: str = "python"


class HintRequest(BaseModel):
    problem: dict
    code: str
    language: str = "python"


@router.get("/code/problems")
async def problems(job_title: str = "", job_company: str = "", job_description: str = ""):
    job = None
    if job_title:
        job = {"title": job_title, "company": job_company, "description": job_description}
    return await get_problems(job)


@router.post("/code/evaluate")
async def evaluate(body: EvaluateRequest):
    return await evaluate_solution(body.problem, body.code, body.language)


@router.post("/code/hint")
async def hint(body: HintRequest):
    text = await get_hint(body.problem, body.code, body.language)
    return {"hint": text}
