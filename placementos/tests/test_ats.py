from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

ATS_RESULT = {
    "required": ["python", "fastapi", "postgresql"],
    "preferred": ["docker", "kubernetes"],
    "present": ["python", "fastapi"],
    "missing": ["postgresql", "docker", "kubernetes"],
    "ats_score": 40
}


def test_ats_keywords_returns_analysis():
    with patch("routers.resume.analyze_ats", new_callable=AsyncMock, return_value=ATS_RESULT):
        client = TestClient(app)
        r = client.post("/resume/ats", json={
            "resume": "Experienced Python and FastAPI developer",
            "jd": "Need python fastapi postgresql docker kubernetes"
        })
    assert r.status_code == 200
    data = r.json()
    assert data["ats_score"] == 40
    assert "python" in data["present"]
    assert "postgresql" in data["missing"]
    assert len(data["required"]) == 3


def test_ats_keywords_missing_resume():
    with patch("routers.resume.analyze_ats", new_callable=AsyncMock, return_value=ATS_RESULT):
        client = TestClient(app)
        r = client.post("/resume/ats", json={
            "resume": "   ",
            "jd": "Need python fastapi postgresql"
        })
    assert r.status_code == 400


def test_ats_keywords_missing_jd():
    with patch("routers.resume.analyze_ats", new_callable=AsyncMock, return_value=ATS_RESULT):
        client = TestClient(app)
        r = client.post("/resume/ats", json={
            "resume": "Experienced Python developer",
            "jd": "   "
        })
    assert r.status_code == 400
