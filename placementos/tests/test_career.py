import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


def _mock_groq(*contents):
    """AsyncGroq mock whose create() returns the given contents in sequence."""
    def _resp(text):
        choice = MagicMock()
        choice.message.content = text
        resp = MagicMock()
        resp.choices = [choice]
        return resp
    client = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=[_resp(c) for c in contents])
    return client


VALID = json.dumps({
    "role_profile": {"title": "Data Analyst", "company": "", "description": "A " + ("x" * 130)},
    "modules": [
        {"id": "m1", "title": "Foundations", "steps": [
            {"id": "m1s1", "title": "Practice SQL", "description": "do it", "tool": "code", "config": {"focus": "joins"}},
            {"id": "m1s2", "title": "Mock round", "description": "do it", "tool": "interview", "config": {}},
        ]},
        {"id": "m2", "title": "Polish", "steps": [
            {"id": "m2s1", "title": "Coach", "description": "do it", "tool": "coach", "config": {}},
        ]},
    ],
})


@pytest.mark.asyncio
async def test_generate_roadmap_valid():
    with patch("services.career.get_client", return_value=_mock_groq(VALID)):
        from services.career import generate_roadmap
        result = await generate_roadmap("Data Analyst", "Fresher")
    assert result["domain"] == "Data Analyst"
    assert result["level"] == "Fresher"
    assert result["role_profile"]["description"]
    assert result["modules"][0]["steps"][0]["tool"] == "code"


@pytest.mark.asyncio
async def test_generate_roadmap_retries_then_succeeds():
    bad = json.dumps({"modules": []})  # invalid: empty modules
    with patch("services.career.get_client", return_value=_mock_groq(bad, VALID)):
        from services.career import generate_roadmap
        result = await generate_roadmap("Data Analyst", "Fresher")
    assert len(result["modules"]) == 2


@pytest.mark.asyncio
async def test_generate_roadmap_rejects_invalid_tool():
    bad_tool = json.dumps({
        "role_profile": {"title": "X", "company": "", "description": "y" * 130},
        "modules": [{"id": "m1", "title": "M", "steps": [
            {"id": "s1", "title": "T", "description": "d", "tool": "video", "config": {}}]}],
    })
    with patch("services.career.get_client", return_value=_mock_groq(bad_tool, bad_tool)):
        from services.career import generate_roadmap
        with pytest.raises(ValueError):
            await generate_roadmap("Data Analyst", "Fresher")


@pytest.mark.asyncio
async def test_generate_roadmap_malformed_json_raises():
    with patch("services.career.get_client", return_value=_mock_groq("not json", "still not json")):
        from services.career import generate_roadmap
        with pytest.raises(ValueError):
            await generate_roadmap("Data Analyst", "Fresher")


from fastapi.testclient import TestClient


def test_roadmap_endpoint_success():
    with patch("routers.career.generate_roadmap", new=AsyncMock(return_value={"ok": True})):
        from main import app
        client = TestClient(app)
        r = client.post("/career/roadmap", json={"domain": "Data Analyst", "level": "Fresher"})
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_roadmap_endpoint_blank_domain():
    from main import app
    client = TestClient(app)
    r = client.post("/career/roadmap", json={"domain": "   ", "level": "Fresher"})
    assert r.status_code == 400


def test_roadmap_endpoint_generation_failure():
    with patch("routers.career.generate_roadmap", new=AsyncMock(side_effect=ValueError("boom"))):
        from main import app
        client = TestClient(app)
        r = client.post("/career/roadmap", json={"domain": "Data Analyst"})
    assert r.status_code == 502
