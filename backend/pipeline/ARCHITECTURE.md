# PDF Processing Pipeline Architecture

## What This System Does
This pipeline takes source PDFs, extracts text, detects and replaces PII, keeps mapping artifacts, and writes file-level outputs used for downstream summarization and database updates.

It supports two runtime entry patterns:
- `backend/pipeline/main.py` for job/task driven execution (DB-aware)
- `backend/pipeline/pii-handler/pdf_extract_chunks.py` for direct CLI processing

---

## End-to-End Flow
1. Job/task bootstrap (`main.py`)
- Reads `job_id`
- Creates tasks for unsummarized demand files
- Processes each demand file through `run_pipeline(...)`

2. Core pipeline orchestration (`pipeline.py`)
- Step 1: Fetch PDF bytes from DB and extract page text (`smart_extraction.py`)
- Step 2: Save raw pages + create chunk files
- Step 3: Detect PII per chunk (Groq or fallback dummy)
- Step 4: Replace PII in chunk text and persist mapping
- Step 5: Save metadata

3. Post-processing in `main.py` (testing hooks currently enabled)
- Combine sanitized chunk files into one file-level text (`combine_chunks.py`)
- Summarize combined text using active prompt from DB (`summerize.py`)
- Reverse-replace dummy values in summary back to originals (`reverse_replace_pii.py`)
- Save final summary text to `Task.outputSummary`

---

## Runtime Modules

## `backend/pipeline/main.py`
Purpose: Job-level orchestration and task state updates.

Key responsibilities:
- Task lifecycle transitions: pending -> in_progress -> completed/failed
- Calls `run_pipeline(...)` per demand file
- Runs optional post-processors:
  - `combine_sanitized_chunks(...)`
  - `summarize_output_dir_with_text(...)`
  - `restore_pii_in_text(...)`
- Writes summary text into DB via `mark_task_completed(..., output_summary=...)`

Notes:
- `SUMMARY_DOC_TYPE` env var can override summarization doc type.
- If not set, doc type is inferred from `page_map.json`.

## `backend/pipeline/pipeline.py`
Purpose: File-level 5-step processing orchestrator.

Step contracts:
- `step_1_extract_pdf(...) -> (pages: List[str], success: bool)`
- `step_2_create_chunks(...) -> (chunks_info: List[dict], success: bool, output_dir: Path)`
- `step_3_detect_pii(...) -> (pii_dict_by_chunk: Dict[int, Dict], success: bool)`
- `step_4_replace_pii(...) -> (success: bool, mapping_file_path: Optional[Path])`
- `step_5_save_metadata(...) -> (success: bool, metadata_path: Optional[Path])`

Returns from `run_pipeline(...)`:
- `success`, `output_directory`, `pages_extracted`, `chunks_created`, `pii_mappings`, `error`, `stages`

## `backend/pipeline/pii-handler/pdf_extract_chunks.py`
Purpose: Chunk file handling + Groq call adapter + sanitization integration.

Key behavior:
- Creates output folder structure (`rawpages/`, `chunks/`)
- Preserves chunk text markers
- For Groq input, prepends previous chunk’s last page (up to 4000 chars)
- Normalizes Groq response into replacement-safe PII shape
- Writes chunk-level outputs:
  - `chunk_XXXX.txt`
  - `chunk_XXXX_pii.json`
  - `chunk_XXXX_s.txt`
- Delegates page map updates to shared `page_map_builder.py`

## `backend/pipeline/extractor/smart_extraction.py`
Purpose: Adaptive text extraction from PDF pages.

Behavior:
- Native text extraction first
- OCR fallback paths when needed
- Returns page text for downstream chunking

## `backend/pipeline/pii-handler/replace_pii2.py`
Purpose: PII replacement engine.

Behavior:
- Maintains stable original<->dummy mappings
- Supports replacement from normalized PII dict/list inputs
- Exact replacement for most PII types
- Controlled token-based matching for selected types (bounded/safe)
- Writes mapping/report artifacts

## `backend/pipeline/pii-handler/page_map_builder.py`
Purpose: Shared page-map builder.

Behavior:
- Stores chunk-level page maps (`chunks/chunk_XXXX_page_map.json`)
- Rebuilds global `page_map.json` for the full file
- Current continuity rule: if `prev_page_continued == true`, continue same document

## `backend/pipeline/pii-handler/combine_chunks.py`
Purpose: Build a file-level sanitized text.

Behavior:
- Reads `chunks/chunk_XXXX_s.txt`
- Sorts by chunk number
- Writes one combined file in output root:
  - `sanitized_full.txt`

## `backend/pipeline/pii-handler/summerize.py`
Purpose: Summarization over combined sanitized text.

Behavior:
- Fetches active prompt from `Prompt` table by `doc_type`
- Calls Groq via `generate_json_from_groq(...)`
- Converts response into text output
- Writes `Summarized_text.txt`
- Exposes `summarize_output_dir_with_text(...)` to return `(path, summary_text)`

## `backend/pipeline/pii-handler/reverse_replace_pii.py`
Purpose: De-redaction (dummy -> original) on generated summary text.

Behavior:
- Loads `pii_mapping.json`
- Applies exact + safe flexible matching (bounded patterns)
- Produces restored summary string used before DB save

## `backend/pipeline/utils/tasks_repository.py`
Purpose: DB data access and status transitions for `Job`, `Task`, `DemandFile`.

Important current behavior:
- `create_tasks_for_job(...)` no longer populates `outputSummary` with dummy text.
- `mark_task_completed(...)` supports optional `output_summary` and persists it.

---

## Data Contracts

## PII contract used for replacement
Preferred normalized shape:
```json
{
  "Person Name": [],
  "Email": [],
  "Phone": [],
  "SSN": [],
  "Street Address": [],
  "City": [],
  "Zip": [],
  "Date of Birth": [],
  "Medical Record Number": [],
  "Hospital": [],
  "Insurance ID": []
}
```

The code also normalizes older/nested variants (for Groq compatibility), including `{"pii": {...}}` wrappers and legacy key names.

## Mapping contract (`pii_mapping.json`)
Includes:
- `pii_mappings`: original -> {dummy, type}
- `dummy_to_original`
- `pii_types`
- `total_mappings`

Used by reverse replacement and consistency across chunks.

## Page map contract
- Chunk-level: `chunks/chunk_XXXX_page_map.json`
- Global: `page_map.json` with:
  - `documents`
  - `pages`

---

## Output Layout Per Processed File
Given output folder: `frontend/<file_slug_timestamp>/`

Generated artifacts typically include:
- `rawpages/page_XXXX.txt`
- `chunks/chunk_XXXX.txt`
- `chunks/chunk_XXXX_pii.json`
- `chunks/chunk_XXXX_s.txt`
- `chunks/chunk_XXXX_page_map.json`
- `pii_mapping.json`
- `page_map.json`
- `metadata.json`
- `sanitized_full.txt`
- `Summarized_text.txt`

---

## Database Touchpoints

Tables involved:
- `Job`
- `Task`
- `DemandFile`
- `Prompt` (for active summarization prompt)

Typical write sequence per task:
1. Task created (`pending`)
2. Task marked `in_progress`
3. Pipeline output directory written to filesystem
4. Summary text generated/restored
5. Task marked `completed` with:
- `outputFilePath`
- `outputSummary`
- timestamps

---

## Configuration and Environment
Required:
- Database connectivity via `connect_db.py`
- `GROQ_API_KEY`

Useful optional:
- `SUMMARY_DOC_TYPE` (forces prompt doc type: e.g. `medical`, `traffic`, `demand_note`)

---

## Design Principles in Current Code
- Keep core extraction/sanitization deterministic and bounded.
- Normalize external model output before replacement logic.
- Preserve chunk-level artifacts for traceability.
- Keep database writes in orchestration/repository layers.
- Allow fallback behavior when optional modules fail (non-fatal warnings in main flow).

---

## Known Operational Notes
- Directory name `pii-handler` uses hyphen, so some modules are loaded by file path.
- `summerize.py` name is intentionally kept as-is to match current project usage.
- Main currently includes post-processing hooks (combine, summarize, reverse replace) for testing/iterative rollout.
