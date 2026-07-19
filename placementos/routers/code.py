from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import problem_bank
from services.codeproblems import get_problems, evaluate_solution, get_hint, render_problem

router = APIRouter()


class EvaluateRequest(BaseModel):
    problem: dict
    code: str
    language: str = "python"


class HintRequest(BaseModel):
    problem: dict
    code: str
    language: str = "python"


@router.get("/code/companies")
async def companies():
    bank = problem_bank.load_bank()
    return [c for c in problem_bank.get_companies(bank) if c["count"] > 0]


@router.get("/code/problem/{slug}")
async def problem_detail(slug: str):
    result = await render_problem(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown problem")
    return result


@router.get("/code/problems")
async def problems(company: str = "", job_title: str = "", job_company: str = "", job_description: str = ""):
    if company:
        bank = problem_bank.load_bank()
        return problem_bank.get_company_problems(bank, company)
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
