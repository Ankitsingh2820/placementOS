import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


def _mock_groq(content: str):
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    return mock_client


JOBS = [
    {"id": f"j{i}", "title": f"Job {i}", "company": "Co", "description": "remote", "tags": []}
    for i in range(12)
]


@pytest.mark.asyncio
async def test_rank_jobs_filters_entries_without_id():
    payload = json.dumps([
        {"job_id": "j1", "score": 90, "reason": "good"},
        {"score": 50, "reason": "no id here"},
    ])
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import rank_jobs
        out = await rank_jobs("python backend", JOBS, top_k=10)
    assert len(out) == 1
    assert out[0]["job_id"] == "j1"
    assert out[0]["score"] == 90


@pytest.mark.asyncio
async def test_rank_jobs_with_action_passes_action_through():
    payload = json.dumps([{"job_id": "j0", "score": 88, "reason": "fit", "action": "add metrics"}])
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import rank_jobs
        out = await rank_jobs("resume text", JOBS, top_k=10, with_action=True)
    assert out[0]["action"] == "add metrics"
