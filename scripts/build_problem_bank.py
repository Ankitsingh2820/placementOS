# scripts/build_problem_bank.py
"""Offline: extract a company problem bank from the tagged LeetCode PDFs.

Run from the repo root:  python scripts/build_problem_bank.py
Not imported by the server. Requires pypdf and the PDFs under
'docs/data for training/'.

Two source layouts are handled and auto-routed per file (nothing is
hardcoded to a company):

  * TEXT layout - LeetCode web-page printouts whose problem links appear as
    extractable text `(/problems/<slug>)`. Parsed by `parse_problem_rows`.

  * SDE-SHEET layout - each visible row is `<id> <title> <acc>% <difficulty>`
    and the LeetCode URL is NOT in the extractable text. When the PDF carries
    real link annotations we read the ordered slugs from those annotations and
    pair them positionally with the visible rows. When there are no
    annotations (the repo's Google/Microsoft/Goldman/JP Morgan/LinkedIn/Uber/
    VMware sheets are flattened printouts with zero embedded links) we derive
    each slug deterministically from its title - LeetCode slugs are generated
    from the title (lowercase, drop apostrophes, non-alphanumeric runs -> '-').
"""
import os
import re
import sys
import json
from datetime import date

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "placementos"))

from services.problem_bank import (  # noqa: E402
    parse_problem_rows,
    merge_records,
    title_from_slug,
)
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

# Ordered LeetCode slug from a PDF link-annotation URI.
_ANNOT_URL_RE = re.compile(
    r"https?://leetcode\.com/problems/(?P<slug>[a-z0-9\-]+)/?", re.IGNORECASE
)

# Visible SDE-sheet row: `<id> <title> <acc>% <difficulty>`. The title is
# tempered + length-bounded exactly like `parse_problem_rows`: it cannot cross
# into the next row's acceptance/difficulty tokens and is capped at 70 chars
# (longest real LeetCode title is 59), so it can never swallow the
# "# Title Acceptance Difficulty" header preamble. `require_acc` controls
# whether the acceptance percentage is mandatory; requiring it rejects prose
# false positives in free-text writeups (e.g. Directi).
_VISIBLE_ROW_TMPL = (
    r"(?P<id>\d+)\s+"
    r"(?P<title>(?:(?!\d+(?:\.\d+)?%|\bEasy\b|\bMedium\b|\bHard\b).){1,70}?)\s*"
    r"__ACC__"
    r"(?P<diff>Easy|Medium|Hard)"
)
_VISIBLE_ROW_RE_ACC = re.compile(
    _VISIBLE_ROW_TMPL.replace("__ACC__", r"(?P<acc>\d+(?:\.\d+)?)%\s*")
)
_VISIBLE_ROW_RE_OPT = re.compile(
    _VISIBLE_ROW_TMPL.replace("__ACC__", r"(?:(?P<acc>\d+(?:\.\d+)?)%\s*)?")
)


def _find_pdf(basename: str) -> str | None:
    for dirpath, _dirs, files in os.walk(PDF_ROOT):
        if basename in files:
            return os.path.join(dirpath, basename)
    return None


def _extract_text(reader: pypdf.PdfReader) -> str:
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _extract_annot_slugs(reader: pypdf.PdfReader) -> list[str]:
    """Ordered LeetCode slugs from PDF link annotations, in document order.

    Reads each page's `/Annots`, resolves every annotation, follows `/A` ->
    `/URI`, and keeps slugs whose URI is a leetcode.com/problems link, in the
    order encountered across pages.
    """
    slugs: list[str] = []
    for page in reader.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        try:
            iterable = list(annots)
        except TypeError:
            continue
        for ref in iterable:
            try:
                obj = ref.get_object()
            except Exception:
                continue
            action = obj.get("/A")
            if not action:
                continue
            uri = action.get("/URI")
            if not uri:
                continue
            m = _ANNOT_URL_RE.search(str(uri))
            if m:
                slugs.append(m.group("slug").lower())
    return slugs


def _slugify(title: str) -> str:
    """LeetCode-style slug from a problem title.

    LeetCode generates slugs from the title: lowercase, drop apostrophes, then
    collapse every run of non-alphanumeric characters to a single hyphen.
    """
    t = title.lower().replace("'", "").replace("’", "")
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return t.strip("-")


def _parse_visible_rows(text: str, require_acc: bool) -> list[dict]:
    """Ordered visible rows `{id, title, acc, difficulty}` (no slug)."""
    text = re.sub(r"\s+", " ", text)
    regex = _VISIBLE_ROW_RE_ACC if require_acc else _VISIBLE_ROW_RE_OPT
    rows: list[dict] = []
    for m in regex.finditer(text):
        acc = m.group("acc")
        rows.append({
            "id": int(m.group("id")),
            "title": re.sub(r"\s+", " ", m.group("title")).strip(),
            "acc": float(acc) if acc else None,
            "difficulty": m.group("diff"),
        })
    return rows


def _annotation_records(full_text: str, annot_slugs: list[str], company: str) -> list[dict]:
    """SDE-sheet PDF that carries link annotations: pair visible rows with the
    ordered annotation slugs positionally, falling back to slug-only records
    when the counts disagree (positional pairing would be unreliable)."""
    visible_rows = _parse_visible_rows(full_text, require_acc=False)
    if visible_rows and len(visible_rows) == len(annot_slugs):
        records = []
        seen: set[str] = set()
        for row, slug in zip(visible_rows, annot_slugs):
            if slug in seen:
                continue
            seen.add(slug)
            records.append({
                "id": row["id"],
                "title": row["title"],
                "slug": slug,
                "difficulty": row["difficulty"],
                "acceptance": row["acc"],
            })
        return records

    print(f"  WARN {company}: {len(annot_slugs)} slugs vs "
          f"{len(visible_rows)} visible rows -> slug-only fallback")
    records = []
    seen = set()
    for slug in annot_slugs:
        if slug in seen:
            continue
        seen.add(slug)
        records.append({
            "id": None,
            "title": title_from_slug(slug),
            "slug": slug,
            "difficulty": None,
            "acceptance": None,
        })
    return records


def _derived_records(full_text: str) -> list[dict]:
    """SDE-sheet PDF with no embedded links: derive each slug from its title."""
    records: list[dict] = []
    seen: set[str] = set()
    for row in _parse_visible_rows(full_text, require_acc=True):
        slug = _slugify(row["title"])
        if not slug or slug in seen:
            continue
        seen.add(slug)
        records.append({
            "id": row["id"],
            "title": row["title"],
            "slug": slug,
            "difficulty": row["difficulty"],
            "acceptance": row["acc"],
        })
    return records


def _source_date(text: str) -> str | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    mm, dd, yy = m.groups()
    yy = int(yy)
    if yy < 100:
        yy += 2000
    return f"{yy:04d}-{int(mm):02d}-{int(dd):02d}"


def _records_for(reader: pypdf.PdfReader, full_text: str, company: str) -> tuple[list[dict], str]:
    """Auto-route a file to the right extraction path. Returns (records, mode)."""
    text_rows = parse_problem_rows(full_text)
    annot_slugs = _extract_annot_slugs(reader)

    # A non-empty `text_rows` means the LeetCode links are in the extractable
    # text - the text-layout printouts. These records carry id + title +
    # difficulty + acceptance, so they are always richer than any annotation
    # fallback and are used unchanged. (Several of these printouts ALSO embed
    # link annotations that outnumber the parsed rows; that must NOT flip them
    # to the lossy annotation path - the SDE sheets are the only files with
    # zero text rows, so `text_rows` non-empty is a clean layout signal.)
    if text_rows:
        return text_rows, "text"
    if annot_slugs:
        return _annotation_records(full_text, annot_slugs, company), "annotation"
    return _derived_records(full_text), "derived"


def main() -> int:
    per_company: dict[str, list[dict]] = {}
    source_dates: dict[str, str | None] = {}

    for basename, company in FILENAME_COMPANY_MAP.items():
        path = _find_pdf(basename)
        if not path:
            print(f"  MISSING  {company:14s} {basename}")
            continue
        reader = pypdf.PdfReader(path)
        text = _extract_text(reader)
        records, mode = _records_for(reader, text, company)
        per_company[company] = records
        source_dates[company] = _source_date(text)
        print(f"  ok       {company:14s} {len(records):4d} problems  "
              f"[{mode:10s}] ({basename})")

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
