from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.career import generate_roadmap

router = APIRouter()


class RoadmapRequest(BaseModel):
    domain: str
    level: str = "Fresher"


@router.post("/career/roadmap")
async def roadmap(body: RoadmapRequest):
    domain = body.domain.strip()
    if not domain:
        raise HTTPException(status_code=400, detail="domain is required")
    try:
        return await generate_roadmap(domain, body.level)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not build roadmap")
