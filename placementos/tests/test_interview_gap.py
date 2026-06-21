from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

GAP_RESULT = {
    "weak_areas": ["quantifying results", "confidence"],
    "study_plan": [{"area": "Results", "issue": "vague numbers", "exercise": "write 3 STAR answers with metrics"}],
    "practice_prompts": ["Tell me about a measurable achievement in your last role."]
}

SCORECARD = {
    "answers": [{"question": "Tell me about yourself", "answer_summary": "vague", "scores": {"clarity": 2, "structure": 2, "relevance": 3, "specificity": 1, "confidence": 2}, "good_phrases": [], "weak_phrases": ["I think", "maybe"]}],
    "overall": {"clarity": 2, "structure": 2, "relevance": 3, "specificity": 1, "confidence": 2},
    "weakest_answer_index": 0,
    "rewritten_answer": "Strong rewrite..."
}


def test_gap_analysis_returns_plan():
    with patch("routers.interview.analyze_gap", new_callable=AsyncMock, return_value=GAP_RESULT):
        client = TestClient(app)
        r = client.post("/interview/gap", json={"scorecard": SCORECARD, "jd": "senior python engineer"})
    assert r.status_code == 200
    data = r.json()
    assert "weak_areas" in data
    assert "study_plan" in data
    assert len(data["practice_prompts"]) > 0
