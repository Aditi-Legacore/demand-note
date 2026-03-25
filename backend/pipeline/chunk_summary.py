"""
Three-phase chunk summarization scaffolding.

This module adds the page-count gate and helper hooks for the 3‑phase
extraction → consolidation → narrative flow. It intentionally reuses the
Logger defined in pii-handler/pdf_extract_chunks.py to keep logging
consistent with the existing pipeline.

Current implementation provides structure and provenance-preserving merge
logic; the model-calling phases are left as TODOs for later wiring.
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Ensure pii-handler is importable so we can reuse Logger
MODULE_DIR = Path(__file__).parent
PROMPTS_DIR = MODULE_DIR / "prompts"
PII_HANDLER_DIR = MODULE_DIR / "pii-handler"
if str(PII_HANDLER_DIR) not in sys.path:
    sys.path.insert(0, str(PII_HANDLER_DIR))


def _load_pdf_extract_chunks():
    """Load pdf_extract_chunks.py to access Logger without altering callers."""
    module_path = PII_HANDLER_DIR / "pdf_extract_chunks.py"
    spec = importlib.util.spec_from_file_location("pdf_extract_chunks", module_path)
    if not spec or not spec.loader:
        raise ImportError(f"Could not load pdf_extract_chunks from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_pdf_extract_chunks = _load_pdf_extract_chunks()
Logger = _pdf_extract_chunks.Logger  # type: ignore

# Gateway summarize module for LLM calls and prompt fetch
def _load_gateway():
    module_path = PII_HANDLER_DIR / "gateway_summarize.py"
    spec = importlib.util.spec_from_file_location("gateway_summarize", module_path)
    if not spec or not spec.loader:
        raise ImportError(f"Could not load gateway_summarize from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_gateway = _load_gateway()
_call_gateway = _gateway._call_gateway  # type: ignore
fetch_active_prompt = _gateway.fetch_active_prompt  # type: ignore
fetch_active_prompt_record = _gateway.fetch_active_prompt_record  # type: ignore
DEFAULT_GATEWAY_MODEL = _gateway.DEFAULT_GATEWAY_MODEL  # type: ignore


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def should_use_three_phase(page_count: int, threshold: int = 15) -> bool:
    """Return True when the document is large enough to trigger the new flow."""
    return page_count > threshold


def _load_prompt(prompt_filename: str) -> str:
    """
    Load prompt text from backend/pipeline/prompts.
    """
    prompt_path = PROMPTS_DIR / prompt_filename
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8").strip()


def merge_chunks_two_by_two(chunks_info: List[Dict], logger: Optional[Logger] = None) -> List[Dict]:
    """
    Merge sanitized chunks in pairs while keeping provenance.

    Inputs are expected to contain at least: chunk_id, text, page_start, page_end.
    Output chunks add: orig_chunk_ids (list), merged text, page_start/end from span.
    """
    log = logger.log if logger else lambda m, level="INFO": None
    merged: List[Dict] = []

    for i in range(0, len(chunks_info), 2):
        pair = chunks_info[i : i + 2]
        if not pair:
            continue

        if len(pair) == 1:
            entry = pair[0]
            merged.append(
                {
                    "chunk_id": f"m{entry.get('chunk_id')}",
                    "orig_chunk_ids": [entry.get("chunk_id")],
                    "text": entry.get("text", ""),
                    "page_start": entry.get("page_start"),
                    "page_end": entry.get("page_end"),
                }
            )
            continue

        a, b = pair
        merged_text = f"{a.get('text','')}\n\n{b.get('text','')}"
        merged.append(
            {
                "chunk_id": f"m{a.get('chunk_id')}_{b.get('chunk_id')}",
                "orig_chunk_ids": [a.get("chunk_id"), b.get("chunk_id")],
                "text": merged_text,
                "page_start": a.get("page_start"),
                "page_end": b.get("page_end"),
            }
        )

    log(f"[+] Three-phase: merged {len(chunks_info)} chunks into {len(merged)}", "INFO")
    return merged


def phase1_extract(merged_chunks: List[Dict], output_dir: Path, logger: Optional[Logger] = None) -> Path:
    """
    Phase‑1: run extraction prompt per merged chunk, save JSONL.
    """
    log = logger.log if logger else lambda m, level="INFO": None
    phase_dir = output_dir / "three_phase"
    phase_dir.mkdir(parents=True, exist_ok=True)
    phase1_path = phase_dir / "phase1.jsonl"

    prompt = _load_prompt("phase1_extraction.txt")
    model = os.getenv("CATGPT_GATEWAY_MODEL", DEFAULT_GATEWAY_MODEL)

    lines = []
    for chunk in merged_chunks:
        chunk_text = chunk.get("text", "")
        chunk_id = chunk.get("chunk_id")
        content = _call_gateway(prompt=prompt, input_text=chunk_text, model=model, use_file_payload=False)
        lines.append(
            {
                "chunk_id": chunk_id,
                "orig_chunk_ids": chunk.get("orig_chunk_ids", []),
                "page_start": chunk.get("page_start"),
                "page_end": chunk.get("page_end"),
                "extraction": content,
            }
        )
        log(f"[+] Phase‑1 extracted chunk {chunk_id}", "INFO")

    phase1_path.write_text("\n".join(json.dumps(line, ensure_ascii=False) for line in lines), encoding="utf-8")
    log(f"[+] Phase‑1 JSONL written: {phase1_path}", "INFO")
    return phase1_path


def phase2_consolidate(phase1_jsonl: Path, output_dir: Path, logger: Optional[Logger] = None) -> Path:
    """
    Phase‑2: consolidate extracted facts via gateway prompt.
    """
    log = logger.log if logger else lambda m, level="INFO": None
    phase_dir = output_dir / "three_phase"
    phase_dir.mkdir(parents=True, exist_ok=True)
    phase2_path = phase_dir / "phase2.json"

    prompt = _load_prompt("phase2_consolidation.txt")
    model = os.getenv("CATGPT_GATEWAY_MODEL", DEFAULT_GATEWAY_MODEL)

    phase1_text = phase1_jsonl.read_text(encoding="utf-8")
    consolidated = _call_gateway(prompt=prompt, input_text=phase1_text, model=model, use_file_payload=False)

    payload = {"input_file": str(phase1_jsonl), "consolidated": consolidated}
    phase2_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"[+] Phase‑2 consolidated facts written: {phase2_path}", "INFO")
    return phase2_path


def phase3_summarize(
    consolidated_json: Path,
    output_dir: Path,
    doc_type: str = "medical",
    logger: Optional[Logger] = None,
) -> Tuple[Path, str, Optional[str]]:
    """
    Phase‑3: wrap consolidated facts with wrapper + active DB prompt, produce narrative.
    """
    log = logger.log if logger else lambda m, level="INFO": None
    phase_dir = output_dir / "three_phase"
    phase_dir.mkdir(parents=True, exist_ok=True)
    summary_path = phase_dir / "summary.txt"

    wrapper_prompt = _load_prompt("phase3_wrapper.txt")
    try:
        prompt_record = fetch_active_prompt_record(doc_type)
        main_prompt = prompt_record["prompt"]
        prompt_id = prompt_record.get("id")
    except Exception as e:
        raise RuntimeError(f"Unable to fetch active prompt for doc_type={doc_type}: {e}")

    final_prompt = f"{wrapper_prompt}\n\n{main_prompt}"
    model = os.getenv("CATGPT_GATEWAY_MODEL", DEFAULT_GATEWAY_MODEL)

    consolidated_payload = json.loads(consolidated_json.read_text(encoding="utf-8"))
    consolidated_text = consolidated_payload.get("consolidated", "")

    summary_text = _call_gateway(prompt=final_prompt, input_text=consolidated_text, model=model, use_file_payload=False)
    summary_path.write_text(summary_text.strip() + "\n", encoding="utf-8")
    log(f"[+] Phase‑3 summary written: {summary_path}", "INFO")
    return summary_path, summary_text, prompt_id


def run_three_phase(
    output_dir: Path,
    page_count: int,
    log_level: str = "INFO",
    doc_type: Optional[str] = None,
    chunks_info: Optional[List[Dict]] = None,
) -> Tuple[Path, str, Optional[str]]:
    """
    Convenience wrapper: merges sanitized chunks and runs the three phases.
    """
    logger = Logger(log_level)
    log = logger.log
    doc_type = doc_type or os.getenv("SUMMARY_DOC_TYPE", "medical")

    if chunks_info is None:
        chunks_info_path = Path(output_dir) / "chunks" / "chunks_info.json"
        if not chunks_info_path.exists():
            raise FileNotFoundError(f"chunks_info.json not found at {chunks_info_path}")
        chunks_info = json.loads(chunks_info_path.read_text(encoding="utf-8"))
    merged = merge_chunks_two_by_two(chunks_info, logger=logger)
    phase1 = phase1_extract(merged, Path(output_dir), logger=logger)
    phase2 = phase2_consolidate(phase1, Path(output_dir), logger=logger)
    summary_file, summary_text, prompt_id = phase3_summarize(
        phase2,
        Path(output_dir),
        doc_type=doc_type,
        logger=logger,
    )

    log(f"[+] Three-phase summary complete (pages={page_count})", "INFO")
    return summary_file, summary_text, prompt_id
