"""
Generate summary text from combined sanitized file using active DB prompt.

Flow:
1) Fetch active prompt from Prompt table by doc_type
2) Load combined sanitized text (default: sanitized_full.txt)
3) Call Groq via generate_json_from_groq(prompt, input_text, model)
4) Save output as Summarized_text.txt in same root output directory
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Ensure project root is available for absolute imports.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.pipeline.utils.connect_db import db_connect


def _load_generate_json_from_groq():
    module_path = Path(__file__).parent / "groq_json_generator.py"
    spec = importlib.util.spec_from_file_location("groq_json_generator", module_path)
    if not spec or not spec.loader:
        raise ImportError(f"Unable to load module: {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fn = getattr(module, "generate_json_from_groq", None)
    if not fn:
        raise ImportError("generate_json_from_groq not found in groq_json_generator.py")
    return fn


generate_json_from_groq = _load_generate_json_from_groq()


DEFAULT_SUMMARY_MODEL = "gemini 3 flash"
DEFAULT_GROQ_FALLBACK_MODEL = "qwen/qwen3-32b"


def _slugify_model(model: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", str(model or "").strip()).strip("_")
    return cleaned.lower() or "unknown_model"


def _summary_filename_for_model(model: str) -> str:
    return f"Summarized_text_{_slugify_model(model)}.txt"


def _generate_summary_json_with_fallback(prompt: str, input_text: str, model: str) -> tuple[Dict[str, Any], str]:
    """
    Try requested model first. If it's Gemini and fails, fallback to Groq model.
    """
    try:
        return generate_json_from_groq(prompt, input_text, model=model), model
    except Exception as primary_error:
        if not str(model or "").lower().startswith("gemini"):
            raise
        fallback_model = DEFAULT_GROQ_FALLBACK_MODEL
        print(
            f"[WARN] Gemini summarization failed ({primary_error}). "
            f"Retrying with Groq model: {fallback_model}"
        )
        return generate_json_from_groq(prompt, input_text, model=fallback_model), fallback_model


def fetch_active_prompt(doc_type: str) -> str:
    """
    Fetch active and non-deleted prompt text for a document type.
    Chooses most recently updated prompt if multiple are active.
    """
    query = """
        SELECT p."prompt"
        FROM "Prompt" p
        WHERE p."doc_type" = %s
          AND p."active_flag" = TRUE
          AND p."deleted_flag" = FALSE
        ORDER BY p."updated_at" DESC
        LIMIT 1
    """
    with db_connect() as conn, conn.cursor() as cur:
        cur.execute(query, (doc_type,))
        row = cur.fetchone()
    if not row or "prompt" not in row or not row["prompt"]:
        raise ValueError(f"No active prompt found for doc_type='{doc_type}'")
    return str(row["prompt"])


def load_combined_sanitized_text(output_dir: Path, combined_filename: str = "sanitized_full.txt") -> str:
    combined_path = output_dir / combined_filename
    if not combined_path.exists():
        raise FileNotFoundError(f"Combined sanitized file not found: {combined_path}")
    return combined_path.read_text(encoding="utf-8")


def format_groq_result_as_text(result: Dict[str, Any]) -> str:
    """
    Convert Groq JSON output into persisted summary text.
    - Prefer explicit summary-like fields.
    - Otherwise flatten JSON into human-readable text lines.
    """
    summary_keys = (
        "summary",
        "summarized_text",
        "summary_text",
        "final_summary",
        "narrative",
        "output",
    )
    for key in summary_keys:
        value = result.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip() + "\n"

    def _to_lines(value: Any, prefix: str = "") -> list[str]:
        lines: list[str] = []
        if isinstance(value, str):
            text = value.strip()
            if text:
                lines.append(f"{prefix}{text}" if prefix else text)
            return lines
        if isinstance(value, (int, float, bool)) or value is None:
            label = f"{prefix}{value}".strip()
            if label:
                lines.append(label)
            return lines
        if isinstance(value, list):
            for item in value:
                if isinstance(item, (dict, list)):
                    lines.extend(_to_lines(item, prefix=prefix))
                else:
                    item_text = str(item).strip()
                    if item_text:
                        lines.append(f"{prefix}- {item_text}".rstrip())
            return lines
        if isinstance(value, dict):
            for k, v in value.items():
                key_title = str(k).replace("_", " ").strip().title()
                if isinstance(v, str) and v.strip():
                    lines.append(f"{prefix}{key_title}: {v.strip()}")
                elif isinstance(v, (int, float, bool)) or v is None:
                    lines.append(f"{prefix}{key_title}: {v}")
                else:
                    lines.append(f"{prefix}{key_title}:")
                    lines.extend(_to_lines(v, prefix=f"{prefix}  "))
            return lines
        return lines

    lines = _to_lines(result)
    if not lines:
        return ""
    return "\n".join(lines).strip() + "\n"


def save_summary_text(output_dir: Path, summary_text: str, output_filename: str) -> Path:
    output_path = output_dir / output_filename
    output_path.write_text(summary_text, encoding="utf-8")
    return output_path


def summarize_output_dir(
    output_dir: str | Path,
    doc_type: str,
    model: str = DEFAULT_SUMMARY_MODEL,
    combined_filename: str = "sanitized_full.txt",
    output_filename: str | None = None,
) -> Path:
    """
    End-to-end summarization for a PDF output directory.
    """
    out_dir = Path(output_dir)
    prompt = fetch_active_prompt(doc_type)
    combined_text = load_combined_sanitized_text(out_dir, combined_filename=combined_filename)
    result, used_model = _generate_summary_json_with_fallback(prompt, combined_text, model=model)
    summary_text = format_groq_result_as_text(result)
    final_output_filename = output_filename or _summary_filename_for_model(used_model)
    return save_summary_text(out_dir, summary_text, output_filename=final_output_filename)


def summarize_output_dir_with_text(
    output_dir: str | Path,
    doc_type: str,
    model: str = DEFAULT_SUMMARY_MODEL,
    combined_filename: str = "sanitized_full.txt",
    output_filename: str | None = None,
) -> tuple[Path, str]:
    """
    End-to-end summarization that returns both output file path and summary text.
    """
    out_dir = Path(output_dir)
    prompt = fetch_active_prompt(doc_type)
    combined_text = load_combined_sanitized_text(out_dir, combined_filename=combined_filename)
    result, used_model = _generate_summary_json_with_fallback(prompt, combined_text, model=model)
    summary_text = format_groq_result_as_text(result)
    final_output_filename = output_filename or _summary_filename_for_model(used_model)
    summary_path = save_summary_text(out_dir, summary_text, output_filename=final_output_filename)
    return summary_path, summary_text


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize combined sanitized text using active DB prompt.")
    parser.add_argument("output_dir", help="PDF output directory containing sanitized_full.txt")
    parser.add_argument("--doc-type", required=True, help="Prompt doc_type to fetch from Prompt table")
    parser.add_argument("--model", default=DEFAULT_SUMMARY_MODEL, help="Model name (Gemini for summary by default)")
    parser.add_argument("--combined-file", default="sanitized_full.txt", help="Combined sanitized input filename")
    parser.add_argument("--output-file", default=None, help="Summary output filename (default: model-specific)")
    args = parser.parse_args()

    summary_path = summarize_output_dir(
        output_dir=args.output_dir,
        doc_type=args.doc_type,
        model=args.model,
        combined_filename=args.combined_file,
        output_filename=args.output_file,
    )
    print(str(summary_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
