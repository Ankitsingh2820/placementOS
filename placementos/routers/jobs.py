from fastapi import APIRouter, Query
from services.feed import get_cached_jobs, refresh_feed

router = APIRouter()


@router.get("/jobs")
async def list_jobs(
    tag: str | None = Query(None),
    eligibility: str | None = Query(None),
    source: str | None = Query(None),
):
    jobs = get_cached_jobs()
    if tag:
        jobs = [j for j in jobs if tag.lower() in [t.lower() for t in j.get("tags", [])]]
    if eligibility and eligibility != "red":
        jobs = [j for j in jobs if j.get("eligibility") == eligibility]
    if source:
        jobs = [j for j in jobs if j.get("source", "").lower() == source.lower()]
    return jobs


@router.post("/jobs/refresh")
async def force_refresh():
    await refresh_feed()
    return {"count": len(get_cached_jobs())}
