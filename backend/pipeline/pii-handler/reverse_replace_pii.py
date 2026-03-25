"""
Reverse PII replacement using a dummy_to_original mapping.
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

from replace_pii2 import PIIReplacer, FLEXIBLE_PII_TYPES


def _load_mapping_data(mapping_file: str) -> Tuple[Dict[str, str], Dict[str, str]]:
    try:
        with open(mapping_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Mapping file not found: {mapping_file}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in mapping file: {e}")

    if not isinstance(data, dict) or "dummy_to_original" not in data:
        raise ValueError("Mapping file missing 'dummy_to_original' key")

    mapping = data["dummy_to_original"]
    if not isinstance(mapping, dict):
        raise ValueError("'dummy_to_original' must be a dictionary")

    pii_types = data.get("pii_types", {})
    if not isinstance(pii_types, dict):
        pii_types = {}

    return mapping, pii_types


MAX_PATTERN_GROUPS = 500
_REPLACER_HELPER = PIIReplacer.__new__(PIIReplacer)


def _build_pattern_items(mapping: Dict[str, str], pii_types: Dict[str, str]) -> List[Tuple[str, str]]:
    items: List[Tuple[str, str]] = []
    for dummy, original in mapping.items():
        if not dummy or original is None:
            continue
        pii_type = pii_types.get(original, "")
        # Always include exact matching pattern with tolerant punctuation.
        normalized = dummy.replace("\u2019", "'").replace("\u2018", "'")
        escaped = re.escape(normalized)
        escaped = escaped.replace("\\'", "['\\u2019\\u2018]")
        escaped = escaped.replace("\\-", "[-\\u2010\\u2011\\u2012\\u2013\\u2014]")
        escaped = escaped.replace("\\.", "\\.?")
        pattern = re.sub(r"(\\\s)+", r"\\s+", escaped)
        items.append((pattern, original))

        # Reuse replace_pii2-style bounded token matching for select types.
        if pii_type and pii_type.lower() in FLEXIBLE_PII_TYPES:
            tokens = _REPLACER_HELPER._flex_tokens_for_value(dummy)
            if tokens:
                flex_pattern = _REPLACER_HELPER._build_token_pattern(tokens)
                items.append((flex_pattern, original))
        elif pii_type and pii_type.lower() == "person name":
            for tokens in _REPLACER_HELPER._name_variants(dummy):
                flex_pattern = _REPLACER_HELPER._build_name_pattern(tokens)
                items.append((flex_pattern, original))
    # Longest first to reduce partial collisions.
    items.sort(key=lambda item: len(item[0]), reverse=True)
    return items


def restore_pii_in_text(text: str, mapping_file: str) -> str:
    """
    Replace dummy values in text with original PII values.
    Uses exact, case-insensitive matching and longest-first ordering.
    """
    dummy_to_original, pii_types = _load_mapping_data(mapping_file)
    pattern_items = _build_pattern_items(dummy_to_original, pii_types)

    if not pattern_items:
        return text

    def replace_match(match, group_to_original):
        group_name = match.lastgroup
        if not group_name:
            return match.group(0)
        original = group_to_original.get(group_name)
        return original if original is not None else match.group(0)

    for batch_start in range(0, len(pattern_items), MAX_PATTERN_GROUPS):
        batch = pattern_items[batch_start:batch_start + MAX_PATTERN_GROUPS]
        group_to_original = {}
        group_patterns = []
        for idx, (pattern, original) in enumerate(batch):
            group_name = f"g{batch_start + idx}"
            group_patterns.append(f"(?P<{group_name}>{pattern})")
            group_to_original[group_name] = original

        compiled = re.compile("|".join(group_patterns), flags=re.IGNORECASE)
        text = compiled.sub(lambda m: replace_match(m, group_to_original), text)

    return text


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python reverse_replace_pii.py <summary_text_file> <pii_mapping_json>")
        sys.exit(1)

    summary_path = Path(sys.argv[1])
    mapping_path = Path(sys.argv[2])

    try:
        summary_text = summary_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"Error: Summary file not found: {summary_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading summary file: {e}")
        sys.exit(1)

    try:
        restored = restore_pii_in_text(summary_text, str(mapping_path))
    except Exception as e:
        print(f"Error restoring PII: {e}")
        sys.exit(1)

    output_path = summary_path.with_name(f"{summary_path.stem}_restored{summary_path.suffix}")
    try:
        output_path.write_text(restored, encoding="utf-8")
    except Exception as e:
        print(f"Error writing restored file: {e}")
        sys.exit(1)

    print(f"Restored summary written to: {output_path}")


if __name__ == "__main__":
    main()
