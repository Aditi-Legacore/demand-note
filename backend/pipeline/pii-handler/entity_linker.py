"""
Entity linker for Person Name aliases across chunks.

Normalizes names and merges new detections into canonical PERSON_# entities.
"""

import re
from typing import Dict, List, Optional, Tuple


def _normalize_name(name: str) -> str:
    """Lowercase, strip extra spaces, remove punctuation."""
    if not name:
        return ""
    # Remove punctuation but keep letters/numbers/spaces.
    cleaned = re.sub(r"[^\w\s]", " ", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


def _tokenize(name: str) -> List[str]:
    normalized = _normalize_name(name)
    return normalized.split() if normalized else []

def _split_name(name: str) -> Optional[Tuple[str, List[str], str]]:
    """
    Split name into (first, middles, last).
    If comma exists, assume "Last, First [Middle...]".
    """
    tokens = _tokenize(name)
    if len(tokens) < 2:
        return None
    if "," in name:
        last = tokens[0]
        first = tokens[1]
        middles = tokens[2:]
    else:
        first = tokens[0]
        last = tokens[-1]
        middles = tokens[1:-1]
    return first, middles, last


def _is_prefix_match(short_tokens: List[str], long_tokens: List[str]) -> bool:
    if not short_tokens or not long_tokens:
        return False
    if len(short_tokens) > len(long_tokens):
        return False
    # Strong prefix: tokens must align in order.
    if short_tokens != long_tokens[: len(short_tokens)]:
        return False
    # Require last-name agreement when both sides look like full names.
    if len(short_tokens) >= 2 and len(long_tokens) >= 2:
        if short_tokens[-1] != long_tokens[-1]:
            return False
    # Limit expansion to avoid overmatching.
    return (len(long_tokens) - len(short_tokens)) <= 2


def _is_initial_compatible(short_tokens: List[str], long_tokens: List[str]) -> bool:
    """
    Allow initials and slight variations:
    - "john d" matches "john doe"
    - "j doe" matches "john doe"
    """
    if not short_tokens or not long_tokens:
        return False
    if len(short_tokens) > len(long_tokens):
        return False
    # Require last-name agreement when both sides look like full names.
    if len(short_tokens) >= 2 and len(long_tokens) >= 2:
        if short_tokens[-1] != long_tokens[-1]:
            return False
    for idx, token in enumerate(short_tokens):
        if idx >= len(long_tokens):
            return False
        if len(token) == 1:
            if token[0] != long_tokens[idx][0]:
                return False
        else:
            if token != long_tokens[idx]:
                return False
    return True


def _single_token_match(token: str, tokens: List[str]) -> bool:
    """
    Conservative single-token match:
    - Allow if token matches first or last token in a 2-token name.
    """
    if not token or not tokens:
        return False
    if len(tokens) != 2:
        return False
    return token == tokens[0] or token == tokens[1]


def _last_first_match(name_a: str, name_b: str) -> bool:
    """
    Match by last name + first name (or first initial). Ignore middle names.
    """
    parts_a = _split_name(name_a)
    parts_b = _split_name(name_b)
    if not parts_a or not parts_b:
        return False
    first_a, _, last_a = parts_a
    first_b, _, last_b = parts_b
    if last_a != last_b:
        return False
    if first_a == first_b:
        return True
    # Allow first-initial match to handle "Abbie" vs "A"
    return first_a[0] == first_b[0]


def _names_match(name_a: str, name_b: str) -> bool:
    if not name_a or not name_b:
        return False
    if _normalize_name(name_a) == _normalize_name(name_b):
        return True
    tokens_a = _tokenize(name_a)
    tokens_b = _tokenize(name_b)
    if not tokens_a or not tokens_b:
        return False

    # Single-token edge case (very conservative).
    if len(tokens_a) == 1 and _single_token_match(tokens_a[0], tokens_b):
        return True
    if len(tokens_b) == 1 and _single_token_match(tokens_b[0], tokens_a):
        return True

    # Prefer strong prefix in either direction.
    if _is_prefix_match(tokens_a, tokens_b) or _is_prefix_match(tokens_b, tokens_a):
        return True
    # Allow initial compatibility in either direction.
    if _is_initial_compatible(tokens_a, tokens_b) or _is_initial_compatible(tokens_b, tokens_a):
        return True
    # Last+first match (ignoring middles), supports comma ordering.
    if _last_first_match(name_a, name_b):
        return True

    return False


def _next_person_key(existing: Dict[str, List[str]]) -> str:
    max_idx = 0
    for key in existing.keys():
        if key.startswith("PERSON_"):
            try:
                idx = int(key.split("_", 1)[1])
                max_idx = max(max_idx, idx)
            except ValueError:
                continue
    return f"PERSON_{max_idx + 1}"


def resolve_entity_key(name: str, entities: Dict[str, List[str]]) -> Optional[str]:
    """Return the canonical key for a name, if matched."""
    for key in sorted(entities.keys(), key=lambda k: int(k.split("_")[1])):
        aliases = entities.get(key, [])
        for alias in aliases:
            if _names_match(name, alias):
                return key
    return None


def merge_person_entities(
    new_names: List[str],
    existing_entities: Dict[str, List[str]],
) -> Dict[str, List[str]]:
    """
    Merge new names into canonical entities.

    Returns updated entities with normalized aliases.
    """
    # Normalize existing aliases for deterministic behavior.
    normalized_entities: Dict[str, List[str]] = {}
    for key, aliases in existing_entities.items():
        seen = set()
        normalized_list: List[str] = []
        for alias in aliases:
            normalized = _normalize_name(alias)
            if normalized and normalized not in seen:
                normalized_list.append(normalized)
                seen.add(normalized)
        normalized_entities[key] = normalized_list

    # Process new names in order.
    for raw_name in new_names:
        if not raw_name or not raw_name.strip():
            continue
        normalized = _normalize_name(raw_name)
        if not normalized:
            continue

        key = resolve_entity_key(normalized, normalized_entities)
        if key is None:
            key = _next_person_key(normalized_entities)
            normalized_entities[key] = []

        if normalized not in normalized_entities[key]:
            normalized_entities[key].append(normalized)

    return normalized_entities


__all__ = [
    "merge_person_entities",
    "resolve_entity_key",
    "_normalize_name",
    "assign_dummies_to_canonicals",
]


def assign_dummies_to_canonicals(
    canonical_person_to_dummy: Dict[str, str],
    pii_aliases: Dict[str, List[str]],
    dummy_pool: List[str],
) -> Dict[str, str]:
    """
    Assign a unique dummy to each canonical person ID without collisions.
    """
    used = set(canonical_person_to_dummy.values())
    pool_iter = (d for d in dummy_pool if d not in used)

    # Determine next synthetic index after pool size and any existing synthetic dummies.
    next_index = len(dummy_pool) + 1
    for dummy in used:
        if dummy.startswith("PERSON_"):
            try:
                idx = int(dummy.split("_", 1)[1])
                next_index = max(next_index, idx + 1)
            except ValueError:
                continue

    for canonical_id in pii_aliases.keys():
        if canonical_id in canonical_person_to_dummy:
            continue
        try:
            candidate = next(pool_iter)
        except StopIteration:
            candidate = f"PERSON_{next_index}"
            next_index += 1
        if candidate in used:
            continue
        canonical_person_to_dummy[canonical_id] = candidate
        used.add(candidate)

    return canonical_person_to_dummy
