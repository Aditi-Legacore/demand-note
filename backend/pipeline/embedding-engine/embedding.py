"""
Embedding Engine

Builds semantic chunks from extracted raw pages, generates embeddings with
`all-MiniLM-L6-v2`, and stores vectors in ChromaDB.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

try:
    import chromadb
except Exception:
    chromadb = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


@dataclass
class ChunkRecord:
    chunk_id: str
    text: str
    token_count: int
    metadata: Dict[str, Any]


class EmbeddingEngine:
    """End-to-end semantic chunking and embedding pipeline."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        chroma_path: str = "./chroma_store",
        default_collection_name: str = "document_embeddings",
        log_func: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers is not installed. Run: pip install sentence-transformers")
        if chromadb is None:
            raise ImportError("chromadb is not installed. Run: pip install chromadb")

        self.model_name = model_name
        self.chroma_path = chroma_path
        self.default_collection_name = default_collection_name
        self._log_func = log_func

        self._log(f"Loading embedding model: {model_name}")
        self.embedding_model = SentenceTransformer(model_name)

        self._log(f"Connecting ChromaDB at: {chroma_path}")
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)

    def _log(self, message: str, level: str = "INFO") -> None:
        if self._log_func:
            self._log_func(message, level)
        else:
            print(f"[{level}] {message}")

    def _get_or_create_collection(self, collection_name: Optional[str] = None):
        target_name = collection_name or self.default_collection_name
        return self.chroma_client.get_or_create_collection(name=target_name)

    def load_pages_from_output_directory(self, output_dir: str) -> List[Dict[str, Any]]:
        """
        Read extracted pages from:
            <output_dir>/rawpages/page_####.txt
        """
        base_dir = Path(output_dir)
        rawpages_dir = base_dir / "rawpages"
        if not rawpages_dir.exists():
            raise FileNotFoundError(f"Raw pages directory not found: {rawpages_dir}")

        page_files = sorted(rawpages_dir.glob("page_*.txt"))
        pages: List[Dict[str, Any]] = []
        for page_file in page_files:
            raw_text = page_file.read_text(encoding="utf-8").strip()
            page_number = self._extract_page_number(page_file.name, raw_text)
            clean_text = re.sub(r"^==\s*EXTRACT PAGE\s+\d+\s*==\s*", "", raw_text, flags=re.IGNORECASE).strip()
            pages.append(
                {
                    "page_number": page_number,
                    "text": clean_text,
                    "section": self._infer_section_from_text(clean_text),
                }
            )

        self._log(f"Loaded {len(pages)} extracted pages from {rawpages_dir}")
        return pages

    def _extract_page_number(self, filename: str, text: str) -> Optional[int]:
        marker_match = re.search(r"==\s*EXTRACT PAGE\s+(\d+)\s*==", text, flags=re.IGNORECASE)
        if marker_match:
            return int(marker_match.group(1))

        file_match = re.search(r"page_(\d+)\.txt$", filename, flags=re.IGNORECASE)
        if file_match:
            return int(file_match.group(1))
        return None

    def _infer_section_from_text(self, text: str) -> str:
        # Lightweight section guesser: short uppercase/title-like first line.
        first_line = text.splitlines()[0].strip() if text else ""
        if 2 <= len(first_line.split()) <= 12 and len(first_line) <= 90:
            return first_line
        return "Unknown"

    def create_semantic_chunks(
        self,
        pages: List[Dict[str, Any]],
        source_filename: str,
        document_type: str,
        creation_date: str,
        chunk_min_tokens: int = 500,
        chunk_max_tokens: int = 1500,
        overlap_ratio: float = 0.15,
    ) -> List[ChunkRecord]:
        if not 0 < overlap_ratio < 1:
            raise ValueError("overlap_ratio must be between 0 and 1.")
        if chunk_min_tokens <= 0 or chunk_max_tokens <= 0:
            raise ValueError("chunk token limits must be positive.")
        if chunk_min_tokens > chunk_max_tokens:
            raise ValueError("chunk_min_tokens cannot be greater than chunk_max_tokens.")

        semantic_units: List[Dict[str, Any]] = []
        for page in pages:
            page_number = page.get("page_number")
            section_name = page.get("section") or page.get("chapter") or "Unknown"
            page_text = (page.get("text") or "").strip()
            if not page_text:
                continue

            for unit in self._split_into_semantic_units_with_offsets(page_text):
                semantic_units.append(
                    {
                        "text": unit["text"],
                        "tokens": self._estimate_token_count(unit["text"]),
                        "page_number": page_number,
                        "section": section_name,
                        "page_start_char": unit["page_start_char"],
                        "page_end_char": unit["page_end_char"],
                    }
                )

        chunks = self._assemble_overlapping_chunks(
            semantic_units=semantic_units,
            source_filename=source_filename,
            document_type=document_type,
            creation_date=creation_date,
            chunk_min_tokens=chunk_min_tokens,
            chunk_max_tokens=chunk_max_tokens,
            overlap_ratio=overlap_ratio,
        )
        self._log(f"Created {len(chunks)} semantic chunks")
        return chunks

    def _split_into_semantic_units_with_offsets(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into semantic units and keep character offsets in page text.
        Offsets are based on the cleaned page text (marker removed).
        """
        units: List[Dict[str, Any]] = []
        for match in re.finditer(r"\S[\s\S]*?(?=(?:\n\s*\n)|\Z)", text):
            block_text = match.group(0).strip()
            if not block_text:
                continue

            block_start = match.start()
            raw_block_end = match.end()
            block_end = block_start + len(match.group(0).rstrip())

            block_tokens = self._estimate_token_count(block_text)
            if block_tokens <= 1200:
                units.append(
                    {
                        "text": block_text,
                        "page_start_char": block_start,
                        "page_end_char": block_end,
                    }
                )
                continue

            # Large blocks are further split by sentence while preserving offsets.
            sentence_matches = list(re.finditer(r"[^.!?]+[.!?]?(?:\s+|$)", text[block_start:raw_block_end]))
            for sentence_match in sentence_matches:
                sentence_text = sentence_match.group(0).strip()
                if not sentence_text:
                    continue
                sentence_start = block_start + sentence_match.start()
                sentence_end = sentence_start + len(sentence_match.group(0).rstrip())
                units.append(
                    {
                        "text": sentence_text,
                        "page_start_char": sentence_start,
                        "page_end_char": sentence_end,
                    }
                )
        return units

    def _assemble_overlapping_chunks(
        self,
        semantic_units: List[Dict[str, Any]],
        source_filename: str,
        document_type: str,
        creation_date: str,
        chunk_min_tokens: int,
        chunk_max_tokens: int,
        overlap_ratio: float,
    ) -> List[ChunkRecord]:
        if not semantic_units:
            return []

        chunks: List[ChunkRecord] = []
        i = 0

        while i < len(semantic_units):
            current_units: List[Dict[str, Any]] = []
            current_tokens = 0
            j = i

            while j < len(semantic_units):
                next_tokens = semantic_units[j]["tokens"]
                if current_tokens + next_tokens > chunk_max_tokens and current_tokens >= chunk_min_tokens:
                    break
                current_units.append(semantic_units[j])
                current_tokens += next_tokens
                j += 1
                if current_tokens >= chunk_max_tokens:
                    break

            if not current_units:
                current_units.append(semantic_units[i])
                current_tokens = semantic_units[i]["tokens"]
                j = i + 1

            chunk_text_parts: List[str] = []
            chunk_unit_map: List[Dict[str, Any]] = []
            chunk_cursor = 0
            for unit_idx, unit in enumerate(current_units):
                unit_text = unit["text"]
                unit_start = chunk_cursor
                unit_end = unit_start + len(unit_text)
                chunk_unit_map.append(
                    {
                        "page_number": unit.get("page_number"),
                        "page_start_char": unit.get("page_start_char"),
                        "page_end_char": unit.get("page_end_char"),
                        "chunk_start_char": unit_start,
                        "chunk_end_char": unit_end,
                    }
                )
                chunk_text_parts.append(unit_text)
                chunk_cursor = unit_end
                if unit_idx < len(current_units) - 1:
                    chunk_cursor += 2  # separator "\n\n"

            chunk_text = "\n\n".join(chunk_text_parts)
            page_numbers = sorted({u["page_number"] for u in current_units if u.get("page_number") is not None})
            sections = sorted({u["section"] for u in current_units if u.get("section")})
            page_span_map = self._build_page_span_map(current_units)

            chunk_id = f"{source_filename}-{uuid.uuid4().hex}"
            chunks.append(
                ChunkRecord(
                    chunk_id=chunk_id,
                    text=chunk_text,
                    token_count=current_tokens,
                    metadata={
                        "source_filename": source_filename,
                        "page_number": page_numbers[0] if page_numbers else None,
                        "page_numbers": ",".join(str(p) for p in page_numbers),
                        "document_type": document_type,
                        "creation_date": creation_date,
                        "section_chapter": sections[0] if sections else "Unknown",
                        "all_sections": ",".join(sections),
                        "chunk_token_count": current_tokens,
                        "start_page": page_numbers[0] if page_numbers else None,
                        "end_page": page_numbers[-1] if page_numbers else None,
                        "page_spans_json": json.dumps(page_span_map, ensure_ascii=True),
                        "chunk_unit_map_json": json.dumps(chunk_unit_map, ensure_ascii=True),
                    },
                )
            )

            overlap_target = max(1, int(current_tokens * overlap_ratio))
            overlap_tokens = 0
            overlap_units_count = 0
            for unit in reversed(current_units):
                overlap_tokens += unit["tokens"]
                overlap_units_count += 1
                if overlap_tokens >= overlap_target:
                    break

            i = max(i + 1, j - overlap_units_count)

        return chunks

    def _build_page_span_map(self, units: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        spans: Dict[int, Dict[str, Any]] = {}
        for unit in units:
            page_number = unit.get("page_number")
            if page_number is None:
                continue

            start = int(unit.get("page_start_char", 0))
            end = int(unit.get("page_end_char", start))
            if page_number not in spans:
                spans[page_number] = {
                    "page_number": page_number,
                    "start_char": start,
                    "end_char": end,
                }
            else:
                spans[page_number]["start_char"] = min(spans[page_number]["start_char"], start)
                spans[page_number]["end_char"] = max(spans[page_number]["end_char"], end)

        return [spans[p] for p in sorted(spans.keys())]

    def _estimate_token_count(self, text: str) -> int:
        # Fast heuristic for chunk sizing; avoids tokenizer dependency at this stage.
        words = len(text.split())
        return max(1, int(words * 1.2))

    def save_embedding_chunks_to_directory(
        self,
        chunks: List[ChunkRecord],
        output_dir: str,
        subdirectory_name: str = "embedding_chunks",
    ) -> Path:
        """
        Save semantic chunks as text + metadata for traceability.
        """
        embedding_dir = Path(output_dir) / subdirectory_name
        embedding_dir.mkdir(parents=True, exist_ok=True)

        index_payload: List[Dict[str, Any]] = []
        for idx, chunk in enumerate(chunks, start=1):
            chunk_file = embedding_dir / f"embedding_chunk_{idx:04d}.txt"
            metadata_file = embedding_dir / f"embedding_chunk_{idx:04d}.metadata.json"
            chunk_file.write_text(chunk.text, encoding="utf-8")
            file_metadata = dict(chunk.metadata)
            for json_key in ("page_spans_json", "chunk_unit_map_json"):
                raw_value = file_metadata.get(json_key)
                if isinstance(raw_value, str):
                    try:
                        file_metadata[json_key.replace("_json", "")] = json.loads(raw_value)
                    except Exception:
                        pass
            metadata_file.write_text(json.dumps(file_metadata, indent=2), encoding="utf-8")
            index_payload.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "chunk_file": str(chunk_file),
                    "metadata_file": str(metadata_file),
                    "token_count": chunk.token_count,
                }
            )

        manifest_file = embedding_dir / "embedding_chunks_manifest.json"
        manifest_file.write_text(json.dumps(index_payload, indent=2), encoding="utf-8")
        self._log(f"Saved {len(chunks)} embedding chunks to {embedding_dir}")
        return embedding_dir

    def generate_chunk_embeddings(self, chunks: List[ChunkRecord]) -> List[List[float]]:
        if not chunks:
            return []
        texts = [chunk.text for chunk in chunks]
        self._log(f"Generating embeddings for {len(texts)} chunks")
        vectors = self.embedding_model.encode(texts, convert_to_numpy=True)
        return vectors.tolist()

    def store_embeddings_in_chroma(
        self,
        chunks: List[ChunkRecord],
        embeddings: List[List[float]],
        collection_name: Optional[str] = None,
    ) -> int:
        if len(chunks) != len(embeddings):
            raise ValueError("chunks and embeddings length mismatch.")
        if not chunks:
            return 0

        collection = self._get_or_create_collection(collection_name)
        collection.add(
            ids=[chunk.chunk_id for chunk in chunks],
            documents=[chunk.text for chunk in chunks],
            embeddings=embeddings,
            metadatas=[chunk.metadata for chunk in chunks],
        )
        self._log(f"Stored {len(chunks)} vectors in Chroma collection '{collection.name}'")
        return len(chunks)

    def run_embedding_pipeline_from_output_directory(
        self,
        output_dir: str,
        source_filename: str,
        document_type: Optional[str] = None,
        creation_date: Optional[str] = None,
        collection_name: Optional[str] = None,
        chunk_min_tokens: int = 500,
        chunk_max_tokens: int = 1500,
        overlap_ratio: float = 0.15,
        embedding_subdirectory: str = "embedding_chunks",
        **extra_metadata: Any,
    ) -> Dict[str, Any]:
        """
        End-to-end:
        - read extracted pages from output/rawpages
        - create semantic chunks with overlap
        - save chunks under output/embedding_chunks (for traceability)
        - generate embeddings and store to Chroma
        """
        resolved_doc_type = document_type or self._infer_document_type_from_filename(source_filename)
        resolved_creation_date = creation_date or datetime.now().date().isoformat()
        demand_note_id = extra_metadata.get("demand_note_id")

        pages = self.load_pages_from_output_directory(output_dir)
        chunks = self.create_semantic_chunks(
            pages=pages,
            source_filename=source_filename,
            document_type=resolved_doc_type,
            creation_date=resolved_creation_date,
            chunk_min_tokens=chunk_min_tokens,
            chunk_max_tokens=chunk_max_tokens,
            overlap_ratio=overlap_ratio,
        )

        # Attach optional caller-provided metadata to each chunk before persistence.
        if demand_note_id is not None:
            for chunk in chunks:
                chunk.metadata["demand_note_id"] = str(demand_note_id)

        chunks_dir = self.save_embedding_chunks_to_directory(
            chunks=chunks,
            output_dir=output_dir,
            subdirectory_name=embedding_subdirectory,
        )
        embeddings = self.generate_chunk_embeddings(chunks)
        vectors_stored = self.store_embeddings_in_chroma(
            chunks=chunks,
            embeddings=embeddings,
            collection_name=collection_name,
        )

        return {
            "output_directory": output_dir,
            "embedding_chunks_directory": str(chunks_dir),
            "chunks_created": len(chunks),
            "vectors_stored": vectors_stored,
            "collection_name": collection_name or self.default_collection_name,
            "model_name": self.model_name,
            "document_type": resolved_doc_type,
            "creation_date": resolved_creation_date,
            "demand_note_id": str(demand_note_id) if demand_note_id is not None else None,
        }

    def _infer_document_type_from_filename(self, source_filename: str) -> str:
        ext = Path(source_filename).suffix.lower()
        if ext == ".pdf":
            return "pdf"
        if ext in {".doc", ".docx"}:
            return "word"
        return "document"
