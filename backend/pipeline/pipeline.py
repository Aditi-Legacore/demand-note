"""
PDF Processing Pipeline Orchestrator

Purpose:
Orchestrates the complete PDF processing pipeline:
1. Extract text from PDF (using extraction.py)
2. Create chunks from extracted text (using pdf_extract_chunks.py)
3. Detect PII in chunks (using groq_json_generator.py)
4. Replace PII with dummy values (using replace_pii2.py)
5. Manage database operations (using tasks_repository.py)

This module is highly modular - each step can be tested independently.
Database operations are optional and can be enabled/disabled via flags.
"""

import os
import json
import sys
import traceback
import importlib
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Get the path to pii-handler directory (hyphenated, so load by file path)
_new_code_dir = Path(__file__).parent / "pii-handler"

# Load modules explicitly from file paths
def _load_module(module_name: str, file_path: Path):
    """Load a module from an explicit file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module
    raise ImportError(f"Could not load {module_name} from {file_path}")

# Add pii-handler directory to path for nested imports
sys.path.insert(0, str(_new_code_dir))

# ============================================================
# CORE EXTRACTION MODULE
# ============================================================
try:
    from backend.pipeline.extractor.smart_extraction import (
        extract_text_by_page,
        format_page_text,
    )
except ImportError as e:
    print(f"Error: backend.pipeline.extractor.smart_extraction module not found: {e}")
    sys.exit(1)

# ============================================================
# PDF CHUNKING & PII DETECTION MODULES
# ============================================================
# Import pdf_extract_chunks explicitly from file
try:
    pdf_extract_chunks = _load_module(
        "pdf_extract_chunks",
        _new_code_dir / "pdf_extract_chunks.py"
    )
    create_output_directory = pdf_extract_chunks.create_output_directory
    save_raw_pages = pdf_extract_chunks.save_raw_pages
    create_chunks = pdf_extract_chunks.create_chunks
    find_pii_values = pdf_extract_chunks.find_pii_values
    save_pii_to_json = pdf_extract_chunks.save_pii_to_json
    sanitize_chunk_with_pii = pdf_extract_chunks.sanitize_chunk_with_pii
    _get_dummy_pii = pdf_extract_chunks._get_dummy_pii
    merge_with_previous_chunk_context = getattr(
        pdf_extract_chunks,
        "merge_with_previous_chunk_context",
        lambda current, previous, max_chars=4000: current
    )
except Exception as e:
    print(f"Error: pdf_extract_chunks module not available: {e}")
    sys.exit(1)

# Import Groq JSON generator for PII detection
try:
    groq_generator = _load_module(
        "groq_json_generator",
        _new_code_dir / "groq_json_generator.py"
    )
    generate_json_from_groq = groq_generator.generate_json_from_groq
except Exception as e:
    print(f"Warning: groq_json_generator not available: {e}")
    generate_json_from_groq = None

try:
    page_map_builder = _load_module(
        "page_map_builder",
        _new_code_dir / "page_map_builder.py"
    )
    _shared_append_page_map = page_map_builder.append_page_map
except Exception as e:
    print(f"Warning: page_map_builder not available: {e}")
    _shared_append_page_map = None

# Import PIIReplacer for PII replacement
try:
    replace_pii = _load_module(
        "replace_pii2",
        _new_code_dir / "replace_pii2.py"
    )
    PIIReplacer = replace_pii.PIIReplacer
except Exception as e:
    print(f"Warning: replace_pii2 not available: {e}")
    PIIReplacer = None

# Import embedding engine (hyphenated directory, so load by file path)
try:
    embedding_engine_module = _load_module(
        "embedding_engine",
        Path(__file__).parent / "embedding-engine" / "embedding.py",
    )
    EmbeddingEngine = embedding_engine_module.EmbeddingEngine
except Exception as e:
    print(f"Warning: embedding engine not available: {e}")
    EmbeddingEngine = None

# ============================================================
# DATABASE OPERATIONS (optional)
# ============================================================
try:
    from backend.pipeline.utils.connect_db import db_connect
    from backend.pipeline.utils.tasks_repository import (
        mark_task_in_progress,
        mark_task_completed,
        mark_task_failed,
        get_job_id_from_task,
        mark_job_in_progress,
        mark_job_completed,
        check_and_update_job_status,
        get_demand_note_id_for_demand_file,
    )
    DB_OPERATIONS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: tasks_repository module not fully available: {e}")
    DB_OPERATIONS_AVAILABLE = False
    db_connect = None
    # Define stub functions
    mark_task_in_progress = None
    mark_task_completed = None
    mark_task_failed = None
    get_job_id_from_task = None
    mark_job_in_progress = None
    mark_job_completed = None
    check_and_update_job_status = None
    get_demand_note_id_for_demand_file = None


# ============================================================
# LOGGER - Imported from pdf_extract_chunks
# ============================================================
# Logger class is already available from pdf_extract_chunks module loaded above

# Global logger instance
_logger = pdf_extract_chunks.Logger("INFO")


def _append_page_map(output_dir: Path, chunk_id: int, groq_raw: Dict) -> None:
    """
    Persist non-PII page/document mapping from raw Groq output before normalization.
    Keeps PII pipeline input unchanged.
    """
    if not _shared_append_page_map:
        return
    _shared_append_page_map(output_dir, chunk_id, groq_raw, logger=_logger)


def fetch_pdf_from_database(demand_file_id: str) -> bytes:
    """
    Fetch PDF bytes from DB using DemandFile ID.
    Kept in pipeline layer so extractor modules stay storage-agnostic.
    """
    if not db_connect:
        raise RuntimeError("Database connection helper is not available")

    query = """
        SELECT
            COALESCE(df."filePath", t."filePath") as "filePath"
        FROM "DemandFile" df
        LEFT JOIN "Task" t ON t."demandFileId" = df."id"
        WHERE df."id" = %s
        LIMIT 1
    """

    with db_connect() as conn, conn.cursor() as cur:
        cur.execute(query, (demand_file_id,))
        row = cur.fetchone()

    if not row:
        raise ValueError(f"DemandFile with id {demand_file_id} not found")

    file_path = row["filePath"] if isinstance(row, dict) else row[0]
    if not file_path:
        raise ValueError(f"File path not found for DemandFile {demand_file_id}")

    resolved_path = _resolve_pdf_path(str(file_path))
    with open(resolved_path, "rb") as f:
        return f.read()


def _resolve_pdf_path(file_path: str) -> Path:
    """Resolve DB file path to an existing local path."""
    attempted_paths: List[str] = []

    test_path = Path(file_path)
    attempted_paths.append(str(test_path))
    if test_path.exists():
        return test_path

    uploads_base = os.getenv("UPLOADS_BASE_DIR") or os.getenv("FILE_STORAGE_PATH")
    if uploads_base:
        relative_path = file_path.lstrip("/") if file_path.startswith("/") else file_path
        test_path = Path(uploads_base) / relative_path
        attempted_paths.append(str(test_path))
        if test_path.exists():
            return test_path

    if file_path.startswith("/"):
        relative_path = file_path.lstrip("/")
        cwd = Path.cwd()
        for level in range(4):
            base = cwd
            for _ in range(level):
                base = base.parent
            test_path = base / relative_path
            attempted_paths.append(str(test_path))
            if test_path.exists():
                return test_path

    attempted_preview = "\n".join(
        f"  {i}. {path_str}" for i, path_str in enumerate(attempted_paths[:10], 1)
    )
    raise FileNotFoundError(
        f"PDF file not found. Attempted {len(attempted_paths)} paths:\n{attempted_preview}"
    )


# ============================================================
# STEP 1: PDF EXTRACTION
# ============================================================
def step_1_extract_pdf(demand_file_id: str) -> Tuple[List[str], bool]:
    """
    Step 1: Extract text from PDF page by page.
    
    This step uses extraction.py module which:
    - Fetches PDF from database using demand_file_id
    - Extracts text page by page using adaptive extraction
    - Returns list of page texts
    
    Args:
        demand_file_id: ID of DemandFile from database
        
    Returns:
        Tuple of (pages_list, success_flag)
        - pages_list: List of extracted page texts
        - success_flag: True if extraction successful, False otherwise
    """
    try:
        pdf_content = fetch_pdf_from_database(demand_file_id)
        pages = extract_text_by_page(pdf_content)
        _logger.log(f"[+] STEP 1: Extracted {len(pages)} pages from PDF", "INFO")
        return pages, True
        
    except Exception as e:
        _logger.log(f"[!] STEP 1 FAILED: {str(e)[:100]}", "ERROR")
        return [], False


# ============================================================
# STEP 2: CREATE CHUNKS & SAVE RAW PAGES
# ============================================================
def step_2_create_chunks(pages: List[str], pdf_filename: str, chunk_size: int = 4) -> Tuple[List[Dict], bool, Path]:
    """
    Step 2: Create chunks from extracted pages and save raw pages.
    
    This step USES pdf_extract_chunks.py functions:
    - create_output_directory() - Create output directory structure
    - save_raw_pages() - Save raw pages with markers
    - create_chunks() - Create chunks from pages
    
    Args:
        pages: List of extracted page texts
        pdf_filename: Name of the PDF file (used for directory naming)
        chunk_size: Number of pages per chunk (default: 4)
        
    Returns:
        Tuple of (chunks_info_list, success_flag, output_dir)
        - chunks_info_list: List of chunk info dictionaries
        - success_flag: True if successful, False otherwise
        - output_dir: Path to the output directory
    """
    try:
        output_dir = create_output_directory(pdf_filename)
        marked_pages = save_raw_pages(pages, output_dir)
        chunk_info = create_chunks(marked_pages, chunk_size, output_dir)
        _logger.log(f"[+] STEP 2: Created {len(chunk_info)} chunks from {len(pages)} pages", "INFO")
        
        return chunk_info, True, output_dir
        
    except Exception as e:
        _logger.log(f"[!] STEP 2 FAILED: {str(e)[:100]}", "ERROR")
        return [], False, None


def step_2b_create_and_store_embeddings(
    output_dir: Path,
    source_filename: str,
    model_name: str = "all-MiniLM-L6-v2",
    collection_name: str = "document_embeddings",
    chunk_min_tokens: int = 500,
    chunk_max_tokens: int = 1500,
    overlap_ratio: float = 0.15,
    demand_note_id: Optional[str] = None,
) -> Tuple[bool, Dict]:
    """
    Step 2B: Build semantic chunks from extracted raw pages, save them, and store vectors.

    Reads from:
        <output_dir>/rawpages
    Writes to:
        <output_dir>/embedding_chunks
    Stores vectors in:
        ChromaDB persistent store
    """
    if EmbeddingEngine is None:
        _logger.log("[WARN] STEP 2B SKIPPED: EmbeddingEngine module not available", "WARNING")
        return False, {"error": "EmbeddingEngine not available"}

    try:
        chroma_path = os.getenv(
            "EMBEDDING_CHROMA_PATH",
            str((Path(__file__).parent / "embedding-engine" / "chroma_store").resolve()),
        )

        def _embedding_log(message: str, level: str = "INFO") -> None:
            _logger.log(f"[Embedding] {message}", level)

        engine = EmbeddingEngine(
            model_name=model_name,
            chroma_path=chroma_path,
            default_collection_name=collection_name,
            log_func=_embedding_log,
        )

        result = engine.run_embedding_pipeline_from_output_directory(
            output_dir=str(output_dir),
            source_filename=source_filename,
            chunk_min_tokens=chunk_min_tokens,
            chunk_max_tokens=chunk_max_tokens,
            overlap_ratio=overlap_ratio,
            embedding_subdirectory="embedding_chunks",
            demand_note_id=demand_note_id,
        )

        _logger.log(
            f"[+] STEP 2B: Created {result['chunks_created']} embedding chunks and stored "
            f"{result['vectors_stored']} vectors",
            "INFO",
        )
        return True, result
    except Exception as e:
        _logger.log(f"[!] STEP 2B FAILED: {str(e)[:140]}", "ERROR")
        return False, {"error": str(e)}


# ============================================================
# HELPER FUNCTIONS
# ============================================================
def _normalize_pii_dict(pii_data: Dict) -> Dict:
    """
    Normalize PII dict format - handle nested 'pii' key and dict values in lists.
    
    The Groq API may return:
    - {"pii": {"Person Name": [...]}} - nested format
    - {"Person Name": [{"value": "John", "context": "..."}]} - dict values
    
    This function converts to the standard format:
    - {"Person Name": ["John", ...]}
    
    Args:
        pii_data: Raw PII dict from Groq API
        
    Returns:
        Normalized PII dict
    """
    if not isinstance(pii_data, dict):
        return pii_data
    
    # Handle nested "pii" key
    if 'pii' in pii_data:
        pii_data = pii_data['pii']

    # Legacy-key compatibility: map older Groq keys to pii.json keys.
    legacy_key_map = {
        "names": "Person Name",
        "person_names": "Person Name",
        "hospitals": "Hospital",
        "hospital": "Hospital",
        "addresses": "Street Address",
        "address": "Street Address",
        "dobs": "Date of Birth",
        "dob": "Date of Birth",
        "emails": "Email",
        "phones": "Phone",
        "phone": "Phone",
        "phone number": "Phone",
        "phone_number": "Phone",
        "telephone": "Phone",
        "contact number": "Phone",
        "contact_number": "Phone",
        "ssns": "SSN",
        "mrn": "Medical Record Number",
        "medical_record_number": "Medical Record Number",
        "incident number": "Incident Number",
        "incident_number": "Incident Number",
        "incident no": "Incident Number",
        "incident_no": "Incident Number",
        "incident #": "Incident Number",
        "zip_codes": "Zip",
        "zips": "Zip",
    }
    
    # Normalize each PII type's values
    normalized = {}
    for pii_type, values in pii_data.items():
        canonical_type = legacy_key_map.get(str(pii_type).strip().lower(), pii_type)
        if isinstance(values, list):
            normalized_values = []
            for value in values:
                # Handle dict values like {"value": "John Doe", "context": "..."}
                if isinstance(value, dict):
                    if 'value' in value:
                        normalized_values.append(value['value'])
                    # Skip dicts without 'value' key
                elif value:  # Skip empty/None values
                    normalized_values.append(str(value))
            normalized.setdefault(canonical_type, [])
            normalized[canonical_type].extend(normalized_values)
        elif values:  # Handle non-list values
            normalized.setdefault(canonical_type, [])
            normalized[canonical_type].append(str(values))
        else:
            normalized.setdefault(canonical_type, [])
    
    return normalized


# ============================================================
# STEP 3: PII DETECTION VIA GROQ
# ============================================================
def step_3_detect_pii(chunks_info: List[Dict], groq_prompt: str = None,
                      use_groq: bool = False, output_dir: Path = None) -> Tuple[Dict[int, Dict], bool]:
    """
    Step 3: Detect PII in chunks using Groq API or dummy values.
    
    This step USES pdf_extract_chunks.py function:
    - find_pii_values() - Detect PII using Groq or dummy values
    
    For Groq API:
    - For each chunk, write to pii-handler/input.txt
    - Call generate_json_from_groq() directly
    - Save output JSON
    
    Args:
        chunks_info: List of chunk info dictionaries (must include 'chunk_id' and 'text')
        groq_prompt: Groq prompt for PII detection (required if use_groq=True)
        use_groq: If True, use Groq API; if False, use dummy values
        output_dir: Output directory to save JSON results (required if use_groq=True)
        
    Returns:
        Tuple of (pii_dict, success_flag)
        - pii_dict: Dictionary mapping chunk_id -> PII detection results
        - success_flag: True if detection successful, False otherwise
    """
    pii_dict = {}
    pii_method = "Groq API" if use_groq and groq_prompt else "Dummy values"
    
    try:
        _logger.log(f"  Using {pii_method} for PII detection", "DEBUG")
        previous_chunk_text = None
        
        for chunk_info in chunks_info:
            chunk_id = chunk_info['chunk_id']
            chunk_file_path = Path(chunk_info['file'])
            
            try:
                with open(chunk_file_path, 'r', encoding='utf-8') as f:
                    chunk_text = f.read()
                _logger.log(f"    Detecting PII in chunk {chunk_id} ({len(chunk_text)} chars)", "DEBUG")
                
                if groq_prompt and generate_json_from_groq:
                    try:
                        # Call generate_json_from_groq directly with chunk text
                        _logger.log(f"      Calling Groq API for chunk {chunk_id}", "DEBUG")
                        merged_input = merge_with_previous_chunk_context(
                            chunk_text,
                            previous_chunk_text,
                            4000
                        )
                        pii_result_raw = generate_json_from_groq(groq_prompt, merged_input)
                        raw_keys = list(pii_result_raw.keys()) if isinstance(pii_result_raw, dict) else []
                        _logger.log(f"[Groq Debug] Chunk {chunk_id} raw keys: {raw_keys}", "INFO")
                        if output_dir:
                            _append_page_map(output_dir, chunk_id, pii_result_raw)
                        pii_result = _normalize_pii_dict(pii_result_raw)
                        _logger.log(
                            f"[Groq Debug] Chunk {chunk_id} normalized keys: {list(pii_result.keys())}",
                            "INFO"
                        )
                        pii_dict[chunk_id] = pii_result
                        
                        # Save output JSON (normalize format first)
                        if output_dir:
                            output_file = output_dir / "chunks" / f"chunk_{chunk_id:04d}_pii.json"
                            with open(output_file, 'w', encoding='utf-8') as f:
                                json.dump(pii_result, f, indent=2)
                            _logger.log(
                                f"[Groq Debug] Saved normalized PII file for chunk {chunk_id}: {output_file.name}",
                                "INFO",
                            )
                        
                        total_pii = sum(len(v) if isinstance(v, list) else 0 for v in pii_result.values())
                        _logger.log(f"      Found {total_pii} PII values in chunk {chunk_id}", "DEBUG")
                    except Exception as e:
                        _logger.log(f"      Groq API call failed for chunk {chunk_id}: {str(e)}", "ERROR")
                        pii_dict[chunk_id] = _get_dummy_pii()
                else:
                    # Use dummy values or find_pii_values
                    pii_result = find_pii_values(chunk_text, groq_prompt, False)
                    pii_dict[chunk_id] = pii_result
                    total_pii = sum(len(v) if isinstance(v, list) else 0 for v in pii_result.values())
                    _logger.log(f"      Found {total_pii} PII values in chunk {chunk_id}", "DEBUG")
                previous_chunk_text = chunk_text
                    
            except Exception as e:
                _logger.log(f"      PII detection failed for chunk {chunk_id}: {str(e)[:50]}", "WARNING")
                pii_dict[chunk_id] = _get_dummy_pii()
        
        _logger.log(f"[+] STEP 3: PII detection completed for {len(pii_dict)} chunks ({pii_method})", "INFO")
        return pii_dict, True
        
    except Exception as e:
        _logger.log(f"[!] STEP 3 FAILED: {str(e)[:100]}", "ERROR")
        return {}, False


# ============================================================
# STEP 4: PII REPLACEMENT & SANITIZATION
# ============================================================
def step_4_replace_pii(chunks_info: List[Dict], pii_dict: Dict[int, Dict], 
                       output_dir: Path, dummy_values_file: str = None,
                       mapping_file: str = None) -> Tuple[bool, Optional[Path]]:
    """
    Step 4: Replace detected PII with dummy values and create mapping file.
    
    This step USES pdf_extract_chunks.py function:
    - sanitize_chunk_with_pii() - Replace PII with dummies and save mapping
    
    Args:
        chunks_info: List of chunk info dictionaries
        pii_dict: Dictionary mapping chunk_id -> PII detection results
        output_dir: Output directory where chunks are saved
        dummy_values_file: Path to dummy values JSON file
        mapping_file: Optional path to existing mapping file for consistency
        
    Returns:
        Tuple of (success_flag, mapping_file_path)
        - success_flag: True if replacement successful, False otherwise
        - mapping_file_path: Path to created pii_mapping.json
    """
    if not PIIReplacer:
        _logger.log(f"[!] STEP 4 SKIPPED: PII replacer module not available", "WARNING")
        return False, None
    
    try:
        if not dummy_values_file or not os.path.exists(dummy_values_file):
            _logger.log(f"[!] STEP 4 SKIPPED: Dummy values file not found", "WARNING")
            return False, None
        
        replacer = PIIReplacer(dummy_values_file, mapping_file)
        chunks_dir = output_dir / "chunks"
        mapping_file_path = output_dir / "pii_mapping.json"
        
        _logger.log(f"  Replacing PII in {len(chunks_info)} chunks", "DEBUG")
        for chunk_info in chunks_info:
            chunk_id = chunk_info['chunk_id']
            chunk_file_path = Path(chunk_info['file'])
            
            with open(chunk_file_path, 'r', encoding='utf-8') as f:
                chunk_text = f.read()
            
            pii_result = _normalize_pii_dict(pii_dict.get(chunk_id, {}))
            
            try:
                _logger.log(f"    Processing chunk {chunk_id}", "DEBUG")
                chunk_stem = f"chunk_{chunk_id:04d}"
                chunk_file = chunks_dir / f"{chunk_stem}.txt"
                sanitized_text, metadata = sanitize_chunk_with_pii(
                    chunk_text, chunk_file, pii_result, replacer, output_dir
                )
                
                pii_file = chunks_dir / f"{chunk_stem}_pii.json"
                with open(pii_file, 'w', encoding='utf-8') as f:
                    json.dump(pii_result, f, indent=2)
                _logger.log(f"      Chunk {chunk_id} sanitized and saved", "DEBUG")
            except Exception as e:
                _logger.log(f"      Failed to process chunk {chunk_id}: {str(e)[:50]}", "WARNING")
                continue
        
        _logger.log(f"[+] STEP 4: PII replacement completed for {len(chunks_info)} chunks", "INFO")
        return True, mapping_file_path
        
    except Exception as e:
        _logger.log(f"[!] STEP 4 FAILED: {str(e)[:100]}", "ERROR")
        return False, None


# ============================================================
# STEP 5: SAVE METADATA
# ============================================================
def step_5_save_metadata(chunks_info: List[Dict], output_dir: Path) -> Tuple[bool, Optional[Path]]:
    """
    Step 5: Create and save metadata for all chunks.
    
    This step:
    - Generates metadata for each chunk
    - Saves metadata to metadata.json file
    
    Args:
        chunks_info: List of chunk info dictionaries
        output_dir: Output directory
        
    Returns:
        Tuple of (success_flag, metadata_file_path)
    """
    try:
        all_metadata = []
        for chunk_info in chunks_info:
            chunk_file_path = Path(chunk_info['file'])
            
            with open(chunk_file_path, 'r', encoding='utf-8') as f:
                chunk_text = f.read()
            
            metadata = {
                'chunk_id': chunk_info['chunk_id'],
                'start_page': chunk_info['start_page'],
                'end_page': chunk_info['end_page'],
                'num_pages': chunk_info['num_pages'],
                'character_count': len(chunk_text),
                'word_count': len(chunk_text.split()),
                'line_count': chunk_text.count('\n') + 1,
                'timestamp': datetime.now().isoformat()
            }
            all_metadata.append(metadata)
        
        metadata_file = output_dir / "metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(all_metadata, f, indent=2)

        _logger.log(f"[+] STEP 5: Metadata saved for {len(chunks_info)} chunks", "INFO")
        return True, metadata_file

    except Exception as e:
        _logger.log(f"[!] STEP 5 FAILED: {str(e)[:100]}", "ERROR")
        return False, None


def _save_chunks_info_json(chunks_info: List[Dict], output_dir: Path) -> Optional[Path]:
    """
    Persist sanitized chunk manifest for downstream summarization (three-phase, re-summarize).
    """
    try:
        records: List[Dict] = []
        for info in chunks_info:
            chunk_file = Path(info.get("file"))
            sanitized_file = chunk_file.with_name(f"{chunk_file.stem}_s.txt")
            source_file = sanitized_file if sanitized_file.exists() else chunk_file
            try:
                text = source_file.read_text(encoding="utf-8")
            except Exception:
                text = ""

            records.append(
                {
                    "chunk_id": info.get("chunk_id"),
                    "orig_chunk_ids": [info.get("chunk_id")],
                    "page_start": info.get("start_page"),
                    "page_end": info.get("end_page"),
                    "text": text,
                }
            )

        path = output_dir / "chunks" / "chunks_info.json"
        path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        _logger.log(f"[+] Saved chunks_info.json with {len(records)} entries", "INFO")
        return path
    except Exception as e:
        _logger.log(f"[WARN] Unable to save chunks_info.json: {str(e)[:120]}", "WARNING")
        return None


# ============================================================
# DATABASE OPERATIONS (OPTIONAL)
# ============================================================
def handle_db_task_progress(task_id: str, job_id: str, stage: str = "in_progress"):
    """
    Update task status in database.
    
    Args:
        task_id: Task ID
        job_id: Job ID
        stage: Stage - 'in_progress' or 'completed' or 'failed'
    """
    if not DB_OPERATIONS_AVAILABLE or not task_id:
        return
    
    try:
        if stage == "in_progress" and mark_task_in_progress:
            mark_task_in_progress(task_id, os.getpid())
        elif stage == "completed" and mark_task_completed:
            mark_task_completed(task_id, "", 0, job_id)
        elif stage == "failed" and mark_task_failed:
            mark_task_failed(task_id, job_id, "Pipeline execution failed")
    except Exception as e:
        _logger.log(f"[!] Task status update failed: {str(e)[:80]}", "WARNING")


def handle_db_job_progress(job_id: str, stage: str = "in_progress"):
    """
    Update job status in database.
    
    Args:
        job_id: Job ID
        stage: Stage - 'in_progress' or 'completed' or 'failed'
    """
    if not DB_OPERATIONS_AVAILABLE or not job_id:
        return
    
    try:
        if stage == "in_progress" and mark_job_in_progress:
            mark_job_in_progress(job_id)
        elif stage == "check_status" and check_and_update_job_status:
            check_and_update_job_status(job_id)
    except Exception as e:
        _logger.log(f"[!] Job status update failed: {str(e)[:80]}", "WARNING")


# ============================================================
# PIPELINE ORCHESTRATOR
# ============================================================
def run_pipeline(demand_file_id: str, output_base_dir: str = ".",
                 chunk_size: int = 4, groq_prompt: str = None,
                 use_groq: bool = False, dummy_values_file: str = None,
                 mapping_file: str = None, task_id: str = None,
                 job_id: str = None, log_level: str = "INFO",
                 filename: str = None) -> Dict:
    """
    Run the complete PDF processing pipeline.
    
    Pipeline Stages:
    1. Extract text from PDF using extraction.py
    2. Create chunks and save raw pages
    2B. Create semantic embedding chunks and store vectors in ChromaDB
    3. Detect PII using Groq API or dummy values
    4. Replace PII with dummy values and create mapping
    5. Generate metadata for chunks
    6. Update database operations (optional)
    
    Args:
        demand_file_id: ID of DemandFile from database
        output_base_dir: Base directory for output (default: current directory)
        chunk_size: Number of pages per chunk (default: 4)
        groq_prompt: Groq prompt for PII detection (optional)
        use_groq: Use Groq API for PII detection (default: False)
        dummy_values_file: Path to dummy values JSON file (optional)
        mapping_file: Path to existing mapping file for consistency (optional)
        task_id: Task ID for database operations (optional)
        job_id: Job ID for database operations (optional)
        log_level: Logging level - 'DEBUG', 'INFO', 'WARNING', 'ERROR' (default: 'INFO')
        
    Returns:
        Dictionary with pipeline results:
        {
            'success': bool,
            'demand_file_id': str,
            'output_directory': str,
            'pages_extracted': int,
            'chunks_created': int,
            'embedding_chunks_created': int,
            'embedding_vectors_stored': int,
            'embedding_chunks_directory': str,
            'pii_mappings': int,
            'error': str (if failed),
            'stages': {
                'extraction': bool,
                'chunking': bool,
                'embedding': bool,
                'pii_detection': bool,
                'pii_replacement': bool,
                'metadata': bool
            }
        }
    """
    global _logger
    _logger = pdf_extract_chunks.Logger(log_level)
    demand_note_id = None
    
    result = {
        'success': False,
        'demand_file_id': demand_file_id,
        'output_directory': '',
        'pages_extracted': 0,
        'chunks_created': 0,
        'embedding_chunks_created': 0,
        'embedding_vectors_stored': 0,
        'embedding_chunks_directory': '',
        'pii_mappings': 0,
        'error': '',
        'stages': {
            'extraction': False,
            'chunking': False,
            'embedding': False,
            'pii_detection': False,
            'pii_replacement': False,
            'metadata': False
        }
    }
    
    try:
        _logger.log(f"Pipeline started: {demand_file_id}", "DEBUG")
        _logger.log(f"  Output Base Dir: {output_base_dir}, Chunk Size: {chunk_size} pages", "DEBUG")
        
        # Database operations - Mark task/job in progress
        if task_id or job_id:
            if task_id:
                handle_db_task_progress(task_id, job_id, "in_progress")
            if job_id:
                handle_db_job_progress(job_id, "in_progress")
        
        # ============================================================
        # STEP 1: PDF EXTRACTION
        # ============================================================
        pages, extraction_success = step_1_extract_pdf(demand_file_id)
        result['stages']['extraction'] = extraction_success
        
        if not extraction_success:
            result['error'] = 'PDF extraction failed'
            if task_id:
                handle_db_task_progress(task_id, job_id, "failed")
            return result
        
        result['pages_extracted'] = len(pages)
        
        # ============================================================
        # STEP 2: CREATE CHUNKS & SAVE RAW PAGES
        # ============================================================
        # Use filename for output directory naming (calls pdf_extract_chunks.create_output_directory)
        pdf_filename = filename if filename else f"{demand_file_id[:8]}_output"

        # Fetch demandNoteId for metadata propagation (if DB is available)
        if DB_OPERATIONS_AVAILABLE:
            try:
                demand_note_id = get_demand_note_id_for_demand_file(demand_file_id)
            except Exception as e:
                _logger.log(f"[WARN] Unable to fetch demandNoteId for {demand_file_id}: {str(e)[:120]}", "WARNING")

        chunks_info, chunking_success, output_dir = step_2_create_chunks(pages, pdf_filename, chunk_size)
        result['stages']['chunking'] = chunking_success
        
        if not chunking_success:
            result['error'] = 'Chunk creation failed'
            if task_id:
                handle_db_task_progress(task_id, job_id, "failed")
            return result
        
        result['chunks_created'] = len(chunks_info)
        result['output_directory'] = str(output_dir)
        # Persist in-memory chunks_info for downstream consumers (e.g., three-phase summary)
        result['chunks_info'] = chunks_info

        # ============================================================
        # STEP 2B: CREATE EMBEDDING CHUNKS & STORE VECTORS
        # ============================================================
        embedding_success, embedding_result = step_2b_create_and_store_embeddings(
            output_dir=output_dir,
            source_filename=pdf_filename,
            demand_note_id=demand_note_id,
        )
        result['stages']['embedding'] = embedding_success
        if embedding_success:
            result['embedding_chunks_created'] = embedding_result.get('chunks_created', 0)
            result['embedding_vectors_stored'] = embedding_result.get('vectors_stored', 0)
            result['embedding_chunks_directory'] = embedding_result.get('embedding_chunks_directory', '')
        
        # ============================================================
        # STEP 3: PII DETECTION VIA GROQ
        # ============================================================
        pii_dict, pii_detection_success = step_3_detect_pii(chunks_info, groq_prompt, use_groq, output_dir)
        result['stages']['pii_detection'] = pii_detection_success
        
        if not pii_detection_success:
            result['error'] = 'PII detection failed'
            if task_id:
                handle_db_task_progress(task_id, job_id, "failed")
            return result
        
        # ============================================================
        # STEP 4: PII REPLACEMENT & SANITIZATION
        # ============================================================
        replacement_success, mapping_file_path = step_4_replace_pii(
            chunks_info, pii_dict, output_dir, dummy_values_file, mapping_file
        )
        result['stages']['pii_replacement'] = replacement_success
        
        if replacement_success and mapping_file_path:
            # Count total mappings from mapping file
            try:
                with open(mapping_file_path, 'r', encoding='utf-8') as f:
                    mapping_data = json.load(f)
                    result['pii_mappings'] = mapping_data.get('total_mappings', 0)
            except:
                pass
        
        # ============================================================
        # STEP 5: SAVE METADATA
        # ============================================================
        metadata_success, metadata_file = step_5_save_metadata(chunks_info, output_dir)
        result['stages']['metadata'] = metadata_success
        # Persist chunk manifest for downstream summarization paths
        _save_chunks_info_json(chunks_info, output_dir)
        
        # ============================================================
        # FINAL SUMMARY
        # ============================================================
        _logger.log(
            f"[+] Pipeline completed: {result['pages_extracted']} pages -> {result['chunks_created']} chunks, "
            f"{result['embedding_vectors_stored']} vectors, {result['pii_mappings']} PII mappings",
            "INFO",
        )
        
        # Database operations - Mark task/job completed
        if task_id:
            handle_db_task_progress(task_id, job_id, "completed")
        if job_id:
            handle_db_job_progress(job_id, "check_status")
        
        result['success'] = True
        return result
        
    except Exception as e:
        _logger.log(f"[!] Pipeline failed: {str(e)[:100]}", "ERROR")
        
        result['error'] = str(e)
        
        # Database operations - Mark task/job failed
        if task_id:
            handle_db_task_progress(task_id, job_id, "failed")
        
        return result


# ============================================================
# UTILITY FUNCTIONS
# ============================================================
def _get_dummy_pii() -> Dict:
    """Return dummy PII values for testing"""
    return {
        "Person Name": ["Thomas Smith", "John Doe"],
        "Hospital": ["County General Hospital", "St. Mary's Medical Center"],
        "Address": ["42703 Monroe Avenue", "123 Main Street"],
        "DOB": ["1992-07-21", "1985-03-15"],
        "Email": ["john.doe@example.com", "thomas.smith@test.com"],
        "Phone": ["555-123-4567", "555-987-6543"],
        "SSN": ["123-45-6789", "987-65-4321"]
    }


if __name__ == "__main__":
    # Example usage
    print("Pipeline module loaded. Use run_pipeline() function to execute the pipeline.")
