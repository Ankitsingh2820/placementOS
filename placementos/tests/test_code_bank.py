import json
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

_BANK = {
    "generated_at": "2026-07-19",
    "problems": [
        {"slug": "two-sum", "id": 1, "title": "Two Sum", "difficulty": "Easy",
         "acceptance": 48.6, "leetcode_url": "https://leetcode.com/problems/two-sum/",
         "companies": [{"company": "Amazon", "rank": 6}]},
        {"slug": "reorder-list", "id": 143, "title": "Reorder List", "difficulty": "Medium",
         "acceptance": 50.0, "leetcode_url": "https://leetcode.com/problems/reorder-list/",
         "companies": [{"company": "Amazon", "rank": 1}]},
    ],
    "companies": [
        {"company": "Amazon", "count": 2, "source_date": "2022-05-18"},
        {"company": "Directi", "count": 0, "source_date": "2022-05-18"},
    ],
}


def _client():
    import main
    return TestClient(main.app)


def test_companies_endpoint():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/companies")
    assert r.status_code == 200
    assert r.json()[0]["company"] == "Amazon"


def test_companies_endpoint_excludes_zero_count():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/companies")
    companies = [c["company"] for c in r.json()]
    assert "Directi" not in companies


def test_problems_by_company_sorted_by_rank():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problems?company=Amazon")
    slugs = [p["slug"] for p in r.json()]
    assert slugs == ["reorder-list", "two-sum"]


def test_problems_no_args_still_returns_seeds():
    # Regression guard: existing behavior unchanged.
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problems")
    titles = [p["title"] for p in r.json()]
    assert "Two Sum" in titles and len(titles) == 12


def test_problem_slug_uses_seed_when_available():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problem/two-sum")
    body = r.json()
    assert body["slug"] == "two-sum"
    assert body["solvable"] is True
    assert body["starter_code"]["python"]  # curated seed statement


def test_problem_slug_renders_via_llm_when_not_seed():
    fake = json.dumps({
        "description": "Reorder the list...", "examples": [],
        "constraints": [], "topic": "Linked Lists",
        "starter_code": {"python": "def reorderList(head):\n    pass", "javascript": "", "cpp": ""},
    })
    choice = MagicMock(); choice.message.content = fake
    resp = MagicMock(); resp.choices = [choice]
    client = MagicMock(); client.chat.completions.create = AsyncMock(return_value=resp)
    with patch("services.problem_bank.load_bank", return_value=_BANK), \
         patch("services.codeproblems.get_client", return_value=client):
        r = _client().get("/code/problem/reorder-list")
    body = r.json()
    assert body["title"] == "Reorder List"
    assert body["description"].startswith("Reorder")
    assert body["leetcode_url"].endswith("/reorder-list/")


def test_problem_slug_seed_not_in_bank_gets_correct_leetcode_url():
    # max-subarray is a curated seed whose id is NOT the canonical LeetCode slug,
    # and it is absent from _BANK. render_problem must still return a correct
    # leetcode_url (not a naive/404 f"...problems/{slug}/" fallback).
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problem/max-subarray")
    assert r.status_code == 200
    body = r.json()
    assert body["leetcode_url"] == "https://leetcode.com/problems/maximum-subarray/"
    assert body["solvable"] is True
    assert body["starter_code"]["python"]  # curated seed statement


def test_problem_slug_unknown_is_404():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problem/does-not-exist")
    assert r.status_code == 404
