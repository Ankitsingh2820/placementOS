from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

SAMPLE_JOBS = [
    {"id": "j1", "title": "Python Dev", "company": "Acme", "description": "remote python",
     "tags": ["python"], "work_type": "remote", "eligibility": "green", "url": "https://ex.com/1",
     "salary": "", "posted_at": ""},
]

SCOUT_RESULT = [{"job": SAMPLE_JOBS[0], "score": 90, "reason": "Great Python match"}]
DIGEST_RESULT = [{"job_id": "j1", "title": "Python Dev", "company": "Acme", "score": 90,
                  "reason": "Great fit", "action": "highlight FastAPI", "url": "https://ex.com/1",
                  "eligibility": "green", "work_type": "remote"}]


def test_scout_returns_matches():
    with patch("routers.scout.get_cached_jobs", return_value=SAMPLE_JOBS), \
         patch("routers.scout.scout_jobs", new_callable=AsyncMock, return_value=SCOUT_RESULT):
        client = TestClient(app)
        r = client.post("/scout", json={"query": "python backend remote"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["score"] == 90
    assert data[0]["job"]["id"] == "j1"


def test_digest_returns_top_matches():
    with patch("routers.scout.get_cached_jobs", return_value=SAMPLE_JOBS), \
         patch("routers.scout.generate_digest", new_callable=AsyncMock, return_value=DIGEST_RESULT):
        client = TestClient(app)
        r = client.post("/scout/digest", json={"resume": "my resume text"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["job_id"] == "j1"
    assert "action" in data[0]
