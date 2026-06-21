import json
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app


async def _fake_tailor(resume, jd):
    yield "Tailored "
    yield "resume text."


def test_coach_streams_all_steps():
    with patch("routers.coach.analyze_fit", new_callable=AsyncMock,
               return_value={"score": 80, "strengths": ["Python"], "gaps": ["Docker"], "verdict": "Good"}), \
         patch("routers.coach.stream_tailor_resume", side_effect=_fake_tailor), \
         patch("routers.coach.generate_outreach", new_callable=AsyncMock,
               return_value="Hi Mercury, I saw you're hiring..."), \
         patch("routers.coach.generate_followup", new_callable=AsyncMock,
               return_value="Following up on my application..."):
        client = TestClient(app)
        r = client.post("/coach", json={
            "resume": "Python dev resume",
            "job": {"id": "j1", "title": "Senior Engineer", "company": "Mercury", "description": "Python role"}
        })
    assert r.status_code == 200
    lines = [l for l in r.text.split("\n") if l.startswith("data: ")]
    steps = [json.loads(l[6:]) for l in lines]
    step_names = [s.get("step") or ("done" if s.get("done") else "") for s in steps]
    assert "fit" in step_names
    assert "tailor" in step_names
    assert "outreach" in step_names
    assert "followup" in step_names
    assert steps[-1].get("done") is True
