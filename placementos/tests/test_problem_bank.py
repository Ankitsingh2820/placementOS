import json

from services.problem_bank import (
    title_from_slug, parse_problem_rows, merge_records,
    load_bank, get_companies, get_company_problems, find_problem,
)


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


def test_parse_multi_row_block_no_title_bleed():
    # Two rows on one contiguous line must NOT collapse into one record.
    # id 4 -> median-of-two-sorted-arrays, id 192 -> word-frequency.
    text = (
        "4 Median of Two Sorted Arrays (/problems/median-of-two-sorted-arrays) 26.9% Hard "
        "192 Word Frequency (/problems/word-frequency) 25.9% Medium"
    )
    rows = parse_problem_rows(text)
    by_slug = {r["slug"]: r for r in rows}
    assert set(by_slug) == {"median-of-two-sorted-arrays", "word-frequency"}
    assert by_slug["median-of-two-sorted-arrays"]["id"] == 4
    assert by_slug["median-of-two-sorted-arrays"]["title"] == "Median of Two Sorted Arrays"
    assert by_slug["median-of-two-sorted-arrays"]["difficulty"] == "Hard"
    assert by_slug["word-frequency"]["id"] == 192
    assert by_slug["word-frequency"]["title"] == "Word Frequency"
    assert by_slug["word-frequency"]["difficulty"] == "Medium"
    for r in rows:
        assert "/problems/" not in r["title"]
        assert len(r["title"]) < 80


def test_parse_three_rows_no_collapse():
    text = (
        "269 Alien Dictionary (/problems/alien-dictionary) 31.6% Hard "
        "585 Investments in 2016 (/problems/investments-in-2016) 48.2% Medium "
        "679 24 Game (/problems/24-game) 47.0% Hard"
    )
    rows = parse_problem_rows(text)
    by_slug = {r["slug"]: r for r in rows}
    assert set(by_slug) == {"alien-dictionary", "investments-in-2016", "24-game"}
    assert by_slug["alien-dictionary"]["id"] == 269
    assert by_slug["investments-in-2016"]["id"] == 585
    assert by_slug["24-game"]["id"] == 679
    assert by_slug["24-game"]["title"] == "24 Game"


def test_parse_dropped_difficulty_does_not_bleed_into_next_row():
    # Real PDF artifact: the first row's difficulty token is missing (garbled
    # "Di?culty" extraction). The lazy title must NOT cross into the next row's
    # link and steal its slug. Median has no valid row here, so it is simply
    # skipped -- but word-frequency must still parse cleanly with id 192.
    text = (
        "4 Median of Two Sorted Arrays (/problems/median-of-two-sorted-arrays) 26.9% "
        "192 Word Frequency (/problems/word-frequency) 25.9% Medium"
    )
    rows = parse_problem_rows(text)
    by_slug = {r["slug"]: r for r in rows}
    assert "word-frequency" in by_slug
    wf = by_slug["word-frequency"]
    assert wf["id"] == 192
    assert wf["title"] == "Word Frequency"
    assert wf["difficulty"] == "Medium"
    # median must never appear under the wrong slug/id with a bled title
    assert "median-of-two-sorted-arrays" not in {r["slug"] for r in rows} or \
        by_slug["median-of-two-sorted-arrays"]["id"] == 4
    for r in rows:
        assert "/problems/" not in r["title"]


def test_parse_ignores_page_header_preamble():
    # Page-header junk before the first row must not become id/title.
    text = (
        "5/18/22, 5:13 PM Amazon - LeetCode https://leetcode.com/company/amazon/ 1/31 "
        "You have solved 80 / 1166 problems. Show problem tags "
        "# Title Acceptance Difficulty Frequency "
        "1 Two Sum (/problems/two-sum) 48.6% Easy"
    )
    rows = parse_problem_rows(text)
    assert rows == [{
        "id": 1, "title": "Two Sum", "slug": "two-sum",
        "difficulty": "Easy", "acceptance": 48.6,
    }]


def test_parse_titles_never_contain_bleed_tokens():
    text = (
        "4 Median of Two Sorted Arrays (/problems/median-of-two-sorted-arrays) 26.9% Hard "
        "192 Word Frequency (/problems/word-frequency) 25.9% Medium "
        "269 Alien Dictionary (/problems/alien-dictionary) 31.6% Hard"
    )
    rows = parse_problem_rows(text)
    assert rows  # non-empty
    for r in rows:
        title = r["title"]
        assert "/problems/" not in title
        tokens = title.split()
        assert "Easy" not in tokens
        assert "Medium" not in tokens
        assert "Hard" not in tokens


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


_FIXTURE = {
    "generated_at": "2026-07-19",
    "problems": [
        {"slug": "two-sum", "id": 1, "title": "Two Sum", "difficulty": "Easy",
         "acceptance": 48.6, "leetcode_url": "https://leetcode.com/problems/two-sum/",
         "companies": [{"company": "Amazon", "rank": 6}]},
        {"slug": "number-of-islands", "id": 200, "title": "Number of Islands",
         "difficulty": "Medium", "acceptance": 54.1,
         "leetcode_url": "https://leetcode.com/problems/number-of-islands/",
         "companies": [{"company": "Amazon", "rank": 3}, {"company": "Google", "rank": 1}]},
    ],
    "companies": [
        {"company": "Amazon", "count": 2, "source_date": "2022-05-18", "ordering": "frequency"},
        {"company": "Google", "count": 1, "source_date": None, "ordering": "listed"},
    ],
}


def test_load_bank_missing_file_is_empty():
    bank = load_bank("/no/such/file.json")
    assert bank == {"generated_at": None, "problems": [], "companies": []}


def test_get_company_problems_sorted_by_rank(tmp_path):
    p = tmp_path / "bank.json"
    p.write_text(json.dumps(_FIXTURE), encoding="utf-8")
    bank = load_bank(str(p))
    amazon = get_company_problems(bank, "Amazon")
    assert [x["slug"] for x in amazon] == ["number-of-islands", "two-sum"]  # rank 3 before rank 6
    assert amazon[0]["rank"] == 3
    google = get_company_problems(bank, "Google")
    assert [x["slug"] for x in google] == ["number-of-islands"]


def test_get_companies_sorted_by_count(tmp_path):
    p = tmp_path / "bank.json"
    p.write_text(json.dumps(_FIXTURE), encoding="utf-8")
    bank = load_bank(str(p))
    cos = get_companies(bank)
    assert cos[0]["company"] == "Amazon"
    assert cos[0]["source_date"] == "2022-05-18"
    assert cos[0]["ordering"] == "frequency"


def test_find_problem(tmp_path):
    p = tmp_path / "bank.json"
    p.write_text(json.dumps(_FIXTURE), encoding="utf-8")
    bank = load_bank(str(p))
    assert find_problem(bank, "two-sum")["title"] == "Two Sum"
    assert find_problem(bank, "nope") is None
