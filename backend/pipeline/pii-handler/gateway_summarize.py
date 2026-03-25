"""
Summarize combined sanitized text through local CatGPT gateway.

This module is intended for testing gateway-based summarization without
changing the core extraction/sanitization pipeline.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Tuple
from urllib.parse import urlsplit

import requests

# Ensure project root is available for absolute imports.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.pipeline.utils.connect_db import db_connect


DEFAULT_GATEWAY_URL = "http://localhost:8000/v1/chat/completions"
DEFAULT_GATEWAY_TOKEN = "dummy8249"
DEFAULT_GATEWAY_MODEL = "catgpt-browser"
DEFAULT_COMBINED_FILE = "sanitized_full.txt"
DEFAULT_ATTACHMENT_NAME = "sanitized_full.txt"

_HTTP_SESSION = requests.Session()


def _slugify_model(model: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", str(model or "").strip()).strip("_")
    return cleaned.lower() or "unknown_model"


def _summary_filename_for_model(model: str) -> str:
    return f"Summarized_text_{_slugify_model(model)}.txt"


def fetch_active_prompt(doc_type: str) -> str:
    """
    Fetch active, non-deleted prompt text for a document type.
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


def fetch_active_prompt_record(doc_type: str) -> dict:
    """
    Fetch active prompt record (id, prompt, version) for a document type.
    """
    query = """
        SELECT p."id", p."prompt", p."version"
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
    return {"id": row.get("id"), "prompt": row.get("prompt"), "version": row.get("version")}


def load_combined_sanitized_text(output_dir: Path, combined_filename: str = DEFAULT_COMBINED_FILE) -> str:
    combined_path = output_dir / combined_filename
    if not combined_path.exists():
        raise FileNotFoundError(f"Combined sanitized file not found: {combined_path}")
    return combined_path.read_text(encoding="utf-8")


def _call_gateway(prompt: str, input_text: str, model: str, use_file_payload: bool = True) -> str:
    """
    Send summarization request to local gateway and return text content.

    Args:
        prompt: instruction text
        input_text: full input body
        model: gateway model name
        use_file_payload: when True (default) send base64 "file" message; when False send plain text message.
    """
    endpoint = os.getenv("CATGPT_GATEWAY_URL", DEFAULT_GATEWAY_URL)
    token = os.getenv("CATGPT_GATEWAY_TOKEN", DEFAULT_GATEWAY_TOKEN)
    timeout_seconds = int(os.getenv("CATGPT_GATEWAY_TIMEOUT_SECONDS", "900"))
    max_retries = int(os.getenv("CATGPT_GATEWAY_MAX_RETRIES", "3"))
    backoff_base = float(os.getenv("CATGPT_GATEWAY_BACKOFF_BASE_SECONDS", "2"))
    print(f"[Gateway Summary] Using gateway endpoint: {endpoint}")
    print(f"[Gateway Summary] Using model: {model}")
    print(f"[Gateway Summary] Request timeout: {timeout_seconds}s")
    print(f"[Gateway Summary] Max retries before thread reset: {max_retries}")
    base_url = _base_gateway_url(endpoint)
    thread_id = _create_new_thread(
        base_url=base_url,
        token=token,
        model=model,
        timeout_seconds=timeout_seconds,
    )
    print(f"[Gateway Summary] Created fresh thread: {thread_id}")

    user_content = f"{prompt}\n\nINPUT TEXT:\n{input_text}"
    file_message = _build_file_message(prompt=prompt, input_text=input_text)

    text_payload = {
        "model": model,
        "messages": [{"role": "user", "content": user_content}],
    }

    file_payload = {
        "model": model,
        "messages": [{"role": "user", "content": file_message}],
    }
    if use_file_payload:
        try:
            file_bytes = len(input_text.encode("utf-8"))
            print(f"[Gateway Summary] Attaching file payload: {DEFAULT_ATTACHMENT_NAME} ({file_bytes} bytes)")
        except Exception:
            print("[Gateway Summary] Attaching file payload: size unavailable")
        payload = file_payload
    else:
        payload = text_payload

    last_error: Exception | None = None
    try:
        for attempt in range(1, max_retries + 1):
            try:
                response = _HTTP_SESSION.post(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=timeout_seconds,
                )
                response.raise_for_status()
                payload = response.json()
                print(f"[Gateway Summary] File payload delivered to gateway (attempt {attempt}/{max_retries})")
                print(f"[Gateway Summary] Gateway call successful on attempt {attempt}/{max_retries}")
                return _extract_response_text(payload)
            except requests.HTTPError as http_error:
                status = http_error.response.status_code if http_error.response is not None else None
                last_error = http_error
                retryable = status in (429, 500, 502, 503, 504)
                if attempt < max_retries and retryable:
                    delay = backoff_base * (2 ** (attempt - 1))
                    print(f"[Gateway Summary] Attempt {attempt} failed with HTTP {status}. Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    continue
                break
            except requests.RequestException as req_error:
                last_error = req_error
                if attempt < max_retries:
                    delay = backoff_base * (2 ** (attempt - 1))
                    print(f"[Gateway Summary] Attempt {attempt} failed ({req_error}). Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    continue
                break

        print("[Gateway Summary] Retries exhausted. Retrying via /thread/new with a fresh chat...")
        try:
            return _retry_with_new_thread(
                endpoint=endpoint,
                token=token,
                model=model,
                user_content=user_content,
                timeout_seconds=timeout_seconds,
            )
        except Exception:
            if last_error is not None:
                raise last_error
            raise
    finally:
        _delete_thread_best_effort(
            base_url=base_url,
            token=token,
            thread_id=thread_id,
            timeout_seconds=timeout_seconds,
        )


def _build_file_message(prompt: str, input_text: str) -> list[dict]:
    encoded = base64.b64encode(input_text.encode("utf-8")).decode("ascii")
    text_instruction = (
        f"{prompt}\n\n"
        "Use the attached file as the complete INPUT TEXT and produce only the final summary output."
    )
    return [
        {"type": "text", "text": text_instruction},
        {
            "type": "file",
            "file": {
                "filename": DEFAULT_ATTACHMENT_NAME,
                "data": encoded,
                "mime_type": "text/plain",
            },
        },
    ]


def _base_gateway_url(endpoint: str) -> str:
    parsed = urlsplit(endpoint)
    return f"{parsed.scheme}://{parsed.netloc}"


def _create_new_thread(base_url: str, token: str, model: str, timeout_seconds: int) -> str:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    new_thread_url = f"{base_url}/thread/new"
    response = _HTTP_SESSION.post(
        new_thread_url,
        headers=headers,
        json={
            "model": model,
            "message": "Start a new clean chat thread.",
        },
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Gateway /thread/new returned non-JSON payload")
    thread_id = payload.get("id") or payload.get("thread_id") or payload.get("threadId")
    if not thread_id:
        raise ValueError("Gateway /thread/new did not return thread id")
    return str(thread_id)


def _delete_thread_best_effort(base_url: str, token: str, thread_id: str, timeout_seconds: int) -> None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    delete_url = f"{base_url}/thread/{thread_id}"
    alt_delete_url = f"{base_url}/thread/{thread_id}/delete"

    # Keep cleanup non-fatal.
    try:
        resp = _HTTP_SESSION.delete(delete_url, headers=headers, timeout=timeout_seconds)
        if resp.status_code < 400:
            print(f"[Gateway Summary] Deleted thread: {thread_id}")
            return
    except Exception:
        pass

    try:
        resp = _HTTP_SESSION.post(alt_delete_url, headers=headers, json={}, timeout=timeout_seconds)
        if resp.status_code < 400:
            print(f"[Gateway Summary] Deleted thread via alt endpoint: {thread_id}")
            return
    except Exception:
        pass

    print(f"[Gateway Summary] Thread cleanup endpoint unavailable, skipped delete for: {thread_id}")


def _extract_response_text(payload: dict) -> str:
    # OpenAI-like format
    if isinstance(payload, dict):
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0] or {}
            message = first.get("message", {}) if isinstance(first, dict) else {}
            content = message.get("content") if isinstance(message, dict) else None
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                parts: list[str] = []
                for item in content:
                    if isinstance(item, dict):
                        txt = item.get("text")
                        if isinstance(txt, str) and txt.strip():
                            parts.append(txt.strip())
                if parts:
                    return "\n".join(parts).strip()

        # Common custom gateway fields
        for key in ("content", "response", "text", "message"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

            if isinstance(value, dict):
                nested = value.get("content")
                if isinstance(nested, str) and nested.strip():
                    return nested.strip()

    raise ValueError(f"Unable to extract text from gateway payload keys: {list(payload.keys()) if isinstance(payload, dict) else type(payload)}")


def _retry_with_new_thread(
    endpoint: str,
    token: str,
    model: str,
    user_content: str,
    timeout_seconds: int,
) -> str:
    base_url = _base_gateway_url(endpoint)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Start a new thread with the first message.
    new_thread_url = f"{base_url}/thread/new"
    new_thread_resp = _HTTP_SESSION.post(
        new_thread_url,
        headers=headers,
        json={
            "model": model,
            "message": user_content,
        },
        timeout=timeout_seconds,
    )
    new_thread_resp.raise_for_status()
    new_thread_payload = new_thread_resp.json()

    # If /thread/new already returns a reply, use it directly.
    try:
        text = _extract_response_text(new_thread_payload)
        print("[Gateway Summary] Fresh-thread retry succeeded via /thread/new")
        return text
    except Exception:
        pass

    # Otherwise continue with explicit thread chat call.
    thread_id = None
    if isinstance(new_thread_payload, dict):
        thread_id = (
            new_thread_payload.get("id")
            or new_thread_payload.get("thread_id")
            or new_thread_payload.get("threadId")
        )
    if not thread_id:
        raise ValueError("Gateway /thread/new did not return thread id or response content")

    thread_chat_url = f"{base_url}/thread/{thread_id}/chat"
    chat_resp = _HTTP_SESSION.post(
        thread_chat_url,
        headers=headers,
        json={
            "model": model,
            "message": user_content,
        },
        timeout=timeout_seconds,
    )
    chat_resp.raise_for_status()
    chat_payload = chat_resp.json()
    text = _extract_response_text(chat_payload)
    print(f"[Gateway Summary] Fresh-thread retry succeeded via /thread/{thread_id}/chat")
    return text


def save_summary_text(output_dir: Path, summary_text: str, output_filename: str) -> Path:
    summary_path = output_dir / output_filename
    summary_path.write_text(summary_text.strip() + "\n", encoding="utf-8")
    return summary_path


def summarize_output_dir_with_text(
    output_dir: str | Path,
    doc_type: str,
    model: str = DEFAULT_GATEWAY_MODEL,
    combined_filename: str = DEFAULT_COMBINED_FILE,
    output_filename: str | None = None,
) -> Tuple[Path, str]:
    """
    End-to-end gateway summarization for one output directory.
    """
    out_dir = Path(output_dir)
    print(f"[Gateway Summary] Starting summarization for output dir: {out_dir}")
    prompt = fetch_active_prompt(doc_type)
    combined_text = load_combined_sanitized_text(out_dir, combined_filename=combined_filename)
    summary_text = _call_gateway(prompt, combined_text, model=model)
    final_output_filename = output_filename or _summary_filename_for_model(model)
    summary_path = save_summary_text(out_dir, summary_text, output_filename=final_output_filename)
    print(f"[Gateway Summary] Summary written to: {summary_path}")
    return summary_path, summary_text
