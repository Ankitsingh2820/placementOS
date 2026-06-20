from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from main import app

PAYLOAD = {
    "resume": "5 years Python backend, built payment APIs at Razorpay",
    "jd": "Senior backend engineer, Python, distributed systems, Worldwide remote",
    "history": [],
    "action": "next",
    "questions_asked": 0,
}


def _chunk(text):
    """Build a fake Groq streaming chunk."""
    delta = MagicMock()
    delta.content = text
    choice = MagicMock()
    choice.delta = delta
    chunk = MagicMock()
    chunk.choices = [choice]
    return chunk


async def _async_chunks(texts):
    for t in texts:
        yield _chunk(t)


def _mock_groq_client(chunks):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_async_chunks(chunks))
    return mock_client


def test_interview_streams_text():
    with patch("services.claude.get_client", return_value=_mock_groq_client(["Tell ", "me ", "about ", "yourself."])):
        client = TestClient(app)
        r = client.post("/interview", json=PAYLOAD)

    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]


def test_interview_includes_done_event():
    with patch("services.claude.get_client", return_value=_mock_groq_client(["Hello."])):
        client = TestClient(app)
        r = client.post("/interview", json=PAYLOAD)

    assert '{"done": true}' in r.text
