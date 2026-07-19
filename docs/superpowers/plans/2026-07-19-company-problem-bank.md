# Company Problem Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract real company-tagged LeetCode problems from the collected PDFs into a committed JSON bank, and let Code Practice serve a company's actually-asked problems (frequency-ordered) instead of hallucinated ones.

**Architecture:** Pure parse/merge/load functions live in a new `services/problem_bank.py` (importable by both the offline build script and pytest). An offline script `scripts/build_problem_bank.py` does PDF I/O and writes `data/company_problems.json` (committed). The `code` router gains company-aware endpoints; the existing seed/job/evaluate/hint paths are untouched. Frontend adds a company picker to the Code Practice page.

**Tech Stack:** FastAPI, pypdf (already a dependency), Groq SDK, pytest (`asyncio_mode=auto`), React 18 + Vite, Tailwind.

## Global Constraints

- Python backend lives in `placementos/`; pytest runs with that as rootdir (`placementos/pytest.ini`, `asyncio_mode = auto`). Run tests from inside `placementos/`.
- No database, no vector store, no new runtime service. The bank is a static JSON loaded once at startup, mirroring the `data/boards.json` pattern (`services/feed.py:347-351`).
- No re-hosting PDFs. Only the derived `company_problems.json` (<1 MB) is committed. `docs/data for training/` is already gitignored.
- Groq client is obtained via `from services.claude import get_client, MODEL`; async call is `await client.chat.completions.create(model=MODEL, messages=[...], max_tokens=...)`. Mock it in tests with the `_mock_groq` helper pattern from `tests/test_career.py`.
- Commit identity: author `Ankitsingh2820 <ankitsingh41201@gmail.com>`. Never add a `Co-Authored-By: Claude` trailer.
- LeetCode slugs are lowercase, hyphen-separated (`[a-z0-9-]+`). Difficulty is exactly one of `Easy|Medium|Hard`.
- Source PDFs are under `docs/data for training/` in two download folders; the tagged/company files also appear inside `.../drive-download-20260719T075944Z-1-001/Company Wise DSA Materials/`.

---

### Task 1: PDF row parser + merge (pure functions)

**Files:**
- Create: `placementos/services/problem_bank.py`
- Test: `placementos/tests/test_problem_bank.py`

**Interfaces:**
- Produces:
  - `title_from_slug(slug: str) -> str` — `"number-of-islands"` → `"Number Of Islands"`.
  - `parse_problem_rows(text: str) -> list[dict]` — returns records `{"id": int|None, "title": str, "slug": str, "difficulty": str, "acceptance": float|None}`. Parses both tagged-export rows and bare `/problems/<slug>` URL lists. Skips non-matching lines.
  - `merge_records(per_company: dict[str, list[dict]]) -> dict` — input maps company name → ordered list of parsed records (row order = frequency). Returns `{"problems": [...], "companies": [...]}` per the spec's JSON shape (without `generated_at`, which the script adds).

- [ ] **Step 1: Write the failing test**

```python
# placementos/tests/test_problem_bank.py
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
    tagged = [{"id": 1, "title": "Two Sum", "slug": "two-sum", "difficulty": "Easy", "acceptance": 48.6}]
    url_only = [{"id": None, "title": "Two Sum", "slug": "two-sum", "difficulty": None, "acceptance": None}]
    out = merge_records({"Amazon": tagged, "Sheet": url_only})
    two_sum = next(p for p in out["problems"] if p["slug"] == "two-sum")
    assert two_sum["difficulty"] == "Easy"       # filled from the tagged source
    assert two_sum["acceptance"] == 48.6
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `placementos/`): `python -m pytest tests/test_problem_bank.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.problem_bank'`.

- [ ] **Step 3: Write minimal implementation**

```python
# placementos/services/problem_bank.py
import re

_ROW_RE = re.compile(
    r"(?P<id>\d+)\s+"
    r"(?P<title>.+?)\s*"
    r"\(/problems/(?P<slug>[a-z0-9\-\s]+?)\)"
    r"\s*(?:(?P<acc>\d+(?:\.\d+)?)%\s*)?"
    r"(?P<diff>Easy|Medium|Hard)",
    re.DOTALL,
)
_URL_RE = re.compile(r"https?://leetcode\.com/problems/(?P<slug>[a-z0-9\-]+)/?")


def title_from_slug(slug: str) -> str:
    return " ".join(word.capitalize() for word in slug.split("-"))


def _clean_slug(raw: str) -> str:
    return re.sub(r"\s+", "", raw)


def _clean_title(raw: str) -> str:
    return re.sub(r"\s+", " ", raw).strip()


def parse_problem_rows(text: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()

    for m in _ROW_RE.finditer(text):
        slug = _clean_slug(m.group("slug"))
        if not slug or slug in seen:
            continue
        seen.add(slug)
        acc = m.group("acc")
        rows.append({
            "id": int(m.group("id")),
            "title": _clean_title(m.group("title")),
            "slug": slug,
            "difficulty": m.group("diff"),
            "acceptance": float(acc) if acc else None,
        })

    # Fallback: bare LeetCode problem URLs (DSA-sheet style) not already captured
    for m in _URL_RE.finditer(text):
        slug = m.group("slug")
        if slug in seen:
            continue
        seen.add(slug)
        rows.append({
            "id": None,
            "title": title_from_slug(slug),
            "slug": slug,
            "difficulty": None,
            "acceptance": None,
        })

    return rows


def _better_title(existing: str, candidate: str, cand_slug: str) -> str:
    # Prefer a title that isn't merely slug-derived.
    slug_derived = title_from_slug(cand_slug)
    if not existing:
        return candidate
    if existing == title_from_slug(cand_slug) and candidate != slug_derived:
        return candidate
    return existing


def merge_records(per_company: dict[str, list[dict]]) -> dict:
    problems: dict[str, dict] = {}
    companies: list[dict] = []

    for company, records in per_company.items():
        companies.append({"company": company, "count": len(records)})
        for rank, rec in enumerate(records, start=1):
            slug = rec["slug"]
            entry = problems.get(slug)
            if entry is None:
                entry = {
                    "slug": slug,
                    "id": rec.get("id"),
                    "title": rec["title"],
                    "difficulty": rec.get("difficulty"),
                    "acceptance": rec.get("acceptance"),
                    "leetcode_url": f"https://leetcode.com/problems/{slug}/",
                    "companies": [],
                }
                problems[slug] = entry
            else:
                entry["title"] = _better_title(entry["title"], rec["title"], slug)
                if entry.get("difficulty") is None and rec.get("difficulty"):
                    entry["difficulty"] = rec["difficulty"]
                if entry.get("acceptance") is None and rec.get("acceptance") is not None:
                    entry["acceptance"] = rec["acceptance"]
                if entry.get("id") is None and rec.get("id") is not None:
                    entry["id"] = rec["id"]

            existing_rank = next((c for c in entry["companies"] if c["company"] == company), None)
            if existing_rank is None:
                entry["companies"].append({"company": company, "rank": rank})
            elif rank < existing_rank["rank"]:
                existing_rank["rank"] = rank

    return {"problems": list(problems.values()), "companies": companies}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `placementos/`): `python -m pytest tests/test_problem_bank.py -v`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add placementos/services/problem_bank.py placementos/tests/test_problem_bank.py
git commit -m "feat: add company problem bank parser and merge"
```

---

### Task 2: Offline build script + generate committed bank

**Files:**
- Create: `scripts/build_problem_bank.py`
- Create (generated, committed): `placementos/data/company_problems.json`

**Interfaces:**
- Consumes: `services.problem_bank.parse_problem_rows`, `merge_records`.
- Produces: `placementos/data/company_problems.json` with shape `{"generated_at": str, "problems": [...], "companies": [{"company", "count", "source_date"}]}`.

This task generates data, not code-under-test; its "test" is running the script and sanity-checking the counts.

- [ ] **Step 1: Write the build script**

```python
# scripts/build_problem_bank.py
"""Offline: extract a company problem bank from the tagged LeetCode PDFs.

Run from the repo root:  python scripts/build_problem_bank.py
Not imported by the server. Requires pypdf and the PDFs under
'docs/data for training/'.
"""
import os
import re
import sys
import json
from datetime import date

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "placementos"))

from services.problem_bank import parse_problem_rows, merge_records  # noqa: E402
import pypdf  # noqa: E402

PDF_ROOT = os.path.join(REPO_ROOT, "docs", "data for training")
OUT_PATH = os.path.join(REPO_ROOT, "placementos", "data", "company_problems.json")

# Filename (basename, exact) -> company. Single source of truth; extend freely.
FILENAME_COMPANY_MAP = {
    "Adobe - LeetCode.pdf": "Adobe",
    "Amazon Tagged LeetCode Problems .pdf": "Amazon",
    "Apple - LeetCode.pdf": "Apple",
    "Directi.pdf": "Directi",
    "Expedia - LeetCode.pdf": "Expedia",
    "Facebook - LeetCode.pdf": "Facebook",
    "Goldman Sachs Tagged LeetCode Problems .pdf": "Goldman Sachs",
    "Google Tagged LeetCode Problems  .pdf": "Google",
    "JP Morgan Tagged LeetCode Problems.pdf": "JP Morgan",
    "Linkedin Tagged LeetCode Problems.pdf": "LinkedIn",
    "Microsoft Tagged LeetCode Problems.pdf": "Microsoft",
    "Oracle - LeetCode.pdf": "Oracle",
    "Twitter Tagged LeetCode Problems.pdf": "Twitter",
    "Uber Tagged LeetCode Problems  .pdf": "Uber",
    "Visa - LeetCode.pdf": "Visa",
    "VMware Tagged LeetCode Problems.pdf": "VMware",
    "Walmart Labs - LeetCode.pdf": "Walmart",
}

_DATE_RE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2,4})")


def _find_pdf(basename: str) -> str | None:
    for dirpath, _dirs, files in os.walk(PDF_ROOT):
        if basename in files:
            return os.path.join(dirpath, basename)
    return None


def _extract_text(path: str) -> str:
    reader = pypdf.PdfReader(path)
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _source_date(text: str) -> str | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    mm, dd, yy = m.groups()
    yy = int(yy)
    if yy < 100:
        yy += 2000
    return f"{yy:04d}-{int(mm):02d}-{int(dd):02d}"


def main() -> int:
    per_company: dict[str, list[dict]] = {}
    source_dates: dict[str, str | None] = {}

    for basename, company in FILENAME_COMPANY_MAP.items():
        path = _find_pdf(basename)
        if not path:
            print(f"  MISSING  {company:14s} {basename}")
            continue
        text = _extract_text(path)
        rows = parse_problem_rows(text)
        per_company[company] = rows
        source_dates[company] = _source_date(text)
        print(f"  ok       {company:14s} {len(rows):4d} problems  ({basename})")

    bank = merge_records(per_company)
    for c in bank["companies"]:
        c["source_date"] = source_dates.get(c["company"])
    bank["companies"].sort(key=lambda c: c["count"], reverse=True)
    bank = {"generated_at": date.today().isoformat(), **bank}

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(bank['problems'])} unique problems across "
          f"{len(bank['companies'])} companies -> {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the script**

Run (from repo root): `python scripts/build_problem_bank.py`
Expected: a per-company table with non-zero problem counts for most companies (Amazon/Google/Facebook should be in the dozens-to-hundreds), then a summary line. If a company shows `0 problems`, note it — its PDF layout may differ; that is acceptable for a first build as long as the major companies populate.

- [ ] **Step 3: Sanity-check the output**

Run (from repo root): `python -c "import json; b=json.load(open('placementos/data/company_problems.json', encoding='utf-8')); print(len(b['problems']), 'problems'); print([(c['company'], c['count']) for c in b['companies'][:5]]); print(b['problems'][0])"`
Expected: total problem count in the hundreds; the first few companies have realistic counts; a sample problem has `slug`, `title`, `difficulty`, `leetcode_url`, and a non-empty `companies` list.

- [ ] **Step 4: Commit**

```bash
git add scripts/build_problem_bank.py placementos/data/company_problems.json
git commit -m "feat: build company problem bank from tagged LeetCode PDFs"
```

---

### Task 3: Runtime bank loader

**Files:**
- Modify: `placementos/services/problem_bank.py`
- Test: `placementos/tests/test_problem_bank.py`

**Interfaces:**
- Produces:
  - `load_bank(path: str | None = None) -> dict` — loads and caches the JSON; returns `{"generated_at","problems","companies"}`. On missing file returns `{"generated_at": None, "problems": [], "companies": []}`.
  - `get_companies(bank: dict) -> list[dict]` — `[{"company","count","source_date"}]` sorted by count desc (already sorted in file; re-sort defensively).
  - `get_company_problems(bank: dict, company: str) -> list[dict]` — problems where `company` is in `companies`, sorted by that company's ascending `rank`. Each item: `{slug, id, title, difficulty, acceptance, leetcode_url, rank}`.
  - `find_problem(bank: dict, slug: str) -> dict | None`.

- [ ] **Step 1: Write the failing test**

```python
# append to placementos/tests/test_problem_bank.py
import json
from services.problem_bank import (
    load_bank, get_companies, get_company_problems, find_problem,
)

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
        {"company": "Amazon", "count": 2, "source_date": "2022-05-18"},
        {"company": "Google", "count": 1, "source_date": None},
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


def test_find_problem(tmp_path):
    p = tmp_path / "bank.json"
    p.write_text(json.dumps(_FIXTURE), encoding="utf-8")
    bank = load_bank(str(p))
    assert find_problem(bank, "two-sum")["title"] == "Two Sum"
    assert find_problem(bank, "nope") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `placementos/`): `python -m pytest tests/test_problem_bank.py -k "load_bank or company_problems or get_companies or find_problem" -v`
Expected: FAIL — `ImportError: cannot import name 'load_bank'`.

- [ ] **Step 3: Add the loader to `services/problem_bank.py`**

```python
# append to placementos/services/problem_bank.py
import os
import json

_DEFAULT_BANK_PATH = os.path.join(os.path.dirname(__file__), "../data/company_problems.json")
_CACHE: dict | None = None


def load_bank(path: str | None = None) -> dict:
    global _CACHE
    if path is None:
        if _CACHE is not None:
            return _CACHE
        path = _DEFAULT_BANK_PATH
    empty = {"generated_at": None, "problems": [], "companies": []}
    try:
        with open(path, encoding="utf-8") as f:
            bank = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        bank = empty
    if path == _DEFAULT_BANK_PATH:
        _CACHE = bank
    return bank


def get_companies(bank: dict) -> list[dict]:
    cos = [
        {"company": c["company"], "count": c["count"], "source_date": c.get("source_date")}
        for c in bank.get("companies", [])
    ]
    cos.sort(key=lambda c: c["count"], reverse=True)
    return cos


def get_company_problems(bank: dict, company: str) -> list[dict]:
    out = []
    for p in bank.get("problems", []):
        entry = next((c for c in p["companies"] if c["company"] == company), None)
        if entry is None:
            continue
        out.append({
            "slug": p["slug"], "id": p.get("id"), "title": p["title"],
            "difficulty": p.get("difficulty"), "acceptance": p.get("acceptance"),
            "leetcode_url": p["leetcode_url"], "rank": entry["rank"],
        })
    out.sort(key=lambda x: x["rank"])
    return out


def find_problem(bank: dict, slug: str) -> dict | None:
    return next((p for p in bank.get("problems", []) if p["slug"] == slug), None)
```

Note: `import os`/`import json` are added at the bottom here for locality of the diff; if a reviewer prefers, hoist them to the top of the file with the existing `import re`. Either is fine — do not duplicate the imports.

- [ ] **Step 4: Run test to verify it passes**

Run (from `placementos/`): `python -m pytest tests/test_problem_bank.py -v`
Expected: PASS (all Task 1 + Task 3 tests).

- [ ] **Step 5: Commit**

```bash
git add placementos/services/problem_bank.py placementos/tests/test_problem_bank.py
git commit -m "feat: add runtime loader for company problem bank"
```

---

### Task 4: Backend endpoints (companies, company filter, on-demand statement)

**Files:**
- Modify: `placementos/services/codeproblems.py`
- Modify: `placementos/routers/code.py`
- Test: `placementos/tests/test_code_bank.py` (new)

**Interfaces:**
- Consumes: `services.problem_bank.{load_bank, get_companies, get_company_problems, find_problem}`; `services.codeproblems.SEED_PROBLEMS`.
- Produces (HTTP):
  - `GET /code/companies` → `[{company, count, source_date}]`.
  - `GET /code/problems?company=Amazon` → `get_company_problems(...)` result.
  - `GET /code/problem/{slug}` → full problem `{id?, slug, title, difficulty, topic, description, examples, constraints, starter_code, leetcode_url, solvable}`.
- Produces (service): `services.codeproblems.render_problem(slug: str) -> dict | None` — seed lookup first, else LLM render, else minimal record with `leetcode_url`; `None` if slug unknown to the bank.

- [ ] **Step 1: Write the failing test**

```python
# placementos/tests/test_code_bank.py
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
    "companies": [{"company": "Amazon", "count": 2, "source_date": "2022-05-18"}],
}


def _client():
    import main
    return TestClient(main.app)


def test_companies_endpoint():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/companies")
    assert r.status_code == 200
    assert r.json()[0]["company"] == "Amazon"


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


def test_problem_slug_unknown_is_404():
    with patch("services.problem_bank.load_bank", return_value=_BANK):
        r = _client().get("/code/problem/does-not-exist")
    assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `placementos/`): `python -m pytest tests/test_code_bank.py -v`
Expected: FAIL — `/code/companies` returns 404 (route not defined).

- [ ] **Step 3: Add `render_problem` to `services/codeproblems.py`**

Add near the top, after the existing imports:

```python
from services import problem_bank
```

Add a render prompt beside the other prompt constants:

```python
RENDER_PROMPT = """\
Reproduce the well-known LeetCode problem "{title}" (slug: {slug}).
This is an existing, canonical problem — do NOT invent a new one.

Return ONLY valid JSON (no markdown):
{{
  "description": "<full problem statement, newlines as \\n>",
  "topic": "<Arrays|Strings|Trees|Dynamic Programming|Graphs|Hash Maps|Sorting|Sliding Window|Linked Lists|Stacks|Searching|Design>",
  "examples": [{{"input": "<input>", "output": "<output>", "explanation": "<or empty>"}}],
  "constraints": ["<constraint>"],
  "starter_code": {{"python": "<stub>", "javascript": "<stub>", "cpp": "<stub>"}}
}}
"""

_SEED_BY_SLUG = {p["id"]: p for p in SEED_PROBLEMS}  # seed "id" is the slug string
```

Note: `SEED_PROBLEMS` entries use a slug-like string in their `"id"` field (e.g. `"two-sum"`), so index by that:

```python
_SEED_BY_SLUG = {p["id"]: p for p in SEED_PROBLEMS}


async def render_problem(slug: str) -> dict | None:
    bank = problem_bank.load_bank()
    meta = problem_bank.find_problem(bank, slug)
    if meta is None and slug not in _SEED_BY_SLUG:
        return None

    if slug in _SEED_BY_SLUG:
        seed = dict(_SEED_BY_SLUG[slug])
        seed["slug"] = slug
        seed["solvable"] = True
        if meta:
            seed["leetcode_url"] = meta["leetcode_url"]
        return seed

    base = {
        "slug": slug,
        "id": meta.get("id"),
        "title": meta["title"],
        "difficulty": meta.get("difficulty"),
        "leetcode_url": meta["leetcode_url"],
        "solvable": True,
    }
    try:
        client = get_client()
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": RENDER_PROMPT.format(title=meta["title"], slug=slug)}],
            max_tokens=1500,
        )
        raw = resp.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        base.update({
            "description": data.get("description", ""),
            "topic": data.get("topic", ""),
            "examples": data.get("examples", []),
            "constraints": data.get("constraints", []),
            "starter_code": data.get("starter_code", {}),
        })
    except Exception:
        # LLM failed: minimal record, user falls back to LeetCode.
        base.update({
            "description": f"Solve **{meta['title']}** on LeetCode.",
            "topic": "", "examples": [], "constraints": [],
            "starter_code": {"python": "", "javascript": "", "cpp": ""},
            "solvable": False,
        })
    return base
```

- [ ] **Step 4: Add routes to `routers/code.py`**

```python
# add imports at top
from fastapi import APIRouter, HTTPException
from services import problem_bank
from services.codeproblems import get_problems, evaluate_solution, get_hint, render_problem

# ... existing EvaluateRequest / HintRequest / routes stay ...

@router.get("/code/companies")
async def companies():
    bank = problem_bank.load_bank()
    return problem_bank.get_companies(bank)


@router.get("/code/problem/{slug}")
async def problem_detail(slug: str):
    result = await render_problem(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown problem")
    return result
```

Then update the existing `problems` route to honor `company` before the job path:

```python
@router.get("/code/problems")
async def problems(company: str = "", job_title: str = "", job_company: str = "", job_description: str = ""):
    if company:
        bank = problem_bank.load_bank()
        return problem_bank.get_company_problems(bank, company)
    job = None
    if job_title:
        job = {"title": job_title, "company": job_company, "description": job_description}
    return await get_problems(job)
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `placementos/`): `python -m pytest tests/test_code_bank.py -v`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the full backend suite (regression guard)**

Run (from `placementos/`): `python -m pytest -q`
Expected: all pre-existing tests still pass, plus the new ones.

- [ ] **Step 7: Commit**

```bash
git add placementos/services/codeproblems.py placementos/routers/code.py placementos/tests/test_code_bank.py
git commit -m "feat: company-aware code endpoints with on-demand problem render"
```

---

### Task 5: Frontend company picker

**Files:**
- Modify: `frontend/src/lib/api.js`
- Modify: `frontend/src/components/code/CodePage.jsx`

**Interfaces:**
- Consumes: `GET /code/companies`, `GET /code/problems?company=`, `GET /code/problem/{slug}`.
- Produces: `fetchCompanies()`, `fetchCompanyProblems(company)`, `fetchProblemDetail(slug)` in `api.js`; a company `<select>` and company-filtered list in `CodePage`.

- [ ] **Step 1: Add API helpers to `frontend/src/lib/api.js`**

```javascript
export async function fetchCompanies() {
  const r = await fetch('/code/companies')
  if (!r.ok) throw new Error('Failed to fetch companies')
  return r.json()
}

export async function fetchCompanyProblems(company) {
  const r = await fetch(`/code/problems?company=${encodeURIComponent(company)}`)
  if (!r.ok) throw new Error('Failed to fetch company problems')
  return r.json()
}

export async function fetchProblemDetail(slug) {
  const r = await fetch(`/code/problem/${encodeURIComponent(slug)}`)
  if (!r.ok) throw new Error('Failed to fetch problem')
  return r.json()
}
```

- [ ] **Step 2: Wire the picker into `CodePage.jsx`**

Update the import and add company state + a picker. In the imports block:

```javascript
import { fetchProblems, evaluateCode, fetchHint, fetchCompanies, fetchCompanyProblems, fetchProblemDetail } from '../../lib/api'
```

Add state near the other `useState` calls in `CodePage`:

```javascript
const [companies, setCompanies]   = useState([])
const [company, setCompany]       = useState('')
const [loadingDetail, setLoadingDetail] = useState(false)
```

Add an effect to load companies once (place beside the existing problem-loading effect):

```javascript
useEffect(() => {
  fetchCompanies().then(setCompanies).catch(() => setCompanies([]))
}, [])
```

When a company is chosen, load its list instead of the seed/job list:

```javascript
useEffect(() => {
  if (!company) return
  setSelected(null)
  fetchCompanyProblems(company).then(setProblems).catch(() => setProblems([]))
}, [company])
```

Render the picker above the problem list (follow the page's existing Tailwind classes for selects/badges — reuse `DIFFICULTY_COLOR`):

```jsx
<div className="flex items-center gap-2 mb-4">
  <select
    value={company}
    onChange={(e) => setCompany(e.target.value)}
    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
  >
    <option value="">Seed problems</option>
    {companies.map((c) => (
      <option key={c.company} value={c.company}>
        {c.company} — {c.count} problems{c.source_date ? ` · ${c.source_date.slice(0, 4)}` : ''}
      </option>
    ))}
  </select>
</div>
```

When a bank problem (has a `slug` but no `description`) is clicked, fetch its detail before loading the editor. In the existing problem-select handler, branch:

```javascript
async function openProblem(p) {
  if (p.slug && !p.description) {
    setLoadingDetail(true)
    try {
      const full = await fetchProblemDetail(p.slug)
      setSelected(full)
      setCode(full.starter_code?.[lang] ?? '')
    } catch {
      window.open(p.leetcode_url, '_blank')
    } finally {
      setLoadingDetail(false)
    }
  } else {
    setSelected(p)
    setCode(p.starter_code?.[lang] ?? '')
  }
}
```

Wire each list row's click to `openProblem(p)` (replacing the direct `setSelected`), and add an "Open on LeetCode" link when `p.leetcode_url` is present. Show a spinner when `loadingDetail`.

- [ ] **Step 3: Verify the build**

Run (from `frontend/`): `npx vite build`
Expected: build succeeds, no errors. (Frontend has no test runner per repo convention.)

- [ ] **Step 4: Manual click-through**

Start backend (`python -m uvicorn main:app --port 8000` from `placementos/`) and frontend (`npm run dev` from `frontend/`). At http://localhost:5173, open Code Practice:
- The company picker lists companies with counts.
- Selecting "Amazon" shows real problems, most-asked first, with difficulty badges.
- Clicking a non-seed problem loads a generated statement into the editor; "Open on LeetCode" works.
- Selecting "Seed problems" restores the original 12.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.js frontend/src/components/code/CodePage.jsx
git commit -m "feat: company picker in Code Practice"
```

---

## Self-Review

**Spec coverage:**
- Offline extraction script → Task 2. ✓
- `company_problems.json` shape (slug/id/title/difficulty/acceptance/url/companies+rank; companies with count+source_date; generated_at) → Tasks 1–2. ✓
- Load-at-startup / `boards.json` pattern, safe empty degradation → Task 3 (`load_bank` missing-file). ✓
- `GET /code/companies`, `company` filter, unchanged no-arg/job paths → Task 4 (with explicit regression test). ✓
- `GET /code/problem/{slug}` on-demand render, seed reuse, LLM-failure fallback to LeetCode, unknown-slug 404 → Task 4. ✓
- Frequency = rank ordering → Tasks 1 & 3 tests assert rank sort. ✓
- Frontend company picker with difficulty/acceptance badges + LeetCode link, seed fallback → Task 5. ✓
- Repo hygiene (gitignore the PDFs) → already done in the design commit; PDFs confirmed ignored. ✓
- Testing approach (pure parser unit tests, fixture-based loader/endpoint tests, regression guard, `npx vite build`) → Tasks 1,3,4,5. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. Manual UI wiring in Task 5 Step 2 references concrete handlers and state defined in the same step.

**Type consistency:** `parse_problem_rows`→`merge_records`→file→`load_bank`→`get_company_problems`/`find_problem`→`render_problem`→routes all agree on field names (`slug`, `companies:[{company,rank}]`, `leetcode_url`, `source_date`, `solvable`). Seed lookup keyed on `SEED_PROBLEMS[i]["id"]` (a slug string) — verified against `codeproblems.py` where ids are `"two-sum"` etc.
