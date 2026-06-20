from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

SAMPLE_JOBS = [
    {
        "id": "abc", "title": "Backend Engineer", "company": "Acme",
        "source": "WWR", "url": "https://example.com/1", "tags": ["python"],
        "salary": "$80k", "posted_at": "2026-06-20", "eligibility": "green",
        "description": "Remote worldwide role"
    },
    {
        "id": "def", "title": "React Developer", "company": "Beta",
        "source": "RemoteOK", "url": "https://example.com/2", "tags": ["react"],
        "salary": "", "posted_at": "2026-06-19", "eligibility": "yellow",
        "description": "Must overlap EST"
    },
]


def test_jobs_returns_list():
    with patch("routers.jobs.get_cached_jobs", return_value=SAMPLE_JOBS):
        client = TestClient(app)
        r = client.get("/jobs")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["eligibility"] == "green"


def test_jobs_filter_by_tag():
    with patch("routers.jobs.get_cached_jobs", return_value=SAMPLE_JOBS):
        client = TestClient(app)
        r = client.get("/jobs?tag=react")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert "react" in data[0]["tags"]


def test_jobs_filter_by_eligibility():
    with patch("routers.jobs.get_cached_jobs", return_value=SAMPLE_JOBS):
        client = TestClient(app)
        r = client.get("/jobs?eligibility=green")
    assert r.status_code == 200
    assert all(j["eligibility"] == "green" for j in r.json())


def test_jobs_filter_by_source():
    with patch("routers.jobs.get_cached_jobs", return_value=SAMPLE_JOBS):
        client = TestClient(app)
        r = client.get("/jobs?source=WWR")
    assert r.status_code == 200
    assert all(j["source"] == "WWR" for j in r.json())
