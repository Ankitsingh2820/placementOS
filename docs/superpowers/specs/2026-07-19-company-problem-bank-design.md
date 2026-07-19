# Company Problem Bank — Design

**Date:** 2026-07-19
**Status:** Approved design, pending implementation plan

## Problem

The Code Practice tool serves either 12 hardcoded seed problems
(`services/codeproblems.py:SEED_PROBLEMS`) or, when a job is supplied, asks
Groq to **invent** 6 problems for that role (`get_problems` →
`GENERATE_PROMPT`). Invented problems are the weakest part of the product: they
are not real interview questions, carry hallucination risk, and give the user
no company-specific signal.

Separately, the user has collected ~200 PDFs under
`docs/data for training/`. Among them are **company-tagged LeetCode exports**
("Amazon Tagged LeetCode Problems", "Google - LeetCode", "Facebook - LeetCode",
etc.) — each a real, frequency-ordered list of the problems a given company
actually asks. This is genuine interview signal that the app currently ignores.

## Goal

Turn the company-tagged PDFs into a **structured, committed problem bank** that
powers Code Practice. A user picks a company → sees the real, most-asked-first
problems for that company → solves them in-app (statement rendered on demand)
or opens the canonical problem on LeetCode. The existing LLM evaluation and
hint flow are reused unchanged.

## Non-goals (YAGNI)

- **No database, no vector store, no user accounts.** The bank is a static JSON
  file loaded at startup, exactly like `data/boards.json`. All user state stays
  in `localStorage`.
- **No RAG over the concept/notes PDFs** (Algorithms, DP, Bit Manipulation,
  etc.). Those are generic study material any LLM already knows; indexing them
  is high effort for low marginal value. Explicitly deferred.
- **No re-hosting the PDFs** in the app or repo. We extract facts (which
  problems a company asks) — not the copyrighted PDF files themselves.
- **No hand-authoring hundreds of full problem statements.** Full statements
  for bank problems are rendered on demand by the existing LLM path; the 12
  seed problems keep their curated statements.
- **No live scraping of LeetCode.** The bank is built once, offline, from the
  PDFs already downloaded.

## Key insight: the PDFs are structured exports

The tagged PDFs are LeetCode company-page prints. Every problem row extracts
cleanly with pypdf (already a dependency), e.g. from Amazon:

```
200 Number of Islands (/problems/number-of-islands) 54.1% Medium
146 LRU Cache (/problems/lru-cache) 40.0% Medium
```

Each row yields: **number, title, slug, acceptance %, difficulty.** Rows appear
in the page's frequency order (most-asked first), so **row position = frequency
rank** even though a numeric frequency value is not always present in the text.
The "DSA sheet" style PDFs (e.g. `Amazon DSA sheet .pdf`) are bare numbered
lists of `/problems/<slug>` URLs — even simpler to parse.

## Architecture

Three isolated units, each independently testable:

### 1. Offline extraction script — `scripts/build_problem_bank.py`

- **What it does:** reads the company-tagged PDFs, parses problem rows, merges
  them into one canonical bank, writes `placementos/data/company_problems.json`.
- **How it's used:** run manually by a developer (`python scripts/build_problem_bank.py`)
  whenever the source PDFs change. It is **not** imported by the server.
- **Depends on:** `pypdf`, the PDFs under `docs/data for training/`.

Parsing rules:
- A row regex captures `(number) (title) (/problems/<slug>) (acceptance%)? (Easy|Medium|Hard)`.
- Slug is the canonical key. `title` is cleaned (collapse whitespace, strip
  trailing artifacts). `difficulty` normalized to `Easy|Medium|Hard`.
- Rows that don't match (headers, footers, "5/18/22, 5:13 PM Amazon - LeetCode"
  banners, URLs) are skipped. The script reports per-file matched/skipped counts
  so extraction quality is visible.
- **Company mapping:** an explicit filename → company map in the script (e.g.
  `"Amazon Tagged LeetCode Problems .pdf" → "Amazon"`). Non-company PDFs
  (Algorithms, notes, generic sheets) are not in the map and are ignored. This
  keeps the script deterministic and auditable rather than guessing companies
  from filenames.
- **Merge/dedupe:** one record per slug across all PDFs. `companies` is a list
  of `{company, rank}` where `rank` is the 1-based row position within that
  company's PDF. If the same company appears in multiple source PDFs, keep the
  best (lowest) rank.

Output record shape (`company_problems.json`):

```json
{
  "generated_at": "2026-07-19",
  "problems": [
    {
      "slug": "number-of-islands",
      "id": 200,
      "title": "Number of Islands",
      "difficulty": "Medium",
      "acceptance": 54.1,
      "leetcode_url": "https://leetcode.com/problems/number-of-islands/",
      "companies": [
        {"company": "Amazon", "rank": 3},
        {"company": "Google", "rank": 12}
      ]
    }
  ],
  "companies": [
    {"company": "Amazon", "count": 240, "source_date": "2022-05-18"}
  ]
}
```

`source_date` is parsed from the export banner in the PDF when present, else
null. It is surfaced in the UI so users know the list's vintage.

### 2. Backend — `services/codeproblems.py` + `routers/code.py`

- **Load once at startup:** read `data/company_problems.json` into memory (same
  pattern as `boards.json`). If the file is missing, the bank is treated as
  empty and all existing behavior is unchanged (safe degradation).
- **New:** `GET /code/companies` → `[{company, count, source_date}]`, sorted by
  count desc. Populates the company picker.
- **New:** `GET /code/problems?company=Amazon` → that company's problems sorted
  by ascending rank (most-asked first). Each item carries
  `slug, id, title, difficulty, acceptance, leetcode_url` and a `solvable` flag
  (true when a full seed statement exists, otherwise statement is generated on
  demand).
- **Unchanged:** `GET /code/problems` with no company and no job → `SEED_PROBLEMS`.
  With a job → existing LLM generation. `POST /code/evaluate` and
  `POST /code/hint` are untouched.
- **On-demand statement:** add `GET /code/problem/{slug}` that returns the full
  problem (description, examples, constraints, starter_code). If the slug is one
  of the 12 seeds, return the curated version. Otherwise call Groq with a
  render-a-known-problem prompt (distinct from the invent-problems prompt) and
  return the result. On LLM failure, return a minimal record pointing the user
  to `leetcode_url` (never a hard error).

### 3. Frontend — Code Practice page

- Add a **company picker** above the problem list ("Practice a company's
  most-asked", with count + source date, e.g. "Amazon — 240 problems · 2022").
- Selecting a company lists its problems with **difficulty** and **acceptance**
  badges, in frequency order. Each row has **Solve** (loads the problem into the
  existing editor via `/code/problem/{slug}`) and **Open on LeetCode**.
- With no company selected, the page behaves exactly as today.
- Follow existing component patterns (reuse the current problem-list/editor
  layout; add the picker as a sibling control).

## Data flow

```
build_problem_bank.py  (offline, dev-run)
  reads  docs/data for training/*.pdf
  writes placementos/data/company_problems.json   ← committed

server startup
  loads company_problems.json into memory

user picks company  → GET /code/companies, GET /code/problems?company=X
user clicks Solve   → GET /code/problem/{slug}  → editor
user submits        → POST /code/evaluate  (unchanged)
user asks for hint  → POST /code/hint      (unchanged)
```

## Error handling

- **Missing bank file:** endpoints return empty company list / fall back to seed
  behavior. No crash.
- **Unparseable PDF rows:** skipped and counted; the script never aborts a whole
  file for one bad row.
- **LLM render failure** for a non-seed problem: return a minimal record with
  the LeetCode link; the UI shows "Open on LeetCode" rather than an error.
- **Unknown slug** on `/code/problem/{slug}`: 404 with a message.

## Testing

- **Extraction (unit, pytest):** feed the parser a few representative text
  blocks (Amazon tagged row, Facebook wrapped row, DSA-sheet URL line, a header
  line) and assert the parsed records and that noise lines are skipped. Parser
  logic lives in a pure function so it is testable without real PDFs.
- **Bank loading (unit):** point the loader at a small fixture
  `company_problems.json`; assert `/code/companies` and
  `/code/problems?company=X` shape and ordering. Assert graceful empty behavior
  when the file is absent.
- **Endpoint (existing style):** extend the current code-router tests. Assert the
  no-arg and job paths are unchanged (regression guard).
- Frontend has no test runner (per repo convention); verify with `npx vite build`
  and a manual click-through.

## Repo hygiene

The 685 MB of source PDFs under `docs/data for training/` must **not** be
committed. Add `docs/data for training/` to `.gitignore`. Only the derived
`company_problems.json` (small, <1 MB) is committed.

## Companies in scope (first build)

From the tagged/company PDFs present: Adobe, Amazon, Apple, Directi, Expedia,
Facebook, Goldman Sachs, Google, JP Morgan, LinkedIn, Microsoft, Oracle,
Twitter, Uber, Visa, VMware, Walmart. The filename→company map is the single
source of truth and is easy to extend.

## Risks / honesty

- **Vintage:** exports are ~2019–2022. Strong signal, not live. Surfaced via
  `source_date` in the UI.
- **Frequency granularity:** we keep row **rank**, not a raw frequency number
  (not reliably in the text). Sufficient for "most-asked first".
- **On-demand statements** of a *named, canonical* problem are reliable (unlike
  inventing new problems), but `leetcode_url` remains the source of truth and is
  always shown.
- **Extraction coverage** varies by PDF layout; the script's per-file
  matched/skipped report makes gaps visible so low-yield files can be handled or
  dropped.
