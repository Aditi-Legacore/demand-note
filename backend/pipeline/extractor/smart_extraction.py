"""
Smart PDF Extraction Module

Purpose:
Drop-in compatible extractor with adaptive page-by-page OCR fallback.
"""

from __future__ import annotations

import io
import os
import re
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF


NATIVE_ACCEPT_THRESHOLD = 0.45
OCR_ACCEPT_THRESHOLD = 0.35
RENDER_DPI = 300

def looks_like_garbage(text: str) -> bool:
    """Heuristic check for low-quality extracted text."""
    if not text:
        return True
    compact = text.strip()
    if not compact:
        return True
    if len(compact) < 8:
        return True

    alpha = sum(c.isalpha() for c in compact)
    alnum = sum(c.isalnum() for c in compact)
    printable = sum(c.isprintable() for c in compact)
    total = len(compact)

    alpha_ratio = alpha / total
    alnum_ratio = alnum / total
    printable_ratio = printable / total

    repeated_symbol_runs = len(re.findall(r"([^\w\s])\1{2,}", compact))
    word_tokens = re.findall(r"[A-Za-z]{2,}", compact)
    word_ratio = len(word_tokens) / max(1, len(compact.split()))

    if printable_ratio < 0.9:
        return True
    if alpha_ratio < 0.2 and alnum_ratio < 0.35:
        return True
    if repeated_symbol_runs > 3:
        return True
    if word_ratio < 0.2 and len(compact) > 40:
        return True
    return False


def score_text_quality(text: str) -> float:
    """Return a deterministic quality score in [0, 1]."""
    if not text:
        return 0.0

    compact = text.strip()
    if not compact:
        return 0.0

    total = len(compact)
    alpha = sum(c.isalpha() for c in compact)
    alnum = sum(c.isalnum() for c in compact)
    spaces = sum(c.isspace() for c in compact)
    printable = sum(c.isprintable() for c in compact)

    alpha_ratio = alpha / total
    alnum_ratio = alnum / total
    space_ratio = spaces / total
    printable_ratio = printable / total
    length_score = min(1.0, total / 1200.0)

    words = re.findall(r"[A-Za-z]{2,}", compact)
    line_count = max(1, compact.count("\n") + 1)
    avg_words_per_line = len(words) / line_count
    readability = min(1.0, avg_words_per_line / 8.0)

    garbage_penalty = 0.35 if looks_like_garbage(compact) else 0.0

    score = (
        0.28 * length_score
        + 0.18 * alpha_ratio
        + 0.18 * alnum_ratio
        + 0.12 * min(1.0, printable_ratio)
        + 0.12 * readability
        + 0.12 * (1.0 - abs(space_ratio - 0.16))
        - garbage_penalty
    )
    return max(0.0, min(1.0, score))


def has_text_layer(page: fitz.Page) -> bool:
    """Check whether a page has an extractable text layer."""
    try:
        text = page.get_text("text") or ""
        return bool(text.strip())
    except Exception:
        return False


def _collect_native_text(page: fitz.Page) -> str:
    """Extract text from PyMuPDF dict representation with stable order."""
    data = page.get_text("dict")
    blocks = data.get("blocks", [])
    lines: List[str] = []
    for block in blocks:
        if block.get("type", 0) != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = "".join(span.get("text", "") for span in spans).strip()
            if text:
                lines.append(text)
    return "\n".join(lines).strip()


def _extract_with_page_ocr(page: fitz.Page) -> str:
    """
    Try PyMuPDF OCR path (if available in runtime build).
    Returns empty string on failure.
    """
    try:
        text_page = page.get_textpage_ocr()
        text = page.get_text("text", textpage=text_page) or ""
        return text.strip()
    except Exception:
        return ""


def _extract_with_render_ocr(page: fitz.Page) -> str:
    """
    Render page and run pytesseract OCR.
    Returns empty string if OCR dependencies or OCR call are unavailable.
    """
    try:
        import pytesseract
        from PIL import Image, ImageOps
    except Exception:
        return ""

    def _preprocess(image: "Image.Image") -> "Image.Image":
        """
        OCR-oriented preprocessing.
        Uses OpenCV if available, otherwise PIL grayscale+contrast fallback.
        """
        try:
            import cv2
            import numpy as np

            arr = np.array(image)
            if len(arr.shape) == 3:
                gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            else:
                gray = arr

            height = gray.shape[0]
            if height < 1500:
                scale = 2000.0 / max(1, height)
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            return Image.fromarray(binary)
        except Exception:
            # Dependency-safe fallback.
            gray = ImageOps.grayscale(image)
            gray = ImageOps.autocontrast(gray)
            return gray

    try:
        scale = RENDER_DPI / 72.0
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        processed = _preprocess(image)

        configs = [
            "--oem 3 --psm 1",
            "--oem 3 --psm 3",
            "--oem 3 --psm 4",
            "--oem 3 --psm 6",
        ]

        best_text = ""
        best_score = 0.0
        for config in configs:
            try:
                text = (pytesseract.image_to_string(processed, config=config, lang="eng") or "").strip()
            except Exception:
                continue
            score = score_text_quality(text)
            if score > best_score:
                best_text = text
                best_score = score

        return best_text
    except Exception:
        return ""


def _extract_with_pdf2image_ocr(pdf_path: str, page_number: int) -> str:
    """
    Poppler-based single-page render OCR fallback.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from PIL import ImageOps
    except Exception:
        return ""

    poppler_path = os.getenv("POPPLER_PATH") or os.getenv("SMART_POPPLER_PATH")

    try:
        kwargs: Dict[str, Any] = {
            "dpi": RENDER_DPI,
            "first_page": page_number,
            "last_page": page_number,
        }
        if poppler_path:
            kwargs["poppler_path"] = poppler_path

        images = convert_from_path(pdf_path, **kwargs)
        if not images:
            return ""
        image = images[0]

        gray = ImageOps.grayscale(image)
        gray = ImageOps.autocontrast(gray)

        configs = [
            "--oem 3 --psm 1",
            "--oem 3 --psm 3",
            "--oem 3 --psm 4",
            "--oem 3 --psm 6",
        ]

        best_text = ""
        best_score = 0.0
        for config in configs:
            try:
                text = (pytesseract.image_to_string(gray, config=config, lang="eng") or "").strip()
            except Exception:
                continue
            score = score_text_quality(text)
            if score > best_score:
                best_text = text
                best_score = score

        return best_text
    except Exception:
        return ""


def smart_extract(pdf_path: str) -> Dict[str, Any]:
    """
    Adaptive page-by-page extraction.

    Returns:
    {
      "pages": [
        {
          "page_number": int,
          "extraction_method": "native" | "ocr" | "render_ocr",
          "confidence_score": float,
          "text": str
        }, ...
      ],
      "overall_confidence": float
    }
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    pages_out: List[Dict[str, Any]] = []
    with fitz.open(str(path)) as doc:
        for index in range(len(doc)):
            page = doc[index]

            native_text = _collect_native_text(page)
            native_score = score_text_quality(native_text)

            best_text = native_text
            best_score = native_score
            best_method = "native"

            if native_score < NATIVE_ACCEPT_THRESHOLD:
                run_ocr = (not has_text_layer(page)) or looks_like_garbage(native_text)
                if run_ocr:
                    ocr_text = _extract_with_page_ocr(page)
                    ocr_score = score_text_quality(ocr_text)
                    if ocr_score > best_score:
                        best_text = ocr_text
                        best_score = ocr_score
                        best_method = "ocr"

                    if ocr_score < OCR_ACCEPT_THRESHOLD or looks_like_garbage(ocr_text):
                        render_text = _extract_with_render_ocr(page)
                        render_score = score_text_quality(render_text)
                        if render_score > best_score:
                            best_text = render_text
                            best_score = render_score
                            best_method = "render_ocr"

                        if best_score < OCR_ACCEPT_THRESHOLD or looks_like_garbage(best_text):
                            poppler_text = _extract_with_pdf2image_ocr(str(path), index + 1)
                            poppler_score = score_text_quality(poppler_text)
                            if poppler_score > best_score:
                                best_text = poppler_text
                                best_score = poppler_score
                                best_method = "render_ocr"

            pages_out.append(
                {
                    "page_number": index + 1,
                    "extraction_method": best_method,
                    "confidence_score": round(best_score, 4),
                    "text": best_text,
                }
            )

    overall = 0.0
    if pages_out:
        overall = sum(p["confidence_score"] for p in pages_out) / len(pages_out)

    return {
        "pages": pages_out,
        "overall_confidence": round(overall, 4),
    }


def extract_text_by_page(pdf_content: bytes) -> List[str]:
    """
    Drop-in compatible wrapper used by pipeline.
    Returns list[str] only, while smart logic runs internally.
    """
    pdf_tmp = None
    try:
        with fitz.open(stream=pdf_content, filetype="pdf") as doc:
            tmp_path = Path.cwd() / f"__smart_extract_{os.getpid()}.pdf"
            doc.save(str(tmp_path))
            pdf_tmp = tmp_path

        result = smart_extract(str(pdf_tmp))
        pages = result.get("pages", [])
        return [(p.get("text") or "").strip() for p in pages]
    except Exception:
        return _extract_text_fallback(pdf_content)
    finally:
        if pdf_tmp and pdf_tmp.exists():
            try:
                pdf_tmp.unlink()
            except Exception:
                pass


def format_page_text(page_num: int, text: str) -> str:
    """
    Format page text with page markers.
    """
    formatted = f"=== PAGE {page_num} START ===\n"
    formatted += text
    formatted += f"\n=== PAGE {page_num} END ===\n"
    return formatted


def _extract_text_fallback(pdf_content: bytes) -> List[str]:
    """
    Fallback extraction using PyPDF2 for malformed PDFs.
    """
    try:
        import PyPDF2
    except ImportError:
        raise ImportError("PyPDF2 is required for fallback extraction")

    pages: List[str] = []
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text.strip())
    except Exception as e:
        raise RuntimeError(f"Fallback extraction failed: {e}")

    return pages
