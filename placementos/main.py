import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from routers import jobs, interview, outreach, resume
from services.feed import refresh_feed


@asynccontextmanager
async def lifespan(app: FastAPI):
    await refresh_feed()
    interval = int(os.getenv("FEED_REFRESH_MINUTES", "120")) * 60

    async def _loop():
        while True:
            await asyncio.sleep(interval)
            await refresh_feed()

    task = asyncio.create_task(_loop())
    yield
    task.cancel()


app = FastAPI(title="PlacementOS", lifespan=lifespan)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(outreach.router)
app.include_router(resume.router)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")
