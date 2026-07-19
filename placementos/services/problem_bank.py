import re

_ROW_RE = re.compile(
    r"(?P<id>\d+)\s+"
    # Tempered + length-bounded title: cannot cross into the next problem's
    # link and cannot swallow a page header. Longest real LeetCode title is
    # 59 chars ("Count Unique Characters of All Substrings of a Given
    # String"), so a 70-char cap keeps every real title yet rejects the
    # multi-word header preambles (e.g. "... Show problem tags # Title
    # Acceptance Difficulty Frequency 1 Two Sum" = 77 chars).
    r"(?P<title>(?:(?!\(/problems/).){1,70}?)\s*"
    r"\(/problems/(?P<slug>[a-z0-9\-\s]+?)\)"
    r"\s*(?:(?P<acc>\d+(?:\.\d+)?)%\s*)?"
    # Required trailing difficulty tightly bounds each row.
    r"(?P<diff>Easy|Medium|Hard)"
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

    # Collapse all whitespace (incl. newlines) to single spaces so wrapped rows
    # become contiguous. Removes the need for re.DOTALL in _ROW_RE.
    text = re.sub(r"\s+", " ", text)

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
