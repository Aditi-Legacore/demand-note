"""
Search Embeddings

Phase 3 (query time):
1. Accept user query text
2. Convert query text to embedding using the same model
3. Search ChromaDB and return top results with metadata
"""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

try:
    import chromadb
except Exception:
    chromadb = None

try:
    from sentence_transformers import SentenceTransformer, CrossEncoder
except Exception:
    SentenceTransformer = None
    CrossEncoder = None


class EmbeddingSearchEngine:
    """Query helper for semantic search on stored document embeddings."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        reranker_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        chroma_path: str = "./chroma_store",
        default_collection_name: str = "document_embeddings",
        log_func: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers is not installed. Run: pip install sentence-transformers")
        if chromadb is None:
            raise ImportError("chromadb is not installed. Run: pip install chromadb")

        self.model_name = model_name
        self.reranker_model_name = reranker_model_name
        self.default_collection_name = default_collection_name
        self._log_func = log_func

        self._log(f"Loading search embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.reranker = None
        if CrossEncoder is not None:
            try:
                self._log(f"Loading reranker model: {reranker_model_name}")
                self.reranker = CrossEncoder(reranker_model_name)
            except Exception as rerank_error:
                self._log(f"Reranker unavailable, falling back to fuzzy-only highlighting: {rerank_error}", "WARNING")

        self._log(f"Connecting to ChromaDB path: {chroma_path}")
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)

    def _log(self, message: str, level: str = "INFO") -> None:
        if self._log_func:
            self._log_func(message, level)
        else:
            print(f"[{level}] {message}")

    def _get_collection(self, collection_name: Optional[str] = None):
        target_name = collection_name or self.default_collection_name
        return self.chroma_client.get_or_create_collection(name=target_name)

    def format_document_for_user(self, raw_text: str) -> str:
        """
        Clean extracted text so users don't see OCR/file formatting artifacts.
        """
        if not raw_text:
            return ""

        text = raw_text.replace("\r", " ").replace("\n", " ")
        text = re.sub(r"[^\x20-\x7E]", " ", text)  # remove non-printable chars
        text = re.sub(r"\s+", " ", text).strip()   # collapse repeated whitespace
        return text

    def _find_query_span_in_chunk(
        self,
        chunk_text: str,
        user_query: str,
        min_similarity: float = 0.58,
        min_token_similarity: float = 0.7,
    ) -> Optional[Dict[str, Any]]:
        if not chunk_text or not user_query:
            return None

        query = user_query.strip()
        if not query:
            return None

        # Exact matching intentionally disabled to make fuzzy behavior primary.
        # direct_match = re.search(re.escape(query), chunk_text, flags=re.IGNORECASE)
        # if direct_match:
        #     return {
        #         "start_char": direct_match.start(),
        #         "end_char": direct_match.end(),
        #         "matched_text": chunk_text[direct_match.start():direct_match.end()],
        #         "match_type": "full_query",
        #     }
        #
        # tokens = [t for t in re.findall(r"[A-Za-z0-9]{3,}", query.lower())]
        # for token in tokens:
        #     token_match = re.search(rf"\b{re.escape(token)}\b", chunk_text, flags=re.IGNORECASE)
        #     if token_match:
        #         return {
        #             "start_char": token_match.start(),
        #             "end_char": token_match.end(),
        #             "matched_text": chunk_text[token_match.start():token_match.end()],
        #             "match_type": "query_token",
        #         }

        # Fuzzy fallback: compare query against token windows in chunk text.
        fuzzy_span = self._find_fuzzy_query_span(
            chunk_text,
            query,
            min_similarity=min_similarity,
            min_token_similarity=min_token_similarity,
        )
        if fuzzy_span:
            return fuzzy_span
        return None

    def _find_fuzzy_query_span(
        self,
        chunk_text: str,
        user_query: str,
        min_similarity: float = 0.58,
        min_token_similarity: float = 0.7,
    ) -> Optional[Dict[str, Any]]:
        query_tokens = re.findall(r"[A-Za-z0-9]+", user_query.lower())
        if not query_tokens:
            return None

        token_matches = list(re.finditer(r"[A-Za-z0-9]+", chunk_text))
        if not token_matches:
            return None

        query_len = len(query_tokens)
        min_window = max(1, int(query_len * 0.6))
        max_window = max(min_window, int(query_len * 1.5))
        normalized_query = " ".join(query_tokens)

        best_score = 0.0
        best_start = None
        best_end = None

        for start_idx in range(len(token_matches)):
            for win_size in range(min_window, max_window + 1):
                end_idx = start_idx + win_size
                if end_idx > len(token_matches):
                    break

                window_tokens = [
                    token_matches[idx].group(0).lower()
                    for idx in range(start_idx, end_idx)
                ]
                window_text = " ".join(window_tokens)
                score = SequenceMatcher(None, normalized_query, window_text).ratio()
                if score > best_score:
                    best_score = score
                    best_start = token_matches[start_idx].start()
                    best_end = token_matches[end_idx - 1].end()

        if best_start is None or best_end is None or best_score < min_similarity:
            # Fallback: fuzzy token-level match for OCR/noisy chunks.
            best_token_score = 0.0
            best_token_span = None
            query_token_set = set(query_tokens)
            for token_match in token_matches:
                token_text = token_match.group(0).lower()
                # Compare token against each query token and keep best.
                for q_token in query_token_set:
                    token_score = SequenceMatcher(None, q_token, token_text).ratio()
                    if token_score > best_token_score:
                        best_token_score = token_score
                        best_token_span = (token_match.start(), token_match.end())

            # Token-level acceptance threshold is intentionally slightly stricter.
            if best_token_span and best_token_score >= min_token_similarity:
                start_char, end_char = best_token_span
                return {
                    "start_char": start_char,
                    "end_char": end_char,
                    "matched_text": chunk_text[start_char:end_char],
                    "match_type": "fuzzy_query",
                }
            return None

        return {
            "start_char": best_start,
            "end_char": best_end,
            "matched_text": chunk_text[best_start:best_end],
            "match_type": "fuzzy_query",
        }

    def _load_json_metadata_field(self, metadata: Dict[str, Any], key: str) -> List[Dict[str, Any]]:
        raw = metadata.get(key)
        if not raw:
            return []
        if isinstance(raw, list):
            return raw
        if isinstance(raw, str):
            try:
                decoded = json.loads(raw)
                if isinstance(decoded, list):
                    return decoded
            except Exception:
                return []
        return []

    def _map_chunk_span_to_page_spans(
        self,
        chunk_span: Optional[Dict[str, Any]],
        chunk_unit_map: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not chunk_span:
            return []
        start_char = int(chunk_span["start_char"])
        end_char = int(chunk_span["end_char"])
        if end_char <= start_char:
            return []

        page_spans: List[Dict[str, Any]] = []
        for unit in chunk_unit_map:
            unit_chunk_start = int(unit.get("chunk_start_char", 0))
            unit_chunk_end = int(unit.get("chunk_end_char", 0))
            overlap_start = max(start_char, unit_chunk_start)
            overlap_end = min(end_char, unit_chunk_end)
            if overlap_end <= overlap_start:
                continue

            offset_in_unit_start = overlap_start - unit_chunk_start
            offset_in_unit_end = overlap_end - unit_chunk_start
            page_start = int(unit.get("page_start_char", 0)) + offset_in_unit_start
            page_end = int(unit.get("page_start_char", 0)) + offset_in_unit_end
            page_spans.append(
                {
                    "page_number": unit.get("page_number"),
                    "start_char": page_start,
                    "end_char": page_end,
                }
            )
        return page_spans

    def _build_document_snippet(
        self,
        raw_document: str,
        chunk_span: Optional[Dict[str, Any]],
        left_context: int = 180,
        right_context: int = 180,
        fallback_length: int = 300,
        min_window: int = 120,
        max_window: int = 320,
    ) -> Dict[str, Any]:
        """
        Return a small snippet from chunk text.
        - If highlight span exists: return context window around it.
        - Else: return first fallback_length characters.
        """
        if not raw_document:
            return {
                "snippet_text": "",
                "snippet_start_char": 0,
                "snippet_end_char": 0,
                "highlight_in_snippet": None,
            }

        if not chunk_span:
            snippet_start = 0
            snippet_end = min(len(raw_document), fallback_length)
            snippet_text = raw_document[snippet_start:snippet_end]
            return {
                "snippet_text": self.format_document_for_user(snippet_text),
                "snippet_start_char": snippet_start,
                "snippet_end_char": snippet_end,
                "highlight_in_snippet": None,
            }

        match_start = int(chunk_span.get("start_char", 0))
        match_end = int(chunk_span.get("end_char", match_start))
        # Adapt context based on match length; clamp to [min_window, max_window]
        match_len = max(1, match_end - match_start)
        target_window = min(max_window, max(min_window, match_len + left_context + right_context))
        half_ctx = max(0, (target_window - match_len) // 2)
        snippet_start = max(0, match_start - half_ctx)
        snippet_end = min(len(raw_document), match_end + half_ctx)
        snippet_text = raw_document[snippet_start:snippet_end]

        return {
            "snippet_text": self.format_document_for_user(snippet_text),
            "snippet_start_char": snippet_start,
            "snippet_end_char": snippet_end,
            "highlight_in_snippet": {
                "start_char": max(0, match_start - snippet_start),
                "end_char": max(0, match_end - snippet_start),
            },
        }

    def _extract_sentences_with_offsets(self, raw_document: str) -> List[Dict[str, Any]]:
        sentence_matches = list(re.finditer(r"[^.!?\n]+[.!?]?", raw_document))
        sentences: List[Dict[str, Any]] = []
        for sentence_match in sentence_matches:
            sentence_text = sentence_match.group(0).strip()
            if not sentence_text:
                continue
            sentences.append(
                {
                    "text": sentence_text,
                    "start_char": sentence_match.start(),
                    "end_char": sentence_match.end(),
                }
            )
        return sentences

    def _get_best_span_with_reranker(self, user_query: str, raw_document: str) -> Optional[Dict[str, Any]]:
        if not self.reranker or not raw_document.strip():
            return None

        sentences = self._extract_sentences_with_offsets(raw_document)
        if not sentences:
            return None

        pairs = [[user_query, sentence["text"]] for sentence in sentences]
        try:
            scores = self.reranker.predict(pairs)
        except Exception as rerank_error:
            self._log(f"Reranker scoring failed, using fuzzy highlight fallback: {rerank_error}", "WARNING")
            return None

        # Aggregate sentence-level scores for stability
        scores_f = [float(s) for s in scores]
        top_indices = sorted(range(len(scores_f)), key=lambda i: scores_f[i], reverse=True)[:3]

        def regional_score(i: int) -> float:
            return (
                scores_f[i]
                + (scores_f[i - 1] if i > 0 else 0.0)
                + (scores_f[i + 1] if i < len(scores_f) - 1 else 0.0)
            )

        best_idx = max(top_indices, key=regional_score)
        best_sentence = sentences[best_idx]
        best_score = scores_f[best_idx]
        avg_score = sum(scores_f) / len(scores_f) if scores_f else 0.0
        density = 0.0
        if scores_f:
            density = len([s for s in scores_f if s > 0.5]) / len(scores_f)
        final_score = best_score * 0.65 + avg_score * 0.25 + density * 0.10
        if density < 0.15:
            final_score *= 0.85

        # Refine highlight within the best sentence using stricter fuzzy match.
        sent_text = raw_document[best_sentence["start_char"]:best_sentence["end_char"]]
        refined_span = self._find_fuzzy_query_span(
            sent_text,
            user_query,
            min_similarity=0.64,
            min_token_similarity=0.75,
        )

        if refined_span:
            start_char = best_sentence["start_char"] + refined_span["start_char"]
            end_char = best_sentence["start_char"] + refined_span["end_char"]
            span = {
                "start_char": start_char,
                "end_char": end_char,
                "matched_text": raw_document[start_char:end_char],
                "match_type": "reranked_sentence",
            }
        else:
            span = {
                "start_char": int(best_sentence["start_char"]),
                "end_char": int(best_sentence["end_char"]),
                "matched_text": raw_document[best_sentence["start_char"]:best_sentence["end_char"]],
                "match_type": "reranked_sentence",
            }

        return {
            "span": span,
            "score": final_score,
            "best_score": best_score,
            "avg_score": avg_score,
            "density": density,
        }

    def convert_query_to_embedding(self, user_query: str) -> List[float]:
        """Step 7: Convert user query to embedding with the same model."""
        if not user_query or not user_query.strip():
            raise ValueError("user_query cannot be empty.")
        vector = self.model.encode([user_query], convert_to_numpy=True)
        return vector.tolist()[0]

    def search_similar_chunks(
        self,
        user_query: str,
        top_k: int = 5,
        retrieve_k: Optional[int] = None,
        collection_name: Optional[str] = None,
        demand_note_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Step 8: Search vector DB and return top matches with metadata.
        """
        if top_k <= 0:
            raise ValueError("top_k must be greater than 0.")
        if retrieve_k is None:
            retrieve_k = max(top_k * 3, 15)
        if retrieve_k < top_k:
            retrieve_k = top_k

        query_embedding = self.convert_query_to_embedding(user_query)
        collection = self._get_collection(collection_name)

        self._log(
            f"Retrieving {retrieve_k} then reranking to top {top_k} for query: {user_query}"
            + (f" | demand_note_id={demand_note_id}" if demand_note_id else "")
        )
        if demand_note_id:
            self._log("Search scope: scoped to demand_note_id", "INFO")
        else:
            self._log("Search scope: global (no demand_note_id filter)", "INFO")

        where_filter = {"demand_note_id": str(demand_note_id)} if demand_note_id else None
        raw_results = collection.query(
            query_embeddings=[query_embedding],
            n_results=retrieve_k,
            where=where_filter,
        )

        ids = raw_results.get("ids", [[]])[0]
        documents = raw_results.get("documents", [[]])[0]
        metadatas = raw_results.get("metadatas", [[]])[0]
        distances = raw_results.get("distances", [[]])[0]

        candidate_matches: List[Dict[str, Any]] = []
        for idx in range(len(ids)):
            raw_document = documents[idx] if idx < len(documents) else ""
            metadata = metadatas[idx] if idx < len(metadatas) else {}
            rerank_result = self._get_best_span_with_reranker(user_query, raw_document)
            chunk_span = rerank_result["span"] if rerank_result else None
            if chunk_span is None:
                chunk_span = self._find_query_span_in_chunk(
                    raw_document,
                    user_query,
                    min_similarity=0.55,
                    min_token_similarity=0.65,
                )
            chunk_unit_map = self._load_json_metadata_field(metadata, "chunk_unit_map_json")
            page_spans_for_match = self._map_chunk_span_to_page_spans(chunk_span, chunk_unit_map)
            fallback_page_spans = self._load_json_metadata_field(metadata, "page_spans_json")
            snippet = self._build_document_snippet(raw_document, chunk_span)
            rerank_score = rerank_result["score"] if rerank_result else None

            candidate_matches.append(
                {
                    "rank": idx + 1,
                    "id": ids[idx],
                    "document": snippet["snippet_text"],
                    "raw_document": raw_document,
                    "metadata": metadata,
                    "highlight": {
                        "chunk_span": chunk_span,
                        "page_spans": page_spans_for_match or fallback_page_spans,
                        "snippet_span": snippet["highlight_in_snippet"],
                        "snippet_start_char": snippet["snippet_start_char"],
                        "snippet_end_char": snippet["snippet_end_char"],
                    },
                    "distance": distances[idx] if idx < len(distances) else None,
                    "rerank_score": rerank_score,
                }
            )

        if self.reranker is not None:
            # Prefer semantic precision from reranker; keep distance as fallback sort key.
            candidate_matches.sort(
                key=lambda item: (
                    item["rerank_score"] if item["rerank_score"] is not None else float("-inf"),
                    -(item["distance"] if item["distance"] is not None else float("inf")),
                ),
                reverse=True,
            )
        else:
            candidate_matches.sort(
                key=lambda item: item["distance"] if item["distance"] is not None else float("inf"),
            )

        matches = candidate_matches[:top_k]
        for idx, match in enumerate(matches, start=1):
            match["rank"] = idx

        return {
            "query": user_query,
            "top_k": top_k,
            "collection_name": collection.name,
            "model_name": self.model_name,
            "matches": matches,
        }

def pretty_print_search_results(results: Dict[str, Any]) -> None:
    """Small helper to print search response in readable JSON."""
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":      
    import argparse

    parser = argparse.ArgumentParser(description="Run semantic search against Chroma embeddings.")
    parser.add_argument("--query", required=True, help="User query text")
    parser.add_argument("--demand-note-id", dest="demand_note_id", help="Optional demandNoteId to scope search")
    parser.add_argument("--top-k", type=int, default=5, help="Results to return after rerank (default: 5)")
    parser.add_argument("--retrieve-k", type=int, default=None, help="Initial candidates to retrieve before rerank (default: max(top_k*3, 15))")
    parser.add_argument("--collection", default="document_embeddings", help="Chroma collection name")
    parser.add_argument("--chroma-path", default=None, help="Path to Chroma store (default: embedding-engine/chroma_store)")

    args = parser.parse_args()

    chroma_dir = args.chroma_path or str((Path(__file__).parent / "chroma_store").resolve())
    engine = EmbeddingSearchEngine(
        chroma_path=chroma_dir,
        default_collection_name=args.collection,
    )

    response = engine.search_similar_chunks(
        user_query=args.query,
        demand_note_id=args.demand_note_id,
        top_k=args.top_k,
        retrieve_k=args.retrieve_k,
    )
    pretty_print_search_results(response)
