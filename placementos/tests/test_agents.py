import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


def _mock_groq(content: str):
    """Return a mock AsyncGroq client whose create() returns content."""
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    return mock_client


@pytest.mark.asyncio
async def test_analyze_fit_returns_dict():
    payload = json.dumps({"score": 78, "strengths": ["Python"], "gaps": ["Docker"], "verdict": "Good fit"})
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import analyze_fit
        result = await analyze_fit("my resume", "senior python dev")
    assert result["score"] == 78
    assert "strengths" in result
    assert "gaps" in result


@pytest.mark.asyncio
async def test_analyze_fit_bad_json_fallback():
    with patch("services.agents.get_client", return_value=_mock_groq("not json")):
        from services.agents import analyze_fit
        result = await analyze_fit("resume", "jd")
    assert result["score"] == 0


@pytest.mark.asyncio
async def test_scout_jobs_returns_matches():
    jobs = [
        {"id": "j1", "title": "Python Dev", "company": "Acme", "description": "remote python", "tags": ["python"], "work_type": "remote", "eligibility": "green"},
        {"id": "j2", "title": "React Dev", "company": "Beta", "description": "frontend", "tags": ["react"], "work_type": "remote", "eligibility": "green"},
    ]
    payload = json.dumps([{"job_id": "j1", "score": 90, "reason": "Great Python match"}])
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import scout_jobs
        result = await scout_jobs("python backend remote", jobs)
    assert len(result) == 1
    assert result[0]["job"]["id"] == "j1"
    assert result[0]["score"] == 90


@pytest.mark.asyncio
async def test_analyze_ats_returns_keywords():
    payload = json.dumps({"required": ["python", "fastapi"], "preferred": ["docker"], "present": ["python"], "missing": ["fastapi", "docker"], "ats_score": 33})
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import analyze_ats
        result = await analyze_ats("knows python", "need fastapi docker python")
    assert result["ats_score"] == 33
    assert "python" in result["present"]
    assert "fastapi" in result["missing"]


@pytest.mark.asyncio
async def test_analyze_gap_returns_plan():
    payload = json.dumps({"weak_areas": ["quantifying results"], "study_plan": [{"area": "Results", "issue": "vague", "exercise": "write 3 STAR answers"}], "practice_prompts": ["Tell me about a time..."]})
    scorecard = {"overall": {"clarity": 3}, "answers": [], "weakest_answer_index": 0, "rewritten_answer": ""}
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import analyze_gap
        result = await analyze_gap(scorecard, "senior engineer jd")
    assert len(result["study_plan"]) == 1
    assert len(result["practice_prompts"]) == 1


@pytest.mark.asyncio
async def test_generate_digest_returns_three():
    jobs = [{"id": f"j{i}", "title": f"Job {i}", "company": "Co", "description": "remote", "tags": [], "url": f"https://ex.com/{i}", "eligibility": "green", "work_type": "remote"} for i in range(5)]
    payload = json.dumps([
        {"job_id": "j0", "title": "Job 0", "company": "Co", "score": 90, "reason": "Best match", "action": "highlight Python"},
        {"job_id": "j1", "title": "Job 1", "company": "Co", "score": 80, "reason": "Good", "action": "add metrics"},
        {"job_id": "j2", "title": "Job 2", "company": "Co", "score": 70, "reason": "Decent", "action": "tailor resume"},
    ])
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import generate_digest
        result = await generate_digest("python dev resume", jobs)
    assert len(result) == 3
    assert result[0]["url"] == "https://ex.com/0"
