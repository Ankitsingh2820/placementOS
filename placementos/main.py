
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from routers import jobs, interview, outreach, resume, coach, scout, chat, code
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
app.include_router(coach.router)
app.include_router(scout.router)
app.include_router(chat.router)
app.include_router(code.router)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static_react")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
