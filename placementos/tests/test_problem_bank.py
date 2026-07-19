from services.problem_bank import title_from_slug, parse_problem_rows, merge_records


def test_title_from_slug():
    assert title_from_slug("number-of-islands") == "Number Of Islands"
    assert title_from_slug("lru-cache") == "Lru Cache"


def test_parse_tagged_row():
    text = "200 Number of Islands (/problems/number-of-islands) 54.1% Medium"
    rows = parse_problem_rows(text)
    assert rows == [{
        "id": 200, "title": "Number of Islands", "slug": "number-of-islands",
        "difficulty": "Medium", "acceptance": 54.1,
    }]


def test_parse_wrapped_row_joins_slug():
    # Facebook-style rows wrap the slug across a newline
    text = "301 Remove Invalid Parentheses (/problems/remove-\ninvalid-parentheses)\n39.8% Hard"
    rows = parse_problem_rows(text)
    assert rows[0]["slug"] == "remove-invalid-parentheses"
    assert rows[0]["difficulty"] == "Hard"
    assert rows[0]["acceptance"] == 39.8


def test_parse_acceptance_optional():
    text = "146 LRU Cache (/problems/lru-cache) Medium"
    rows = parse_problem_rows(text)
    assert rows[0]["slug"] == "lru-cache"
    assert rows[0]["acceptance"] is None
    assert rows[0]["difficulty"] == "Medium"


def test_parse_url_list_line():
    # DSA-sheet style: bare numbered LeetCode URLs, no title/difficulty
    text = "1. https://leetcode.com/problems/valid-parentheses/2. https://leetcode.com/problems/maximum-subarray/"
    rows = parse_problem_rows(text)
    slugs = [r["slug"] for r in rows]
    assert slugs == ["valid-parentheses", "maximum-subarray"]
    assert rows[0]["title"] == "Valid Parentheses"  # derived from slug
    assert rows[0]["difficulty"] is None


def test_parse_skips_noise():
    text = "5/18/22, 5:13 PM Amazon - LeetCode\nhttps://leetcode.com/company/amazon/ 1/31\nShow problem tags"
    assert parse_problem_rows(text) == []


def test_merge_dedupes_and_keeps_best_rank():
    amazon = [
        {"id": 1, "title": "Two Sum", "slug": "two-sum", "difficulty": "Easy", "acceptance": 48.6},
        {"id": 200, "title": "Number of Islands", "slug": "number-of-islands", "difficulty": "Medium", "acceptance": 54.1},
    ]
    google = [
        {"id": 200, "title": "Number of Islands", "slug": "number-of-islands", "difficulty": "Medium", "acceptance": 54.1},
    ]
    out = merge_records({"Amazon": amazon, "Google": google})
    islands = next(p for p in out["problems"] if p["slug"] == "number-of-islands")
    companies = {c["company"]: c["rank"] for c in islands["companies"]}
    assert companies == {"Amazon": 2, "Google": 1}
    assert islands["leetcode_url"] == "https://leetcode.com/problems/number-of-islands/"
    counts = {c["company"]: c["count"] for c in out["companies"]}
    assert counts == {"Amazon": 2, "Google": 1}


def test_merge_prefers_real_title_over_slug_derived():
    # Sheet (URL-only) is processed first -> entry starts with slug-derived title "Lru Cache".
    # Amazon (tagged) then supplies the real title "LRU Cache", which must replace it.
    url_only = [{"id": None, "title": "Lru Cache", "slug": "lru-cache", "difficulty": None, "acceptance": None}]
    tagged = [{"id": 146, "title": "LRU Cache", "slug": "lru-cache", "difficulty": "Medium", "acceptance": 40.0}]
    out = merge_records({"Sheet": url_only, "Amazon": tagged})
    lru = next(p for p in out["problems"] if p["slug"] == "lru-cache")
    assert lru["title"] == "LRU Cache"       # real title preferred over slug-derived
    assert lru["difficulty"] == "Medium"     # filled from the tagged source
    assert lru["acceptance"] == 40.0
