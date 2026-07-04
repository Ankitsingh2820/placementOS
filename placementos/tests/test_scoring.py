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


def _sent_prompt(mock_client) -> str:
    """The prompt string rank_jobs sent to Groq via the mocked client."""
    return mock_client.chat.completions.create.call_args.kwargs["messages"][0]["content"]


@pytest.mark.asyncio
async def test_rank_jobs_with_action_requests_and_passes_action():
    payload = json.dumps([{"job_id": "j0", "score": 88, "reason": "fit", "action": "add metrics"}])
    mock = _mock_groq(payload)
    with patch("services.agents.get_client", return_value=mock):
        from services.agents import rank_jobs
        out = await rank_jobs("resume text", JOBS, top_k=10, with_action=True)
    # action passes through to the result
    assert out[0]["action"] == "add metrics"
    # and with_action=True actually injects the action field into the prompt
    assert '"action"' in _sent_prompt(mock)


@pytest.mark.asyncio
async def test_rank_jobs_without_action_omits_action_field_from_prompt():
    payload = json.dumps([{"job_id": "j0", "score": 88, "reason": "fit"}])
    mock = _mock_groq(payload)
    with patch("services.agents.get_client", return_value=mock):
        from services.agents import rank_jobs
        await rank_jobs("resume text", JOBS, top_k=10, with_action=False)
    assert '"action"' not in _sent_prompt(mock)


@pytest.mark.asyncio
async def test_generate_digest_returns_up_to_ten():
    jobs = [
        {"id": f"j{i}", "title": f"Job {i}", "company": "Co", "description": "remote",
         "tags": [], "url": f"https://ex.com/{i}", "eligibility": "green", "work_type": "remote"}
        for i in range(12)
    ]
    payload = json.dumps([
        {"job_id": f"j{i}", "score": 90 - i, "reason": "match", "action": "tailor"}
        for i in range(10)
    ])
    with patch("services.agents.get_client", return_value=_mock_groq(payload)):
        from services.agents import generate_digest
        out = await generate_digest("python dev resume", jobs)
    assert len(out) == 10
    assert out[0]["url"] == "https://ex.com/0"
    assert all("action" in r for r in out)
