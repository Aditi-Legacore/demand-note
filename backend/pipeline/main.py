"""
PDF Processing Pipeline - Main Entry Point

This is the main orchestrator that:
1. Receives a Job ID from command line
2. Creates tasks for each demand file in the job
3. Processes each demand file through the complete pipeline
4. Manages database operations (job and task status updates)

Usage:
    python main.py <job_id>

Example:
    python main.py 12345-67890-abcde-fghij

Architecture:
- Each module is highly modular and can be tested independently
- pipeline.py: Orchestrates the complete PDF processing workflow
- tasks_repository.py: Handles all database operations
- extraction.py: Extracts PDF text
- groq_json_generator.py: Detects PII using Groq API
- replace_pii2.py: Replaces PII with dummy values
"""

import sys
import os
import traceback
import time
import importlib.util
import json
from pathlib import Path

# Ensure project root is on sys.path for absolute imports
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ============================================================
# DATABASE OPERATIONS
# ============================================================
from backend.pipeline.utils.tasks_repository import (
    get_job_by_id,
    get_demand_files_for_job,
    get_summarized_demand_files_for_job,
    mark_job_in_progress,
    mark_job_failed,
    mark_demand_file_summarized,
    check_and_update_job_status,
    create_tasks_for_job,
    get_task_by_demand_file_id,
    mark_task_in_progress,
    mark_task_completed,
    mark_task_failed,
)

# ============================================================
# PIPELINE ORCHESTRATOR
# ============================================================
from backend.pipeline.pipeline import run_pipeline
from backend.pipeline.chunk_summary import (
    should_use_three_phase,
    run_three_phase,
)


# ============================================================
# OPTIONAL POST-PROCESSING: COMBINE SANITIZED CHUNKS
# ============================================================
def _load_combine_chunks():
    """Load combine_chunks.py by file path (pii-handler is hyphenated)."""
    module_path = Path(__file__).parent / "pii-handler" / "combine_chunks.py"
    if not module_path.exists():
        return None
    spec = importlib.util.spec_from_file_location("combine_chunks", module_path)
    if not spec or not spec.loader:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, "combine_sanitized_chunks", None)


combine_sanitized_chunks = _load_combine_chunks()


def _load_summerize():
    """Load summerize.py by file path (pii-handler is hyphenated)."""
    module_path = Path(__file__).parent / "pii-handler" / "summerize.py"
    if not module_path.exists():
        return None, None
    spec = importlib.util.spec_from_file_location("summerize", module_path)
    if not spec or not spec.loader:
        return None, None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return (
        getattr(module, "summarize_output_dir_with_text", None),
        getattr(module, "summarize_output_dir", None),
    )


summarize_output_dir_with_text, summarize_output_dir = _load_summerize()


def _load_gateway_summarize():
    """Load gateway_summarize.py by file path (pii-handler is hyphenated)."""
    module_path = Path(__file__).parent / "pii-handler" / "gateway_summarize.py"
    if not module_path.exists():
        return None
    spec = importlib.util.spec_from_file_location("gateway_summarize", module_path)
    if not spec or not spec.loader:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return (
        getattr(module, "summarize_output_dir_with_text", None),
        getattr(module, "fetch_active_prompt_record", None),
    )


gateway_summarize_output_dir_with_text, fetch_active_prompt_record = _load_gateway_summarize()


def _load_reverse_restore():
    """Load reverse_replace_pii.py by file path (pii-handler is hyphenated)."""
    module_path = Path(__file__).parent / "pii-handler" / "reverse_replace_pii.py"
    if not module_path.exists():
        return None
    spec = importlib.util.spec_from_file_location("reverse_replace_pii", module_path)
    if not spec or not spec.loader:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, "restore_pii_in_text", None)


restore_pii_in_text = _load_reverse_restore()


def _word_count(text: str) -> int:
    if not text:
        return 0
    return len(text.strip().split())


def _first_words(text: str, limit: int = 30) -> str:
    words = text.strip().split()
    snippet = " ".join(words[:limit])
    if len(words) > limit:
        snippet += " ..."
    return snippet


def _resolve_summary_doc_type(output_directory: str) -> str:
    """
    Resolve prompt doc_type for summary module.
    Priority:
    1) SUMMARY_DOC_TYPE env var (exact DB value)
    2) Infer from page_map.json first page category
    3) fallback: medical
    """
    env_doc_type = os.getenv("SUMMARY_DOC_TYPE", "").strip()
    if env_doc_type:
        return env_doc_type

    category_to_doc_type = {
        "Traffic Collision Report": "traffic",
        "Medical Report": "medical",
    }

    try:
        page_map_path = Path(output_directory) / "page_map.json"
        if page_map_path.exists():
            data = json.loads(page_map_path.read_text(encoding="utf-8"))
            pages = data.get("pages", [])
            if isinstance(pages, list) and pages:
                first_page = pages[0] if isinstance(pages[0], dict) else {}
                category = first_page.get("category", {})
                if isinstance(category, dict):
                    matching = str(category.get("matching_category", "")).strip()
                    if matching in category_to_doc_type:
                        return category_to_doc_type[matching]
    except Exception:
        pass

    return "medical"


def _run_summary(output_dir: str, doc_type: str):
    """
    Run summarization with gateway first (testing path), then fallback to existing summarizer.
    Returns tuple: (summary_file_path, summary_text)
    """
    # Legacy summerize.py call path (kept for reference):
    # if summarize_output_dir_with_text:
    #     return summarize_output_dir_with_text(output_dir=output_dir, doc_type=doc_type)
    # if summarize_output_dir:
    #     summary_file = summarize_output_dir(output_dir=output_dir, doc_type=doc_type)
    #     return summary_file, None

    if gateway_summarize_output_dir_with_text:
        try:
            return gateway_summarize_output_dir_with_text(
                output_dir=output_dir,
                doc_type=doc_type,
            )
        except Exception as gateway_error:
            # Fallback path: if gateway fails, continue with standard summarizer
            # (Gemini primary with Groq fallback inside summerize.py).
            print(f"    [WARN] Gateway summarization failed, falling back to Gemini/Groq: {str(gateway_error)[:120]}")

    if summarize_output_dir_with_text:
        return summarize_output_dir_with_text(
            output_dir=output_dir,
            doc_type=doc_type,
        )

    if summarize_output_dir:
        summary_file = summarize_output_dir(
            output_dir=output_dir,
            doc_type=doc_type,
        )
        return summary_file, None

    raise RuntimeError("No summarization module available")


def _maybe_gateway_cooldown(current_index: int, total_items: int) -> None:
    """
    Add cooldown between document-level summary calls when gateway path is enabled.
    """
    if not gateway_summarize_output_dir_with_text:
        return
    if current_index >= total_items:
        return
    cooldown_seconds = 30
    print(f"    [INFO] Gateway cooldown: sleeping {cooldown_seconds}s before next document...")
    time.sleep(cooldown_seconds)


# ============================================================
# MAIN ENTRY POINT
# ============================================================
def main():
    """
    Main orchestrator for PDF processing pipeline.
    
    Flow:
    1. Validate job ID from command line
    2. Fetch job from database
    3. Create tasks for each demand file
    4. Process each demand file through the pipeline
    5. Update database with results
    6. Return final job status
    """
    if len(sys.argv) < 2:
        print("❌ Job ID not provided")
        print("Usage: python main.py <job_id>")
        sys.exit(1)

    job_id = sys.argv[1]
    pid = os.getpid()

    try:
        print(f"[*] Processing job: {job_id} (PID: {pid})")
        
        job = get_job_by_id(job_id)
        if not job:
            print(f"[!] Job not found: {job_id}")
            sys.exit(1)

        mark_job_in_progress(job_id)
        create_tasks_for_job(job_id)
        demand_files = get_demand_files_for_job(job_id)
        
        if not demand_files:
            # Re-summarization path: use existing sanitized artifacts for completed jobs.
            summarized_files = get_summarized_demand_files_for_job(job_id)
            if not summarized_files:
                print(f"[!] No demand files found for job {job_id}")
                mark_job_failed(job_id, "No demand files found for this job")
                return

            print(f"[*] No new files. Re-summarizing {len(summarized_files)} summarized file(s).")
            successful_files = 0
            failed_files = 0

            for idx, demand_file in enumerate(summarized_files, 1):
                demand_file_id = demand_file["id"]
                file_name = demand_file["fileName"]
                task = get_task_by_demand_file_id(demand_file_id)
                if not task:
                    print(f"    [WARN] No task found for summarized file: {demand_file_id}")
                    failed_files += 1
                    continue

                task_id = task["id"]
                output_dir = task.get("outputFilePath") or demand_file.get("filePath")
                if not output_dir or not Path(output_dir).exists():
                    print(f"    [WARN] Output directory missing for file: {file_name}")
                    failed_files += 1
                    continue

                try:
                    print(f"[*] Re-summarizing: {file_name} ({idx}/{len(summarized_files)})")
                    output_summary_text = None
                    summary_mode = "legacy"
                    prompt_version_id = None
                    min_words = int(os.getenv("SUMMARY_MIN_WORDS", "40"))

                    if combine_sanitized_chunks:
                        chunks_dir = Path(output_dir) / "chunks"
                        combined_file = combine_sanitized_chunks(chunks_dir)
                        if combined_file:
                            print(f"    [OK] Combined sanitized text: {combined_file}")

                    if (
                        gateway_summarize_output_dir_with_text
                        or summarize_output_dir_with_text
                        or summarize_output_dir
                    ):
                        doc_type = _resolve_summary_doc_type(output_dir)
                        summary_file, output_summary_text = _run_summary(output_dir, doc_type)
                        if fetch_active_prompt_record:
                            try:
                                prompt_record = fetch_active_prompt_record(doc_type)
                                prompt_version_id = prompt_record.get("id")
                            except Exception:
                                prompt_version_id = None
                        wc = _word_count(output_summary_text or "")
                        print(f"    [OK] Legacy summary text: {summary_file} (words={wc})")
                        print(f"    [INFO] Legacy snippet: {_first_words(output_summary_text or '', 30)}")
                        if wc < min_words:
                            print(f"    [WARN] Legacy summary too short (<{min_words} words). Running three-phase fallback.")
                            try:
                                page_count = 0
                                metadata_path = Path(output_dir) / "metadata.json"
                                if metadata_path.exists():
                                    try:
                                        metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
                                        if isinstance(metadata, list) and metadata:
                                            page_count = sum(item.get('num_pages', 0) for item in metadata)
                                    except Exception:
                                        page_count = 0
                                summary_file, output_summary_text, prompt_id_three = run_three_phase(
                                    Path(output_dir),
                                    page_count,
                                    log_level="INFO",
                                    doc_type=doc_type,
                                    chunks_info=None,
                                )
                                if prompt_id_three:
                                    prompt_version_id = prompt_id_three
                                summary_mode = "three-phase-fallback"
                                wc = _word_count(output_summary_text or "")
                                print(f"    [OK] Three-phase fallback summary: {summary_file} (words={wc})")
                                print(f"    [INFO] Three-phase snippet: {_first_words(output_summary_text or '', 30)}")
                            except Exception as three_err:
                                print(f"    [WARN] Three-phase fallback failed: {str(three_err)[:120]}")

                    if output_summary_text and restore_pii_in_text:
                        mapping_file = Path(output_dir) / "pii_mapping.json"
                        if mapping_file.exists():
                            output_summary_text = restore_pii_in_text(
                                output_summary_text,
                                str(mapping_file),
                            )
                            print("    [OK] Reverse replacement applied to summary text")
                        else:
                            print("    [WARN] Reverse replacement skipped: pii_mapping.json not found")

                    persisted_chars = len(output_summary_text or "")
                    print(f"    [INFO] Saving summary to DB (mode={summary_mode}, chars={persisted_chars})")

                    mark_task_completed(
                        task_id,
                        str(output_dir),
                        0,
                        job_id,
                        output_summary=output_summary_text,
                        prompt_version_id=prompt_version_id,
                    )
                    mark_demand_file_summarized(demand_file_id, str(output_dir))
                    successful_files += 1

                except Exception as resummary_error:
                    failed_files += 1
                    print(f"    [ERROR] Re-summarization failed: {str(resummary_error)[:120]}")
                finally:
                    _maybe_gateway_cooldown(idx, len(summarized_files))

            check_and_update_job_status(job_id)
            print(f"\n[+] Re-summarization completed: {successful_files} successful, {failed_files} failed\n")
            return

        print(f"[*] Found {len(demand_files)} demand file(s) to process")

        successful_files = 0
        failed_files = 0

        for idx, demand_file in enumerate(demand_files, 1):
            demand_file_id = demand_file["id"]
            file_name = demand_file["fileName"]

            # Get the task for this demand file
            task = get_task_by_demand_file_id(demand_file_id)
            if not task:
                print(f"⚠️  No task found for demand file {demand_file_id}, skipping")
                continue

            task_id = task["id"]

            try:
                print(f"[*] Processing: {file_name} ({idx}/{len(demand_files)})")
                print(f"    Demand File ID: {demand_file_id[:16]}...")
                
                mark_task_in_progress(task_id, pid)
                time.sleep(2)

                # Run pipeline for this demand file
                dummy_values_file = str(Path(__file__).parent / "pii-handler" / "dummy_values.json")

                # Load Groq prompt for PII detection
                groq_prompt_file = Path(__file__).parent / "pii-handler" / "groq_prompt.txt"
                groq_prompt = None
                use_groq = False

                if groq_prompt_file.exists():
                    try:
                        with open(groq_prompt_file, 'r', encoding='utf-8') as f:
                            groq_prompt = f.read().strip()
                        use_groq = True
                        print(f"    ✓ Groq PII detection enabled")
                    except Exception as e:
                        print(f"    ⚠️  Failed to load Groq prompt: {e}")
                        print(f"    Falling back to dummy values")

                result = run_pipeline(
                    demand_file_id=demand_file_id,
                    output_base_dir="./output",
                    chunk_size=4,
                    groq_prompt=groq_prompt,
                    use_groq=use_groq,
                    dummy_values_file=dummy_values_file,
                    mapping_file=None,
                    task_id=task_id,
                    job_id=job_id,
                    log_level="INFO",
                    filename=file_name
                )

                # Handle results
                if result['success']:
                    successful_files += 1
                    print(f"    [OK] {result['pages_extracted']} pages -> {result['chunks_created']} chunks")
                    output_summary_text = None
                    summary_mode = "legacy"
                    prompt_version_id = None
                    min_words = int(os.getenv("SUMMARY_MIN_WORDS", "40"))

                    # Optional file-level sanitized context output.
                    if combine_sanitized_chunks:
                        try:
                            chunks_dir = Path(result['output_directory']) / "chunks"
                            combined_file = combine_sanitized_chunks(chunks_dir)
                            if combined_file:
                                print(f"    [OK] Combined sanitized text: {combined_file}")
                        except Exception as combine_error:
                            print(f"    [WARN] Combine sanitized chunks failed: {str(combine_error)[:100]}")

                    # Testing hook: summarize combined file using active prompt table entry.
                    if (
                        gateway_summarize_output_dir_with_text
                        or summarize_output_dir_with_text
                        or summarize_output_dir
                    ):
                        try:
                            doc_type = _resolve_summary_doc_type(result['output_directory'])
                            summary_file, output_summary_text = _run_summary(
                                result['output_directory'],
                                doc_type,
                            )
                            if fetch_active_prompt_record:
                                try:
                                    prompt_record = fetch_active_prompt_record(doc_type)
                                    prompt_version_id = prompt_record.get("id")
                                except Exception:
                                    prompt_version_id = None
                            summary_mode = "legacy"
                            wc = _word_count(output_summary_text or "")
                            print(f"    [OK] Legacy summary text: {summary_file} (words={wc})")
                            print(f"    [INFO] Legacy snippet: {_first_words(output_summary_text or '', 30)}")
                            if wc < min_words:
                                print(f"    [WARN] Legacy summary too short (<{min_words} words). Running three-phase fallback.")
                                try:
                                    summary_file, output_summary_text, prompt_id_three = run_three_phase(
                                        Path(result["output_directory"]),
                                        result.get("pages_extracted", 0),
                                        log_level="INFO",
                                        doc_type=doc_type,
                                        chunks_info=result.get("chunks_info"),
                                    )
                                    prompt_version_id = prompt_id_three or prompt_version_id
                                    summary_mode = "three-phase-fallback"
                                    wc = _word_count(output_summary_text or "")
                                    print(f"    [OK] Three-phase fallback summary: {summary_file} (words={wc})")
                                    print(f"    [INFO] Three-phase snippet: {_first_words(output_summary_text or '', 30)}")
                                except Exception as three_err:
                                    print(f"    [WARN] Three-phase fallback failed: {str(three_err)[:120]}")
                        except Exception as summary_error:
                            print(f"    [WARN] Summarization failed: {str(summary_error)[:120]}")

                    if output_summary_text and restore_pii_in_text:
                        try:
                            mapping_file = Path(result['output_directory']) / "pii_mapping.json"
                            if mapping_file.exists():
                                output_summary_text = restore_pii_in_text(
                                    output_summary_text,
                                    str(mapping_file),
                                )
                                print("    [OK] Reverse replacement applied to summary text")
                            else:
                                print("    [WARN] Reverse replacement skipped: pii_mapping.json not found")
                        except Exception as reverse_error:
                            print(f"    [WARN] Reverse replacement failed: {str(reverse_error)[:120]}")

                    persisted_chars = len(output_summary_text or "")
                    print(f"    [INFO] Saving summary to DB (mode={summary_mode}, chars={persisted_chars})")

                    mark_task_completed(
                        task_id,
                        result['output_directory'],
                        result['pages_extracted'],
                        job_id,
                        output_summary=output_summary_text,
                        prompt_version_id=prompt_version_id,
                    )
                    mark_demand_file_summarized(demand_file_id, result['output_directory'])
                else:
                    failed_files += 1
                    error_msg = result.get('error', 'Pipeline execution failed')
                    print(f"    [ERROR] {error_msg}")
                    mark_task_failed(task_id, job_id, error_msg)

            except Exception as demand_file_error:
                failed_files += 1
                print(f"    [ERROR] {str(demand_file_error)[:100]}")
                if task_id:
                    mark_task_failed(task_id, job_id, str(demand_file_error)[:100])
            finally:
                _maybe_gateway_cooldown(idx, len(demand_files))

        # Finalize job
        check_and_update_job_status(job_id)
        final_demand_files = get_demand_files_for_job(job_id)
        summarized_count = sum(1 for df in final_demand_files if df.get('summaryStatus') == 'summarized')
        
        print(f"\n[+] Job completed: {successful_files} successful, {failed_files} failed, {summarized_count} summarized\n")

    except Exception as e:
        print(f"[!] CRITICAL ERROR: {str(e)[:100]}")
        try:
            mark_job_failed(job_id, f"Error: {str(e)[:100]}")
        except:
            pass
        sys.exit(1)


# ============================================================
# BOOTSTRAP - ENTRY POINT
# ============================================================
if __name__ == "__main__":
    main()
