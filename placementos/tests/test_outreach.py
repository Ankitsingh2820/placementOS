from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from main import app

PAYLOAD = {
    "resume": "5 years Python, built payment APIs handling $50M/month at Razorpay",
    "company": "Stripe",
    "role": "Senior Backend Engineer",
    "github": "https://github.com/testuser",
}


def _mock_groq_client(message_text: str):
    msg = MagicMock()
    msg.content = message_text
    choice = MagicMock()
    choice.message = msg
    response = MagicMock()
    response.choices = [choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=response)
    return mock_client


def test_outreach_returns_message():
    with patch("services.claude.get_client", return_value=_mock_groq_client("I saw Stripe is hiring...")):
        client = TestClient(app)
        r = client.post("/outreach", json=PAYLOAD)

    assert r.status_code == 200
    assert "message" in r.json()
    assert isinstance(r.json()["message"], str)
    assert len(r.json()["message"]) > 10


def test_outreach_without_github():
    with patch("services.claude.get_client", return_value=_mock_groq_client("I saw Acme is hiring...")):
        client = TestClient(app)
        r = client.post("/outreach", json={"resume": "dev", "company": "Acme", "role": "Dev"})

    assert r.status_code == 200
    assert "message" in r.json()
