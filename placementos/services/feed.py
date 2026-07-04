import os
import re
import json
import asyncio
import hashlib
import logging
import feedparser
import httpx
from html import unescape
from datetime import datetime, timezone
import time as _time

_log = logging.getLogger("feed")


def _strip_html(text: str) -> str:
    text = unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()

_cache: list[dict] = []
_lock = asyncio.Lock()

INDIA_LOCATIONS = [
    "india", "bangalore", "bengaluru", "mumbai", "delhi", "new delhi",
    "hyderabad", "pune", "chennai", "kolkata", "noida", "gurgaon",
    "gurugram", "ahmedabad", "jaipur", "kochi", "trivandrum",
    "thiruvananthapuram", "indore", "chandigarh", "nagpur", "surat",
    "visakhapatnam", "vizag", "coimbatore", "bhubaneswar", "dehradun",
    "lucknow", "bhopal", "vadodara", "patna", "ranchi", "guwahati",
]

REMOTE_EXCLUDE = [
    # explicit country/region restrictions
    "us only", "usa only", "united states only",
    "eu only", "europe only", "uk only", "canada only",
    "australia only", "new zealand only",
    # "remote - <region>" patterns (location-scoped remote roles)
    "remote - us", "remote - usa", "remote - united states",
    "remote - canada", "remote - uk", "remote - europe",
    "remote - australia", "remote - germany", "remote - france",
    "remote in the us", "remote in canada", "remote in the uk",
    # citizenship / work auth
    "us citizen", "us resident",
    "must be based in", "must reside in",
    "work authorization", "authorized to work",
    "not available in india", "except india",
]


ONSITE_KEYWORDS = [
    "onsite", "on-site", "on site", "in-office", "in office",
    "must be present", "office required", "not remote",
]
HYBRID_KEYWORDS = [
    "hybrid", "partially remote", "flexible work", "2 days", "3 days",
    "part remote", "occasional office",
]
REMOTE_KEYWORDS = [
    "remote", "work from home", "wfh", "distributed", "fully remote",
    "work from anywhere", "remote-first", "remote first",
]


def tag_work_type(text: str) -> str:
    t = text.lower()
    for kw in ONSITE_KEYWORDS:
        if kw in t:
            return "onsite"
    for kw in HYBRID_KEYWORDS:
        if kw in t:
            return "hybrid"
    for kw in REMOTE_KEYWORDS:
        if kw in t:
            return "remote"
    return "remote"  # default — our boards are remote-first


def tag_eligibility(text: str, work_type: str) -> str:
    t = text.lower()
    if work_type in ("onsite", "hybrid"):
        for loc in INDIA_LOCATIONS:
            if loc in t:
                return "green"
        return "red"
    # remote: block only explicit region exclusions
    for kw in REMOTE_EXCLUDE:
        if kw in t:
            return "red"
    return "green"


def _job_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:10]


def _iso_date(raw_str: str = "", parsed_tuple=None) -> str:
    """Return YYYY-MM-DD from either a parsed time tuple or a raw date string."""
    if parsed_tuple:
        try:
            return datetime(*parsed_tuple[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            pass
    if raw_str:
        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
            try:
                return datetime.strptime(raw_str[:19], fmt[:len(raw_str[:19])]).strftime("%Y-%m-%d")
            except Exception:
                pass
        # Try parsing ISO with offset e.g. 2026-06-19T12:00:00+00:00
        try:
            return raw_str[:10]
        except Exception:
            pass
    return ""


def _parse_rss(board: dict, content: str) -> list[dict]:
    feed = feedparser.parse(content)
    jobs = []
    for entry in feed.entries[:30]:
        text = f"{entry.get('title', '')} {entry.get('summary', '')}"
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(entry.get("link", entry.get("title", ""))),
            "title": entry.get("title", ""),
            "company": entry.get("author", board["name"]),
            "source": board["short"],
            "url": entry.get("link", ""),
            "tags": [],
            "salary": "",
            "posted_at": _iso_date(entry.get("published", ""), entry.get("published_parsed")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(entry.get("summary", ""))[:1000],
        })
    return jobs


def _parse_remoteok(board: dict, data: list) -> list[dict]:
    jobs = []
    for item in data[1:31]:
        if not isinstance(item, dict):
            continue
        text = f"{item.get('position', '')} {item.get('description', '')}"
        salary = ""
        lo, hi = item.get("salary_min"), item.get("salary_max")
        if lo and hi:
            salary = f"${int(lo):,}–${int(hi):,}"
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(item.get("url", str(item.get("id", "")))),
            "title": item.get("position", ""),
            "company": item.get("company", ""),
            "source": board["short"],
            "url": item.get("url", ""),
            "tags": item.get("tags", [])[:5],
            "salary": salary,
            "posted_at": _iso_date(item.get("date", "")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(item.get("description", ""))[:1000],
        })
    return jobs


def _parse_remotive(board: dict, data: dict) -> list[dict]:
    jobs = []
    for item in data.get("jobs", [])[:30]:
        text = f"{item.get('title', '')} {item.get('description', '')}"
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(item.get("url", str(item.get("id", "")))),
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "source": board["short"],
            "url": item.get("url", ""),
            "tags": item.get("tags", [])[:5],
            "salary": item.get("salary", ""),
            "posted_at": _iso_date(item.get("publication_date", "")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(item.get("description", ""))[:1000],
        })
    return jobs


def _parse_jsearch(board: dict, data: dict) -> list[dict]:
    jobs = []
    raw = data.get("data", [])
    # search-v2 nests the list under data.jobs; the old /search returned data as a list
    if isinstance(raw, dict):
        raw = raw.get("jobs", [])
    for item in raw[:30]:
        text = f"{item.get('job_title', '')} {item.get('job_description', '')}"
        lo, hi = item.get("job_min_salary"), item.get("job_max_salary")
        curr = item.get("job_salary_currency", "USD")
        salary = f"{curr} {int(lo):,}–{int(hi):,}" if lo and hi else ""
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(item.get("job_apply_link", str(item.get("job_id", "")))),
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", ""),
            "source": board["short"],
            "url": item.get("job_apply_link", ""),
            "tags": (item.get("job_required_skills") or [])[:5],
            "salary": salary,
            "posted_at": _iso_date(item.get("job_posted_at_datetime_utc", "")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(item.get("job_description") or "")[:1000],
        })
    return jobs


def _parse_workingnomads(board: dict, data: list) -> list[dict]:
    jobs = []
    for item in data[:30]:
        if not isinstance(item, dict):
            continue
        text = f"{item.get('title', '')} {item.get('description', '')} {item.get('location', '')}"
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(item.get("url", item.get("title", ""))),
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "source": board["short"],
            "url": item.get("url", ""),
            "tags": [t.strip() for t in item.get("tags", "").split(",") if t.strip()][:5],
            "salary": "",
            "posted_at": _iso_date(item.get("pub_date", "")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(item.get("description", ""))[:1000],
        })
    return jobs


def _parse_adzuna(board: dict, data: dict) -> list[dict]:
    jobs = []
    for item in data.get("results", [])[:30]:
        text = f"{item.get('title', '')} {item.get('description', '')}"
        lo, hi = item.get("salary_min"), item.get("salary_max")
        salary = f"₹{int(lo):,}–₹{int(hi):,}" if lo and hi else ""
        work_type = tag_work_type(text)
        jobs.append({
            "id": _job_id(item.get("redirect_url", str(item.get("id", "")))),
            "title": item.get("title", ""),
            "company": (item.get("company") or {}).get("display_name", ""),
            "source": board["short"],
            "url": item.get("redirect_url", ""),
            "tags": [item["category"]["tag"]] if item.get("category", {}).get("tag") else [],
            "salary": salary,
            "posted_at": _iso_date(item.get("created", "")),
            "eligibility": tag_eligibility(text, work_type),
            "work_type": work_type,
            "description": _strip_html(item.get("description") or "")[:1000],
        })
    return jobs


async def _fetch_board(client: httpx.AsyncClient, board: dict) -> list[dict]:
    try:
        headers = {}
        params = {}

        if board["type"] == "jsearch_json":
            key = os.getenv("RAPIDAPI_KEY")
            if not key:
                return []
            headers = {
                "X-RapidAPI-Key": key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            }
        elif board["type"] == "adzuna_json":
            app_id = os.getenv("ADZUNA_APP_ID")
            app_key = os.getenv("ADZUNA_APP_KEY")
            if not app_id or not app_key:
                return []
            params = {"app_id": app_id, "app_key": app_key}

        if board["type"] == "rss":
            headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            headers["Accept"] = "application/rss+xml, application/xml, text/xml, */*"
        # Merge auth params into the URL's existing query (httpx's params= would REPLACE it)
        url = httpx.URL(board["url"]).copy_merge_params(params)
        r = await client.get(url, timeout=15, headers=headers, follow_redirects=True)
        r.raise_for_status()
        if board["type"] == "rss":
            return _parse_rss(board, r.content)  # bytes avoids surrogate encoding issues
        elif board["type"] == "remoteok_json":
            return _parse_remoteok(board, r.json())
        elif board["type"] == "remotive_json":
            return _parse_remotive(board, r.json())
        elif board["type"] == "jsearch_json":
            return _parse_jsearch(board, r.json())
        elif board["type"] == "adzuna_json":
            return _parse_adzuna(board, r.json())
        elif board["type"] == "workingnomads_json":
            return _parse_workingnomads(board, r.json())
    except Exception as _e:
        import logging
        logging.getLogger("feed").warning("Board %s failed: %s", board.get("short"), _e)
        return []
    return []


def _is_english(text: str) -> bool:
    if not text or len(text) < 20:
        return True
    try:
        from langdetect import detect, LangDetectException
        return detect(text) == "en"
    except Exception:
        return True  # can't detect — assume English


async def _translate_job(client, job: dict) -> dict:
    from services.claude import MODEL
    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{
                "role": "user",
                "content": (
                    "Translate the job title and description below to English. "
                    "Return only valid JSON with keys \"title\" and \"description\". No markdown.\n\n"
                    f"Title: {job['title']}\n\nDescription: {job['description']}"
                ),
            }],
            temperature=0,
            max_tokens=900,
        )
        raw = resp.choices[0].message.content.strip()
        data = json.loads(raw)
        job = dict(job)
        if data.get("title"):
            job["title"] = data["title"]
        if data.get("description"):
            job["description"] = data["description"][:1000]
    except Exception as e:
        _log.warning("Translation failed for %s: %s", job.get("id"), e)
    return job


async def refresh_feed() -> None:
    from services.claude import get_client
    boards_path = os.path.join(os.path.dirname(__file__), "../data/boards.json")
    with open(boards_path) as f:
        boards = json.load(f)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        results = await asyncio.gather(*[_fetch_board(client, b) for b in boards])
    jobs: list[dict] = []
    for batch in results:
        jobs.extend(batch)

    # Translate non-English job titles + descriptions to English (sequential to avoid RPM limits)
    non_en_idx = [i for i, j in enumerate(jobs) if not _is_english(j.get("description", ""))]
    if non_en_idx:
        _log.info("Translating %d non-English job(s) via Groq…", len(non_en_idx))
        try:
            groq = get_client()
            for idx, i in enumerate(non_en_idx):
                jobs[i] = await _translate_job(groq, jobs[i])
                if idx < len(non_en_idx) - 1:
                    await asyncio.sleep(2)  # stay within 30 RPM free-tier limit
        except Exception as e:
            _log.warning("Groq translation skipped: %s", e)

    async with _lock:
        _cache.clear()
        _cache.extend(jobs)


def get_cached_jobs() -> list[dict]:
    return list(_cache)
