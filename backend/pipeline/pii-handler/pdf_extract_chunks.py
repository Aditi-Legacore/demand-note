#!/usr/bin/env python3
"""
PDF Processing Pipeline
Extracts text from PDF, creates chunks, and generates metadata.
Integrates with extraction.py for PDF extraction and tasks_repository.py for DB operations.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, TYPE_CHECKING
import unicodedata

# Ensure project root is on sys.path for absolute imports
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Entity linker for consistent Person Name mapping across chunks
try:
    from entity_linker import (
        merge_person_entities,
        resolve_entity_key,
        assign_dummies_to_canonicals,
        _normalize_name,
    )
except ImportError:
    merge_person_entities = None
    resolve_entity_key = None
    assign_dummies_to_canonicals = None
    _normalize_name = None

# ============================================================
# IMPORTS FROM PROJECT MODULES
# ============================================================
# Import extraction module for PDF text extraction
try:
    from backend.pipeline.extractor.smart_extraction import extract_text_by_page, format_page_text
except ImportError:
    print("Warning: backend.pipeline.extractor.smart_extraction module not found. Using fallback extraction method.")
    extract_text_by_page = None

# Import tasks repository for database operations
try:
    from backend.pipeline.utils.tasks_repository import (
        mark_task_in_progress,
        mark_task_completed,
        mark_task_failed,
        get_job_id_from_task,
        mark_job_in_progress,
        mark_job_completed,
        check_and_update_job_status
    )
except ImportError:
    print("Warning: tasks_repository module not found. DB operations will be disabled.")
    mark_task_in_progress = None
    mark_task_completed = None
    mark_task_failed = None
    get_job_id_from_task = None
    mark_job_in_progress = None
    mark_job_completed = None
    check_and_update_job_status = None

# ============================================================
# ORIGINAL IMPORTS (Commented - using extraction.py instead)
# ============================================================
# try:
#     import PyPDF2
# except ImportError:
#     print("Error: PyPDF2 is required. Install it with: pip install PyPDF2")
#     sys.exit(1)

# Import PII replacement module
# Note: pipeline.py adds pii-handler/ to sys.path, so we use simple imports
if TYPE_CHECKING:
    from replace_pii2 import PIIReplacer

try:
    from replace_pii2 import PIIReplacer, load_pii_from_json
except ImportError:
    PIIReplacer = None

# Import Groq JSON generator
try:
    from groq_json_generator import generate_json_from_groq
except ImportError:
    generate_json_from_groq = None

try:
    from page_map_builder import append_page_map as _shared_append_page_map
except ImportError:
    _shared_append_page_map = None


# Global logging configuration
class Logger:
    """Simple logging system with level control"""
    
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    
    def __init__(self, log_level: str = "INFO"):
        self.log_level = log_level
        self.level_order = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3}
    
    def should_log(self, level: str) -> bool:
        """Check if message should be logged based on level"""
        return self.level_order.get(level, 1) >= self.level_order.get(self.log_level, 1)
    
    def log(self, message: str, level: str = "INFO"):
        """Log a message if level is enabled"""
        if self.should_log(level):
            print(message)


# Global logger instance
_logger = Logger("INFO")

# Persistent person-entity alias map across chunks (within a run)
_PERSON_ENTITIES: Dict[str, List[str]] = {}
# Map canonical PERSON_# -> dummy value for consistent replacement
_PERSON_ENTITY_DUMMIES: Dict[str, str] = {}
_CREDENTIAL_TOKENS = {
    "md", "m.d.", "rn", "r.n.", "pt", "p.t.", "np", "n.p.",
    "do", "d.o.", "pa", "p.a.", "dds", "d.d.s.", "phd", "ph.d.",
}


def _append_page_map(output_dir: Path, chunk_id: int, groq_raw: Dict) -> None:
    """
    Persist non-PII page/document mapping from raw Groq output before PII normalization.
    This keeps replacement input unchanged while preserving page/doc structure.
    """
    if not _shared_append_page_map:
        return
    _shared_append_page_map(output_dir, chunk_id, groq_raw, logger=_logger)


def extract_last_page(chunk_text: str) -> str:
    """
    Extract the last page block using '== EXTRACT PAGE' markers.
    If no marker exists, return full text stripped.
    """
    if not chunk_text:
        return ""
    marker = "== EXTRACT PAGE"
    if marker not in chunk_text:
        return chunk_text.strip()
    parts = chunk_text.split(marker)
    last_block = parts[-1].strip()
    return f"{marker}{last_block}".strip()


def merge_with_previous_chunk_context(
    current_chunk_text: str,
    previous_chunk_text: str = None,
    max_chars: int = 4000
) -> str:
    """
    Prepend previous chunk's last page to current chunk for cross-chunk context.
    """
    if not previous_chunk_text:
        return current_chunk_text

    older_content = extract_last_page(previous_chunk_text)
    if not older_content:
        return current_chunk_text

    trimmed_older = older_content[:max_chars]
    return (
        "OLDER CONTENT (Previous Chunk Last Page):\n"
        f"{trimmed_older}\n\n"
        "CURRENT CHUNK:\n"
        f"{current_chunk_text}"
    )


def extract_text_from_pdf(pdf_path: str) -> List[str]:
    """
    Extract text from PDF file page by page.
    Uses extraction.extraction module if available, otherwise uses fallback.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of strings, one per page
    """
    # ============================================================
    # USING EXTRACTION.PY MODULE FOR PDF EXTRACTION
    # ============================================================
    if extract_text_by_page:
        _logger.log(f"Using extraction.extraction module to extract PDF", "DEBUG")
        try:
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
            pages = extract_text_by_page(pdf_content)
            _logger.log(f"Extracted {len(pages)} pages using extraction module", "DEBUG")
            return pages
        except Exception as e:
            print(f"Error using extraction module: {e}")
            print(f"Falling back to PyPDF2 extraction")
            return _extract_text_fallback(pdf_path)
    else:
        _logger.log(f"extraction.extraction module not available, using fallback", "DEBUG")
        return _extract_text_fallback(pdf_path)


def _extract_text_fallback(pdf_path: str) -> List[str]:
    """
    Fallback text extraction using PyPDF2.
    Used if extraction.extraction module is not available.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of strings, one per page
    """
    # ============================================================
    # ORIGINAL PYPDF2 EXTRACTION (FALLBACK)
    # ============================================================
    try:
        import PyPDF2
    except ImportError:
        print("Error: PyPDF2 is required for fallback extraction. Install it with: pip install PyPDF2")
        sys.exit(1)
    
    pages = []
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            _logger.log(f"Extracting text from {total_pages} pages using PyPDF2...", "DEBUG")
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                pages.append(text)
                _logger.log(f"  Extracted page {page_num + 1}/{total_pages}", "DEBUG")
                
    except Exception as e:
        print(f"Error reading PDF: {e}")
        sys.exit(1)
        
    return pages


def find_pii_values(
    chunk_text: str,
    groq_prompt: str = None,
    use_groq: bool = False,
    previous_chunk_text: str = None,
    output_dir: Path = None,
    chunk_id: int = None,
) -> Dict:
    """
    Find PII values in chunk text using either dummy data or Groq API.
    
    Args:
        chunk_text: Text to analyze
        groq_prompt: Prompt for Groq API (required if use_groq=True)
        use_groq: If True, use Groq API; if False, use dummy values
        
    Returns:
        Dictionary in Groq format with keys: names, hospitals, addresses, dobs, etc.
    """
    
    global _PERSON_ENTITIES
    if use_groq and generate_json_from_groq and groq_prompt:
        # Use Groq API
        _logger.log(f"Using Groq API to detect PII", "DEBUG")
        try:
            merged_input = merge_with_previous_chunk_context(
                chunk_text,
                previous_chunk_text,
                4000
            )
            groq_response = generate_json_from_groq(groq_prompt, merged_input)
            raw_keys = list(groq_response.keys()) if isinstance(groq_response, dict) else []
            _logger.log(f"[Groq Debug] Raw top-level keys: {raw_keys}", "INFO")
            if output_dir and chunk_id:
                _append_page_map(output_dir, chunk_id, groq_response)
            # Normalize once so all downstream code receives a stable pii.json-compatible shape.
            groq_response = _normalize_pii_dict(groq_response)
            normalized_keys = list(groq_response.keys()) if isinstance(groq_response, dict) else []
            _logger.log(f"[Groq Debug] Normalized PII keys: {normalized_keys}", "INFO")
            total_pii = sum(len(v) if isinstance(v, list) else 0 for v in groq_response.values())
            _logger.log(f"Groq detected {total_pii} PII values", "DEBUG")
            # Update canonical person entities for consistent mapping across chunks
            if merge_person_entities and "Person Name" in groq_response:
                _PERSON_ENTITIES = merge_person_entities(
                    groq_response.get("Person Name", []),
                    _PERSON_ENTITIES
                )
            return groq_response
        except Exception as e:
            print(f"Warning: Groq PII detection failed: {e}. Falling back to dummy values.", file=sys.stderr)
            return _get_dummy_pii()
    else:
        # Use dummy values
        _logger.log(f"Using dummy PII values", "DEBUG")
        pii_result = _get_dummy_pii()
        if merge_person_entities and "Person Name" in pii_result:
            _PERSON_ENTITIES = merge_person_entities(
                pii_result.get("Person Name", []),
                _PERSON_ENTITIES
            )
        return pii_result


def _get_dummy_pii() -> Dict:
    """
    Return dummy PII values matching pii2.json format.

    Format: keys are human-readable PII types (e.g. 'Person Name', 'Email', 'Phone', etc.)
    and values are lists of detected values for that type.
    """
    return {
        "Person Name": ["Thomas Smith", "John Doe"],
        "Hospital": ["County General Hospital", "St. Mary's Medical Center"],
        "Address": ["42703 Monroe Avenue", "123 Main Street"],
        "DOB": ["1992-07-21", "1985-03-15"],
        "Email": ["john.doe@example.com", "thomas.smith@test.com"],
        "Phone": ["555-123-4567", "555-987-6543"],
        "SSN": ["123-45-6789", "987-65-4321"]
    }


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


def save_pii_to_json(pii_dict: Dict, chunk_file_path: Path, output_dir: Path) -> Path:
    """
    Save detected PII to JSON file in pii.json format (grouped by type).
    
    Args:
        pii_dict: Dictionary of detected PII with keys: Person Name, Email, Phone, etc.
        chunk_file_path: Path to the chunk file
        output_dir: Output directory
        
    Returns:
        Path to saved PII JSON file
    """
    # Generate PII filename by replacing .txt with _pii.json
    chunk_name = chunk_file_path.stem  # e.g., 'chunk_0001'
    pii_file = output_dir / "chunks" / f"{chunk_name}_pii.json"
    
    # Apply normalization before saving PII JSON
    normalized_pii = _normalize_pii_dict(pii_dict)
    _logger.log(
        f"[Groq Debug] Writing {pii_file.name} with PII keys: {list(normalized_pii.keys())}",
        "INFO",
    )
    
    # Save PII data with normalization
    with open(pii_file, 'w', encoding='utf-8') as f:
        json.dump(normalized_pii, f, indent=2)
    
    _logger.log(f"  Saved PII data to: {pii_file.name}", "DEBUG")
    return pii_file


def sanitize_chunk_with_pii(chunk_text: str, chunk_file_path: Path, pii_dict: Dict,
                             replacer: object, output_dir: Path) -> Tuple[str, Dict]:
    """
    Sanitize chunk by replacing PII values with dummies.
    
    Args:
        chunk_text: Original chunk text
        chunk_file_path: Path where chunk is saved
        pii_dict: Dictionary of detected PII values in Groq format
        replacer: PIIReplacer instance with persistent mappings
        output_dir: Output directory
        
    Returns:
        Tuple of (sanitized_text, metadata_dict)
    """
    if not replacer or not pii_dict:
        return chunk_text, {}

    # Always normalize input so replacement receives pii-type -> list shape.
    pii_dict = _normalize_pii_dict(pii_dict)

    # Pre-seed person-name mappings using canonical matching against existing mapping.
    if replacer and "Person Name" in pii_dict:
        _reuse_person_dummies(replacer, pii_dict.get("Person Name", []))
    
    # Ensure Person Name aliases map to a consistent dummy across chunks.
    if replacer and pii_dict and "Person Name" in pii_dict:
        if merge_person_entities:
            global _PERSON_ENTITIES
            _PERSON_ENTITIES = merge_person_entities(
                pii_dict.get("Person Name", []),
                _PERSON_ENTITIES
            )
        _prime_person_alias_mappings(replacer, pii_dict.get("Person Name", []))

    # Replace PII values in text
    sanitized_text, metadata = replacer.replace_pii_in_text(chunk_text, pii_dict)
    
    # Save sanitized chunk with _s suffix
    chunk_stem = chunk_file_path.stem  # e.g., 'chunk_0001'
    sanitized_file = output_dir / "chunks" / f"{chunk_stem}_s.txt"
    
    with open(sanitized_file, 'w', encoding='utf-8') as f:
        f.write(sanitized_text)
    
    _logger.log(f"  Saved sanitized chunk to: {sanitized_file.name}", "DEBUG")
    
    # Update global mapping file after each chunk
    mapping_file = output_dir / "pii_mapping.json"
    _save_mapping_file(replacer, mapping_file)
    
    return sanitized_text, metadata


def _prime_person_alias_mappings(replacer: object, person_names: List[str]) -> None:
    """
    Prime dummy mappings so that aliases resolve to the same dummy value.
    Relies on canonical entities from earlier chunks (if available).
    """
    if not resolve_entity_key or not person_names:
        return

    if assign_dummies_to_canonicals:
        dummy_pool = []
        if getattr(replacer, "dummy_values", None):
            dummy_pool = replacer.dummy_values.get("Person Name", [])
        assign_dummies_to_canonicals(_PERSON_ENTITY_DUMMIES, _PERSON_ENTITIES, dummy_pool)

    for raw_name in person_names:
        lookup_name = _normalize_name(raw_name) if _normalize_name else raw_name
        entity_key = resolve_entity_key(lookup_name, _PERSON_ENTITIES)
        if not entity_key:
            continue

        # Assign a stable dummy per canonical entity.
        dummy = _PERSON_ENTITY_DUMMIES.get(entity_key)
        if not dummy:
            dummy = replacer._get_next_dummy("Person Name")
            _PERSON_ENTITY_DUMMIES[entity_key] = dummy

        # Bind this alias to the canonical dummy (don't override existing mappings).
        if raw_name in replacer.pii_mapping:
            continue
        replacer.pii_mapping[raw_name] = dummy
        if dummy not in replacer.pii_to_original:
            replacer.pii_to_original[dummy] = raw_name
        replacer.pii_type_mapping[raw_name] = "Person Name"


def _canonical_person_name(name: str) -> str:
    """
    Canonicalize a person name: remove credentials/parentheticals, punctuation,
    reorder comma-form to first-last, collapse whitespace, lowercase.
    """
    if not name:
        return ""
    text = unicodedata.normalize("NFKC", name)
    # Remove parenthetical segments entirely.
    text = re.sub(r"\(.*?\)", " ", text)
    # Replace commas with space to separate last/first.
    comma_present = "," in text
    text = text.replace(",", " ")
    # Drop periods for credential tokens.
    text = text.replace(".", " ")
    # Tokenize alphanumerics.
    tokens = re.findall(r"[A-Za-z0-9]+", text.lower())
    # Remove credential tokens.
    tokens = [t for t in tokens if t not in _CREDENTIAL_TOKENS]
    if not tokens:
        return ""
    if comma_present and len(tokens) >= 2:
        # Reorder Last, First ... -> First ... Last
        tokens = tokens[1:] + tokens[:1]
    return " ".join(tokens)


def _reuse_person_dummies(replacer: object, detected_names: List[str]) -> None:
    """Seed replacer mappings so detected variants reuse existing dummies."""
    # Build canonical -> dummy from existing mapping
    canonical_index: Dict[str, str] = {}
    for original, dummy in replacer.pii_mapping.items():
        if replacer.pii_type_mapping.get(original, "").lower() != "person name":
            continue
        canon = _canonical_person_name(original)
        if canon and canon not in canonical_index:
            canonical_index[canon] = dummy

    for raw in detected_names:
        if not raw or raw in replacer.pii_mapping:
            continue
        canon = _canonical_person_name(raw)
        if not canon:
            continue
        dummy = canonical_index.get(canon)
        if not dummy:
            continue
        replacer.pii_mapping[raw] = dummy
        replacer.pii_type_mapping[raw] = "Person Name"
        if dummy not in replacer.pii_to_original:
            replacer.pii_to_original[dummy] = raw


def _save_mapping_file(replacer: object, mapping_file: Path):
    """
    Save current PII mappings to file.
    
    Args:
        replacer: PIIReplacer instance
        mapping_file: Path to save mapping JSON
    """
    # Create comprehensive mapping with original -> dummy and type info
    pii_mappings = {}
    for original_pii, dummy_value in replacer.pii_mapping.items():
        pii_type = replacer.pii_type_mapping.get(original_pii, 'UNKNOWN')
        pii_mappings[original_pii] = {
            'dummy': dummy_value,
            'type': pii_type
        }
    
    mapping_data = {
        'pii_mappings': pii_mappings,
        'dummy_to_original': replacer.pii_to_original,
        'pii_types': replacer.pii_type_mapping,
        'total_mappings': len(pii_mappings),
        'timestamp': datetime.now().isoformat()
    }
    
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, indent=2)


def create_output_directory(pdf_filename: str) -> Path:
    """
    Create output directory with naming convention:
    first 20 characters of filename + 4-digit timestamp suffix

    Args:
        pdf_filename: Name of the PDF file

    Returns:
        Path object of the created directory
    """
    # Extract base name without extension
    base_name = Path(pdf_filename).stem

    # Take first 20 characters (or less if name is shorter)
    prefix = base_name[:20]

    # Create 4-digit timestamp suffix (last 4 digits of timestamp)
    timestamp = datetime.now().strftime("%H%M")

    # Create directory name
    dir_name = f"{prefix}_{timestamp}"
    output_dir = Path(dir_name)

    # Create main directory and subdirectories
    output_dir.mkdir(exist_ok=True)
    (output_dir / "rawpages").mkdir(exist_ok=True)
    (output_dir / "chunks").mkdir(exist_ok=True)

    _logger.log(f"\nCreated output directory: {output_dir}", "DEBUG")
    return output_dir


def save_raw_pages(pages: List[str], output_dir: Path) -> List[str]:
    """
    Save each page's raw text to individual files with page markers.
    
    Args:
        pages: List of page texts
        output_dir: Base output directory
        
    Returns:
        List of pages with markers added
    """
    rawpages_dir = output_dir / "rawpages"
    _logger.log(f"\nSaving {len(pages)} raw pages...", "DEBUG")
    
    marked_pages = []
    for i, page_text in enumerate(pages, 1):
        # Add page marker at the beginning
        marked_text = f"== EXTRACT PAGE {i} ==\n\n{page_text}"
        marked_pages.append(marked_text)
        
        page_file = rawpages_dir / f"page_{i:04d}.txt"
        with open(page_file, 'w', encoding='utf-8') as f:
            f.write(marked_text)
    
    _logger.log(f"  Saved to {rawpages_dir}", "DEBUG")
    return marked_pages


def create_chunks(pages: List[str], chunk_size: int, output_dir: Path) -> List[Dict]:
    """
    Create chunks from pages and save them.
    
    Args:
        pages: List of page texts
        chunk_size: Number of pages per chunk
        output_dir: Base output directory
        
    Returns:
        List of chunk information dictionaries
    """
    chunks_dir = output_dir / "chunks"
    chunk_info = []
    
    total_chunks = (len(pages) + chunk_size - 1) // chunk_size
    _logger.log(f"\nCreating {total_chunks} chunks (chunk size: {chunk_size} pages)...", "DEBUG")
    
    for chunk_num in range(0, len(pages), chunk_size):
        chunk_pages = pages[chunk_num:chunk_num + chunk_size]
        chunk_text = "\n\n".join(chunk_pages)
        
        chunk_id = (chunk_num // chunk_size) + 1
        chunk_file = chunks_dir / f"chunk_{chunk_id:04d}.txt"
        
        with open(chunk_file, 'w', encoding='utf-8') as f:
            f.write(chunk_text)
        
        # Store chunk information
        info = {
            'chunk_id': chunk_id,
            'start_page': chunk_num + 1,
            'end_page': min(chunk_num + chunk_size, len(pages)),
            'num_pages': len(chunk_pages),
            'file': str(chunk_file.resolve())
        }
        chunk_info.append(info)
        
        _logger.log(f"  Created chunk {chunk_id}: pages {info['start_page']}-{info['end_page']}", "DEBUG")
    
    return chunk_info


def get_metadata(chunk_text: str, chunk_info: Dict) -> Dict:
    """
    Generate metadata for a chunk.
    
    Args:
        chunk_text: Text content of the chunk
        chunk_info: Basic information about the chunk
        
    Returns:
        Dictionary containing metadata
    """
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
    
    return metadata


def process_chunks_with_metadata(pages: List[str], chunk_size: int, 
                                 output_dir: Path, replacer: object = None,
                                 groq_prompt: str = None, use_groq: bool = False,
                                 start_chunk: int = 1, num_chunks: int = None) -> None:
    """
    Create chunks and generate metadata for each.
    Includes PII detection, saving, and sanitization.
    
    Args:
        pages: List of page texts
        chunk_size: Number of pages per chunk
        output_dir: Base output directory
        replacer: Optional PIIReplacer instance for PII sanitization
        groq_prompt: Prompt for Groq API (if use_groq=True)
        use_groq: If True, use Groq for PII detection; if False, use dummy values
        start_chunk: Starting chunk number (1-indexed, default: 1)
        num_chunks: Number of chunks to process (default: all)
    """
    chunks_dir = output_dir / "chunks"
    metadata_file = output_dir / "metadata.json"
    all_metadata = []
    
    total_chunks = (len(pages) + chunk_size - 1) // chunk_size
    
    # Calculate which chunks to process
    end_chunk = start_chunk + (num_chunks - 1) if num_chunks else total_chunks
    end_chunk = min(end_chunk, total_chunks)
    chunks_to_process = end_chunk - start_chunk + 1
    
    _logger.log(f"\nProcessing chunks {start_chunk}-{end_chunk} of {total_chunks} with metadata and PII handling...", "DEBUG")
    previous_chunk_text = None
    
    for chunk_num in range(0, len(pages), chunk_size):
        chunk_id = (chunk_num // chunk_size) + 1
        
        # Skip chunks outside the specified range
        if chunk_id < start_chunk or chunk_id > end_chunk:
            continue
        
        chunk_pages = pages[chunk_num:chunk_num + chunk_size]
        chunk_text = "\n\n".join(chunk_pages)
        
        chunk_file = chunks_dir / f"chunk_{chunk_id:04d}.txt"
        
        _logger.log(f"\n  Chunk {chunk_id}: pages {chunk_num + 1}-{min(chunk_num + chunk_size, len(pages))}", "DEBUG")
        
        # Step 1: Save original chunk
        with open(chunk_file, 'w', encoding='utf-8') as f:
            f.write(chunk_text)
        _logger.log(f"    Saved original chunk", "DEBUG")
        
        # Step 2: Find PII values in chunk using Groq or dummy
        pii_dict = find_pii_values(
            chunk_text,
            groq_prompt,
            use_groq,
            previous_chunk_text,
            output_dir,
            chunk_id,
        )
        total_pii = sum(len(v) if isinstance(v, list) else 0 for v in pii_dict.values())
        _logger.log(f"    Found {total_pii} PII values", "DEBUG")
        
        # Step 3: Save PII to JSON file
        save_pii_to_json(pii_dict, chunk_file, output_dir)
        
        # Step 4: Sanitize chunk if replacer available
        if replacer and pii_dict:
            sanitized_text, pii_metadata = sanitize_chunk_with_pii(chunk_text, chunk_file, pii_dict, replacer, output_dir)
        
        # Step 5: Create chunk info and metadata
        chunk_info = {
            'chunk_id': chunk_id,
            'start_page': chunk_num + 1,
            'end_page': min(chunk_num + chunk_size, len(pages)),
            'num_pages': len(chunk_pages),
            'file': str(chunk_file.name)
        }
        
        # Get metadata for this chunk
        metadata = get_metadata(chunk_text, chunk_info)
        all_metadata.append(metadata)
        previous_chunk_text = chunk_text
        
        _logger.log(f"    Processed chunk {chunk_id}", "DEBUG")
    
    # Save all metadata to a single file
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, indent=2)
    
    _logger.log(f"\nMetadata saved to: {metadata_file}", "DEBUG")


def load_config_file(config_file: str) -> dict:
    """
    Load configuration from JSON file.
    
    Args:
        config_file: Path to config JSON file
        
    Returns:
        Dictionary with configuration values
    """
    if not os.path.exists(config_file):
        print(f"Error: Config file '{config_file}' not found.")
        sys.exit(1)
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        print(f"Loaded configuration from: {config_file}")
        return config
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in config file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading config file: {e}")
        sys.exit(1)


def main():
    """Main pipeline function."""
    parser = argparse.ArgumentParser(
        description='Process PDF file: extract text, create chunks, detect PII, and generate metadata.'
    )
    parser.add_argument('pdf_file', help='Path to the PDF file')
    parser.add_argument('chunk_size', type=int, help='Number of pages per chunk')
    parser.add_argument('--conf', default=None, help='Path to config file (JSON) containing argument values')
    parser.add_argument('--pii-json', default='pii.json', help='Path to PII definitions JSON (default: pii.json)')
    parser.add_argument('--dummy-json', default='dummy_values.json', help='Path to dummy values JSON (default: dummy_values.json)')
    parser.add_argument('--mapping-json', default=None, help='Optional existing PII mapping file for consistency')
    parser.add_argument('--pii-preserve-structure', action='store_true', help='Preserve PII mapping structure across chunks')
    parser.add_argument('--use-groq', action='store_true', help='Use Groq API for PII detection instead of dummy values')
    parser.add_argument('--groq-prompt', default='groq_prompt.txt', help='Path to Groq prompt file (default: groq_prompt.txt)')
    parser.add_argument('--start-chunk', type=int, default=1, help='Starting chunk number (default: 1)')
    parser.add_argument('--num-chunks', type=int, default=None, help='Number of chunks to process (default: all)')
    parser.add_argument('--log', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], help='Log level (default: INFO)')
    # ============================================================
    # DATABASE OPERATION ARGUMENTS
    # ============================================================
    parser.add_argument('--task-id', default=None, help='Task ID for database operations (optional)')
    parser.add_argument('--job-id', default=None, help='Job ID for database operations (optional)')
    parser.add_argument('--use-db', action='store_true', help='Enable database operations using tasks_repository')
    
    args = parser.parse_args()
    
    # Load config file if provided
    config = {}
    if args.conf:
        config = load_config_file(args.conf)
    
    # Apply config values to arguments (command-line args override config file)
    # Only apply config values if the command-line arg is at its default value
    if args.pii_json == 'pii.json' and 'pii_json' in config:
        args.pii_json = config['pii_json']
    
    if args.dummy_json == 'dummy_values.json' and 'dummy_json' in config:
        args.dummy_json = config['dummy_json']
    
    if args.mapping_json is None and 'mapping_json' in config:
        args.mapping_json = config['mapping_json']
    
    if not args.pii_preserve_structure and 'pii_preserve_structure' in config:
        args.pii_preserve_structure = config['pii_preserve_structure']
    
    if not args.use_groq and 'use_groq' in config:
        args.use_groq = config['use_groq']
    
    if args.groq_prompt == 'groq_prompt.txt' and 'groq_prompt' in config:
        args.groq_prompt = config['groq_prompt']
    
    if args.log == 'INFO' and 'log' in config:
        args.log = config['log']
    
    # ============================================================
    # LOAD DB CONFIGURATION FROM CONFIG FILE (NEW)
    # ============================================================
    if args.task_id is None and 'task_id' in config:
        args.task_id = config['task_id']
    
    if args.job_id is None and 'job_id' in config:
        args.job_id = config['job_id']
    
    if not args.use_db and 'use_db' in config:
        args.use_db = config['use_db']
    
    # Set global logger level based on argument
    global _logger
    _logger = Logger(args.log)
    
    # Validate inputs
    if not os.path.exists(args.pdf_file):
        print(f"Error: File '{args.pdf_file}' not found.")
        sys.exit(1)
    
    if args.chunk_size < 1:
        print("Error: Chunk size must be at least 1.")
        sys.exit(1)
    
    # Load Groq prompt if using Groq
    groq_prompt = None
    if args.use_groq:
        if not os.path.exists(args.groq_prompt):
            print(f"Error: Groq prompt file '{args.groq_prompt}' not found.")
            sys.exit(1)
        try:
            with open(args.groq_prompt, 'r', encoding='utf-8') as f:
                groq_prompt = f.read().strip()
            print(f"Loaded Groq prompt from: {args.groq_prompt}")
        except Exception as e:
            print(f"Error loading Groq prompt: {e}")
            sys.exit(1)
    
    print(f"PDF Processing Pipeline with PII Handling")
    print(f"=" * 60)
    print(f"Input file: {args.pdf_file}")
    print(f"Chunk size: {args.chunk_size} pages")
    print(f"PII preserve structure: {args.pii_preserve_structure}")
    print(f"Use Groq for PII detection: {args.use_groq}")
    print(f"Log level: {args.log}")
    
    # ============================================================
    # DATABASE OPERATIONS - MARK TASK/JOB IN PROGRESS (NEW)
    # ============================================================
    if args.use_db:
        print(f"\nDatabase operations enabled")
        print(f"  Task ID: {args.task_id}")
        print(f"  Job ID: {args.job_id}")
        
        # If task_id provided, mark task as in progress
        if args.task_id and mark_task_in_progress:
            try:
                import os
                pid = os.getpid()
                mark_task_in_progress(args.task_id, pid)
                _logger.log(f"Marked task {args.task_id} as in_progress (PID: {pid})", "INFO")
                print(f"  ✓ Task marked as in_progress")
            except Exception as e:
                print(f"  Warning: Failed to mark task as in_progress: {e}")
        
        # If job_id provided, mark job as in progress
        if args.job_id and mark_job_in_progress:
            try:
                mark_job_in_progress(args.job_id)
                _logger.log(f"Marked job {args.job_id} as in_progress", "INFO")
                print(f"  ✓ Job marked as in_progress")
            except Exception as e:
                print(f"  Warning: Failed to mark job as in_progress: {e}")
    
    # Step 1: Extract text from PDF
    pages = extract_text_from_pdf(args.pdf_file)
    
    # Step 2: Create output directory structure
    output_dir = create_output_directory(args.pdf_file)
    
    # Step 3: Initialize PIIReplacer if PII processing is enabled and files exist
    replacer = None
    if os.path.exists(args.dummy_json):
        try:
            print(f"\nInitializing PII handling...")
            replacer = PIIReplacer(args.dummy_json, args.mapping_json if args.pii_preserve_structure else None)
            print(f"PII handler initialized")
            if args.pii_preserve_structure and args.mapping_json:
                print(f"   Using existing mappings from: {args.mapping_json}")
        except Exception as e:
            print(f"Warning: Failed to initialize PII handler: {e}")
            replacer = None
    else:
        print(f"\nDummy values file not found: {args.dummy_json}")
        print(f"   PII replacement will be skipped")
    
    
    # Step 4: Save raw pages (with markers added)
    marked_pages = save_raw_pages(pages, output_dir)
    
    # Step 5: Create chunks with PII processing
    process_chunks_with_metadata(marked_pages, args.chunk_size, output_dir, replacer, groq_prompt, args.use_groq, args.start_chunk, args.num_chunks)
    
    print(f"\n{'=' * 60}")
    print(f"Pipeline completed successfully!")
    print(f"{'=' * 60}")
    print(f"Output directory: {output_dir}")
    print(f"Total pages: {len(pages)}")
    print(f"Total chunks: {(len(pages) + args.chunk_size - 1) // args.chunk_size}")
    print(f"\nGenerated files:")
    print(f"  • Original chunks: chunks/chunk_XXXX.txt")
    print(f"  • Sanitized chunks: chunks/chunk_XXXX_s.txt")
    print(f"  • PII data: chunks/chunk_XXXX_pii.json")
    print(f"  • Mapping: pii_mapping.json")
    print(f"  • Metadata: metadata.json")
    print(f"  • Raw pages: rawpages/page_XXXX.txt")
    
    # ============================================================
    # DATABASE OPERATIONS - MARK TASK/JOB COMPLETED (NEW)
    # ============================================================
    if args.use_db:
        total_chunks = (len(pages) + args.chunk_size - 1) // args.chunk_size
        
        # If task_id provided, mark task as completed
        if args.task_id and mark_task_completed:
            try:
                mark_task_completed(args.task_id, str(output_dir), len(pages), args.job_id or "")
                _logger.log(f"Marked task {args.task_id} as completed", "INFO")
                print(f"\n  ✓ Task marked as completed")
            except Exception as e:
                print(f"  Warning: Failed to mark task as completed: {e}")
        
        # If job_id provided, check and update job status
        if args.job_id and check_and_update_job_status:
            try:
                check_and_update_job_status(args.job_id)
                _logger.log(f"Checked and updated job {args.job_id} status", "INFO")
                print(f"  ✓ Job status checked and updated")
            except Exception as e:
                print(f"  Warning: Failed to check job status: {e}")
    
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()
