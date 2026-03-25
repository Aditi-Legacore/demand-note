"""
Shared page-map builder utilities.

This module stores:
1) chunk-level page maps (chunk_XXXX_page_map.json), and
2) a finalized global page_map.json for the whole PDF output.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple


def _normalize_bool_str(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip().lower()


def _extract_page_date(page: Dict) -> str:
    def _normalize_date_candidate(value: object) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, dict):
            for key in ("date", "value", "date_of_service", "date_of_incident", "bill_date"):
                nested = value.get(key)
                if isinstance(nested, str) and nested.strip():
                    return nested.strip()
            return ""
        return str(value).strip()

    for key in ("date_of_service", "date_of_incident", "bill_date"):
        normalized = _normalize_date_candidate(page.get(key))
        if normalized:
            return normalized
    return "unknown"


def _extract_provider_signature(page: Dict) -> str:
    def _norm_text(value: object) -> str:
        text = str(value or "").strip().lower()
        text = re.sub(r"\s+", " ", text)
        return text

    provider = page.get("provider")
    if provider is None:
        return ""
    if isinstance(provider, dict):
        # Prioritize explicit provider/name, fall back to best available text field.
        for key in ("provider", "name", "facility", "organization"):
            if key in provider and str(provider.get(key) or "").strip():
                return _norm_text(provider.get(key))
        for key in ("address", "city", "phone", "email"):
            if key in provider and str(provider.get(key) or "").strip():
                return _norm_text(provider.get(key))
        return ""
    return _norm_text(provider)


def _safe_category_name(page: Dict) -> str:
    category = page.get("category")
    if isinstance(category, dict):
        return str(category.get("matching_category", "")).strip()
    return str(category or "").strip()


def _can_continue(continued: bool) -> bool:
    # User-specified simplified rule:
    # if previous page continuation is true, keep same global document.
    return bool(continued)


def _doc_id_base(page: Dict) -> str:
    date_value = _extract_page_date(page)
    category = _safe_category_name(page) or "others"
    cat_slug = "".join(ch if ch.isalnum() else "_" for ch in category).strip("_") or "others"
    return f"{date_value}-{cat_slug[:10]}"


def _page_sort_key(page: Dict, fallback_index: int) -> Tuple[int, int]:
    raw = str(page.get("page_no", "")).strip()
    if raw.isdigit():
        return (0, int(raw))
    return (1, fallback_index)


def _finalize_global_page_map(output_dir: Path, logger=None) -> None:
    chunks_dir = output_dir / "chunks"
    if not chunks_dir.exists():
        return

    chunk_files = sorted(chunks_dir.glob("chunk_*_page_map.json"))
    if not chunk_files:
        return

    all_pages: List[Dict] = []
    for chunk_file in chunk_files:
        try:
            with open(chunk_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            pages = payload.get("pages", []) if isinstance(payload, dict) else []
            if isinstance(pages, list):
                for page in pages:
                    if isinstance(page, dict):
                        all_pages.append(dict(page))
        except Exception:
            continue

    if not all_pages:
        return

    indexed_pages = list(enumerate(all_pages))
    indexed_pages.sort(key=lambda item: _page_sort_key(item[1], item[0]))
    sorted_pages = [item[1] for item in indexed_pages]

    documents: List[Dict] = []
    finalized_pages: List[Dict] = []
    doc_instance_counter: Dict[str, int] = {}
    active_doc_id = None
    prev_key = None

    for page in sorted_pages:
        category = _safe_category_name(page)
        provider_sig = _extract_provider_signature(page)
        date_value = _extract_page_date(page)
        current_key = (category, provider_sig, date_value)
        continuation = page.get("continuation", {})
        continued = False
        if isinstance(continuation, dict):
            continued = _normalize_bool_str(continuation.get("prev_page_continued", "false")) == "true"

        if active_doc_id and _can_continue(continued):
            doc_id = active_doc_id
        else:
            base = _doc_id_base(page)
            idx = doc_instance_counter.get(base, 0)
            doc_instance_counter[base] = idx + 1
            doc_id = base if idx == 0 else f"{base}-{idx}"
            documents.append({"doc_id": doc_id, "pages": []})

        page_no = str(page.get("page_no", "")).strip() or str(len(finalized_pages) + 1)
        page["page_no"] = page_no
        page["doc_id"] = doc_id
        finalized_pages.append(page)

        documents[-1]["pages"].append(page_no)
        active_doc_id = doc_id
        prev_key = current_key

    page_map_file = output_dir / "page_map.json"
    with open(page_map_file, "w", encoding="utf-8") as f:
        json.dump({"documents": documents, "pages": finalized_pages}, f, indent=2)

    if logger:
        logger.log(f"[Groq Debug] Finalized global page map: {page_map_file.name}", "INFO")


def append_page_map(output_dir: Path, chunk_id: int, groq_raw: Dict, logger=None) -> None:
    """
    Write chunk-level page map and refresh global page_map.json.
    """
    if not output_dir or not isinstance(groq_raw, dict):
        return

    chunks_dir = output_dir / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    page_map_file = chunks_dir / f"chunk_{chunk_id:04d}_page_map.json"
    chunk_key = f"chunk_{chunk_id:04d}"
    payload = {
        "chunk_id": chunk_id,
        "documents": groq_raw.get("documents", []),
        "pages": groq_raw.get("pages", []),
    }
    with open(page_map_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    if logger:
        logger.log(f"[Groq Debug] Wrote {page_map_file.name} for {chunk_key}", "INFO")

    _finalize_global_page_map(output_dir, logger=logger)
