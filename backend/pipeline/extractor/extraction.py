"""
PDF Extraction Module

Purpose:
Extract text content from PDF files page by page.
(Generic, adaptive, works for N PDFs)
"""

from typing import List
import io
import fitz  # PyMuPDF
import re

OCR_RENDER_SCALE = 2.0
_OCR_UNAVAILABLE_LOGGED = False


def extract_text_by_page(pdf_content: bytes) -> List[str]:
    """
    Generic adaptive text extractor.
    Works across digital, hybrid, and noisy PDFs.
    """
    page_texts = []
    try:
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
    except Exception as e:
        print(f"[WARN] PyMuPDF open failed; falling back to PyPDF2: {e}")
        return _extract_text_fallback(pdf_content)

    try:
        for page_index in range(len(pdf_document)):
            try:
                page = pdf_document[page_index]

                raw_text = page.get_text().strip()

                # Decide extraction path per page
                use_blocks = True

                if _text_density_is_low(raw_text):
                    use_blocks = True

                blocks = page.get_text("blocks") if use_blocks else [(0, 0, 0, 0, raw_text)]

                # Stable reading order
                blocks = sorted(blocks, key=lambda b: (b[1], b[0]))

                page_lines = []

                for block in blocks:
                    text = block[4]
                    if not text:
                        continue

                    cleaned = _generic_clean(text)

                    if not cleaned:
                        continue

                    if _looks_like_garbage(cleaned):
                        continue

                    page_lines.append(cleaned)

                extracted_page_text = "\n".join(page_lines).strip()
                if _should_try_ocr(raw_text, extracted_page_text):
                    ocr_text = _extract_page_text_with_ocr(page)
                    if ocr_text:
                        extracted_page_text = ocr_text
                        print(f"[INFO] OCR fallback used for page {page_index + 1}")

                page_texts.append(extracted_page_text)
            except Exception as e:
                # Try OCR for this page before falling back to a full-document parser.
                ocr_text = _extract_page_text_with_ocr(page) if "page" in locals() else ""
                if ocr_text:
                    page_texts.append(ocr_text)
                    print(f"[INFO] OCR fallback recovered page {page_index + 1} after PyMuPDF error: {e}")
                    continue
                # If recovery fails, fall back to PyPDF2 for the full document.
                print(f"[WARN] PyMuPDF page extraction failed; falling back to PyPDF2: {e}")
                return _extract_text_fallback(pdf_content)

    finally:
        pdf_document.close()

    return page_texts


def format_page_text(page_num: int, text: str) -> str:
    """
    Format page text with page markers.
    """
    formatted = f"=== PAGE {page_num} START ===\n"
    formatted += text
    formatted += f"\n=== PAGE {page_num} END ===\n"
    return formatted


# ==================================================
# Internal generic utilities (document-agnostic)
# ==================================================

def _text_density_is_low(text: str) -> bool:
    """
    Detect image-heavy / scanned pages.
    """
    if not text:
        return True
    alpha_chars = sum(c.isalpha() for c in text)
    return alpha_chars < 50


def _generic_clean(text: str) -> str:
    """
    Conservative cleanup safe for all PDFs.
    """
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    text = _normalize_characters(text)
    text = _fix_spacing_patterns(text)

    return text.strip()


def _normalize_characters(text: str) -> str:
    """
    Fix high-confidence character confusions only.
    """
    # | misread as I
    text = re.sub(r"\b\|\b", "I", text)

    # Date-like correction (8/H → 0)
    text = re.sub(r"\b[8H](\d/\d{2}/\d{2,4})\b", r"0\1", text)

    return text


def _fix_spacing_patterns(text: str) -> str:
    """
    Generic spacing fixes without word assumptions.
    """
    # lowercaseUppercase → lowercase Uppercase
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

    # worddigit → word digit
    text = re.sub(r"([a-zA-Z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([a-zA-Z])", r"\1 \2", text)

    return text


def _looks_like_garbage(text: str) -> bool:
    """
    Language-agnostic logo / noise detection.
    """
    if len(text) < 5:
        return False

    alpha_ratio = sum(c.isalpha() for c in text) / len(text)
    vowel_ratio = sum(c.lower() in "aeiou" for c in text) / len(text)

    if alpha_ratio < 0.4:
        return True

    if vowel_ratio < 0.2 and len(text) > 12:
        return True

    return False


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


def _should_try_ocr(raw_text: str, extracted_text: str) -> bool:
    """
    Use OCR when extracted text is empty or likely too sparse/noisy.
    """
    if not extracted_text:
        return True
    if _text_density_is_low(raw_text) and len(extracted_text) < 60:
        return True
    return False


def _extract_page_text_with_ocr(page: "fitz.Page") -> str:
    """
    OCR one page image with optional pytesseract.
    Returns empty string if OCR is unavailable or fails.
    """
    global _OCR_UNAVAILABLE_LOGGED
    try:
        import pytesseract
        from PIL import Image
    except Exception:
        if not _OCR_UNAVAILABLE_LOGGED:
            print("[WARN] OCR fallback unavailable: install pytesseract and Pillow")
            _OCR_UNAVAILABLE_LOGGED = True
        return ""

    try:
        # Render at higher DPI for better OCR quality.
        matrix = fitz.Matrix(OCR_RENDER_SCALE, OCR_RENDER_SCALE)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        ocr_text = pytesseract.image_to_string(img) or ""
        return _generic_clean(ocr_text)
    except Exception as e:
        print(f"[WARN] OCR fallback failed for page {page.number + 1}: {e}")
        return ""
