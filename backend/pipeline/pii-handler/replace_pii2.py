"""
PII Replacement Engine using Dummy Values

This script replaces PII values in text with dummy values from a predefined list.
It maintains a mapping between dummy values and actual PII values for reference.
Supports persistent mappings across multiple documents.

Usage:
    python replace_pii2.py <text_file> <pii_json> <dummy_values_json> [output_dir] [pii_mapping_json]
    
Example:
    python replace_pii2.py input.txt pii.json dummy_values.json output
    python replace_pii2.py input2.txt pii.json dummy_values.json output existing_pii_mapping.json
"""

import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple, TypedDict, Union

# Change summary:
# - Added validation and bounds for PII values and regex complexity.
# - Strengthened name matching with safer gap limits and variant handling.
# - Improved typing and output path validation.

# Max number of non-alphanumeric characters allowed between name tokens.
MAX_GAP_CHARS = 6
# Flex matching is restricted to select org-like PII types to avoid
# impacting identifiers (emails, IDs, phones, dates, numeric values).
FLEXIBLE_PII_TYPES = {
    "street address",
    "person name",
    "hospital",
    "city",
}
# Conservative token caps keep matching predictable and linear-time.
MAX_FLEX_TOKENS = 12
MAX_FLEX_TOKEN_CHARS = 80
# Maximum allowed PII value length to reduce ReDoS risk in regex handling.
MAX_PII_LENGTH = 1000
# Cap total regex groups to keep compilation and execution predictable.
MAX_PATTERN_GROUPS = 500


class ReplacementDetail(TypedDict):
    original: str
    dummy: str
    occurrences: int


class SummaryEntry(TypedDict):
    count: int
    replacements: List[ReplacementDetail]


class ReplacementMetadata(TypedDict):
    mapping: Dict[str, str]
    summary: Dict[str, SummaryEntry]
    master_pii_map: Dict[str, str]
    pii_type_map: Dict[str, str]


PiiInput = Union[List[Dict[str, Any]], Dict[str, List[str]]]
      

class PIIReplacer:
    """Replace PII values with dummy values while maintaining mapping"""
    
    def __init__(self, dummy_values_file: str, existing_mapping_file: str = None):
        """
        Initialize the PII replacer with dummy values
        
        Args:
            dummy_values_file: Path to JSON file containing dummy values by PII type
            existing_mapping_file: Optional path to existing PII mapping file for consistency
        """
        self.dummy_values = self._load_dummy_values(dummy_values_file)
        self.dummy_counters = {}  # Track usage count for each PII type
        self.pii_mapping = {}  # Maps original PII value -> dummy value
        self.pii_to_original = {}  # Maps dummy value -> original PII value
        self.pii_type_mapping = {}  # Maps original PII value -> PII type
        self.used_dummy_values = set()  # Track all dummy values to avoid collisions
        self.used_dummy_values_by_type = {}  # Track dummy usage per PII type
        
        # Initialize counters
        for pii_type in self.dummy_values:
            self.dummy_counters[pii_type] = 0
        
        # Load existing mappings if provided
        if existing_mapping_file:
            self._load_existing_mapping(existing_mapping_file)

        # Initialize used dummy trackers after loading mappings
        self.used_dummy_values = set(self.pii_to_original.keys())
        for original_pii, pii_type in self.pii_type_mapping.items():
            dummy_value = self.pii_mapping.get(original_pii)
            if not dummy_value:
                continue
            if pii_type not in self.used_dummy_values_by_type:
                self.used_dummy_values_by_type[pii_type] = set()
            self.used_dummy_values_by_type[pii_type].add(dummy_value)
    
    def _load_dummy_values(self, dummy_file: str) -> Dict[str, List[str]]:
        """Load dummy values from JSON file"""
        try:
            with open(dummy_file, 'r', encoding='utf-8') as f:
                dummy_values = json.load(f)
            return dummy_values
        except FileNotFoundError:
            print(f"Error: Dummy values file not found: {dummy_file}")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in dummy values file: {dummy_file}")
            sys.exit(1)
    
    def _load_existing_mapping(self, mapping_file: str) -> None:
        """Load existing PII mappings from file for consistency across documents"""
        try:
            with open(mapping_file, 'r', encoding='utf-8') as f:
                mapping_data = json.load(f)
            
            # Handle both old format (dummy -> original) and new format (original -> dummy)
            if 'pii_mappings' in mapping_data:
                # New format: {original_pii: {dummy: value, type: pii_type}}
                for original_pii, info in mapping_data['pii_mappings'].items():
                    dummy_value = info.get('dummy')
                    pii_type = info.get('type')
                    if dummy_value:
                        self.pii_mapping[original_pii] = dummy_value
                        self.pii_to_original[dummy_value] = original_pii
                        self.pii_type_mapping[original_pii] = pii_type
            elif 'dummy_to_original' in mapping_data:
                # Old format: {dummy: original}
                for dummy, original in mapping_data['dummy_to_original'].items():
                    self.pii_to_original[dummy] = original
                    self.pii_mapping[original] = dummy
                
                # Also load type mapping if available
                if 'pii_types' in mapping_data:
                    for original, pii_type in mapping_data['pii_types'].items():
                        self.pii_type_mapping[original] = pii_type
            
            # Update counters based on actual used dummy indices per type.
            for pii_type, dummy_list in self.dummy_values.items():
                index_map = {value: idx for idx, value in enumerate(dummy_list)}
                used_indices = set()
                for original_pii, mapped_type in self.pii_type_mapping.items():
                    if mapped_type != pii_type:
                        continue
                    dummy_value = self.pii_mapping.get(original_pii)
                    idx = index_map.get(dummy_value)
                    if idx is not None:
                        used_indices.add(idx)
                next_idx = 0
                while next_idx in used_indices:
                    next_idx += 1
                if pii_type in self.dummy_counters:
                    self.dummy_counters[pii_type] = max(self.dummy_counters[pii_type], next_idx)

            # Normalize-aware collision handling: allow shared dummy only when names normalize the same.
            def _norm(value: str) -> str:
                text = unicodedata.normalize("NFKC", value or "")
                text = re.sub(r"[^\w\s]", " ", text)
                text = re.sub(r"\s+", " ", text)
                return text.strip().lower()

            self.used_dummy_values = set(self.pii_mapping.values())
            dummy_owner_norm: Dict[str, str] = {}
            for original, dummy in list(self.pii_mapping.items()):
                norm = _norm(original)
                owner_norm = dummy_owner_norm.get(dummy)
                if owner_norm is None:
                    dummy_owner_norm[dummy] = norm
                    continue
                if norm == owner_norm:
                    # Same normalized name, keep shared dummy.
                    continue
                # Different normalized names: reassign to a fresh dummy.
                pii_type = self.pii_type_mapping.get(original, 'UNKNOWN')
                new_dummy = self._get_next_dummy(pii_type)
                self.pii_mapping[original] = new_dummy
                self.pii_to_original[new_dummy] = original
                dummy_owner_norm[new_dummy] = _norm(original)

            # Rebuild reverse map to ensure first owner wins for each dummy.
            new_reverse = {}
            for original, dummy in self.pii_mapping.items():
                if dummy not in new_reverse:
                    new_reverse[dummy] = original
            self.pii_to_original = new_reverse
            
            return
        except FileNotFoundError:
            return
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in mapping file: {mapping_file}")
            sys.exit(1)
    
    def _tokenize_name(self, text: str) -> List[str]:
        """Tokenize a name into alphanumeric chunks"""
        normalized = unicodedata.normalize("NFKC", text)
        return re.findall(r"[A-Za-z0-9]+", normalized)

    def _name_variants(self, name: str) -> List[List[str]]:
        """
        Generate safe token-order variants for a name.
        Handles 'Last, First' and 'First Last' ordering.
        """
        tokens = self._tokenize_name(name)
        if not tokens:
            return []
        if len(tokens) == 1:
            return [tokens]

        variants = []
        if "," in name:
            last = tokens[0]
            first = tokens[1] if len(tokens) > 1 else tokens[0]
            middles = tokens[2:]
            variants.append([last, first] + middles)
            variants.append([first] + middles + [last])
            variants.append([last, first])
            variants.append([first, last])
        else:
            first = tokens[0]
            last = tokens[-1]
            middles = tokens[1:-1]
            variants.append([first] + middles + [last])
            variants.append([last, first] + middles)
            variants.append([first, last])
            variants.append([last, first])

        unique_variants = []
        seen = set()
        for variant in variants:
            key = tuple(variant)
            if key not in seen:
                unique_variants.append(variant)
                seen.add(key)
        return unique_variants

    def _build_name_pattern(self, tokens: List[str]) -> str:
        """Build a regex pattern for name tokens allowing punctuation/spacing noise"""
        parts = [rf"\b{re.escape(token)}\b" for token in tokens]
        # Limit gap size to reduce false positives while tolerating OCR noise.
        return rf"[\s\W_]{{0,{MAX_GAP_CHARS}}}".join(parts)

    def _build_token_pattern(self, tokens: List[str]) -> str:
        """
        Build a bounded-gap token pattern for non-person PII.
        Restricted to specific PII types to avoid overmatching identifiers.
        """
        parts = [rf"\b{re.escape(token)}\b" for token in tokens]
        return rf"[\s\W_]{{0,{MAX_GAP_CHARS}}}".join(parts)

    def _build_phone_pattern(self, value: str) -> str:
        """
        Build a safe phone pattern that tolerates common separators and
        optional leading country marker, while staying linear-time.
        """
        digits = re.findall(r"\d", value)
        if len(digits) < 7:
            return re.escape(value)
        sep = r"[\s\-\.\(\)]{0,3}"
        core = sep.join(re.escape(d) for d in digits)
        # Allow optional '+' and short separator before the first digit.
        return rf"\+?{sep}{core}\b"

    def _flex_tokens_for_value(self, value: str) -> List[str]:
        """Tokenize value for bounded-gap matching; return [] if unsafe."""
        tokens = self._tokenize_name(value)
        if len(tokens) < 2:
            return []
        if len(tokens) > MAX_FLEX_TOKENS:
            return []
        if sum(len(token) for token in tokens) > MAX_FLEX_TOKEN_CHARS:
            return []
        return tokens

    def _flex_prefix_tokens(
        self,
        tokens: List[str],
        min_prefix_tokens: int = 4,
        max_prefix_tokens: int = 5,
    ) -> List[List[str]]:
        """
        Generate limited prefix variants to allow short-form matches
        (e.g., facility names missing department suffixes).
        """
        if len(tokens) < min_prefix_tokens:
            return []
        max_len = min(max_prefix_tokens, len(tokens))
        prefixes = []
        for prefix_len in range(min_prefix_tokens, max_len + 1):
            prefixes.append(tokens[:prefix_len])
        # Deduplicate
        unique = []
        seen = set()
        for prefix in prefixes:
            key = tuple(prefix)
            if key not in seen:
                unique.append(prefix)
                seen.add(key)
        return unique
    
    def _get_next_dummy(self, pii_type: str) -> str:
        """
        Get the next available dummy value for a PII type
        Cycles through available dummy values if we run out
        
        Args:
            pii_type: Type of PII (e.g., "SSN", "Email", "Person Name")
            
        Returns:
            A dummy value from the pool
        """
        if pii_type not in self.dummy_values:
            return self._get_unique_generated_dummy(pii_type)
        
        dummy_list = self.dummy_values[pii_type]
        if not dummy_list:
            return self._get_unique_generated_dummy(pii_type)
        
        start_idx = self.dummy_counters.get(pii_type, 0)
        for offset in range(len(dummy_list)):
            idx = (start_idx + offset) % len(dummy_list)
            candidate = dummy_list[idx]
            if candidate not in self.used_dummy_values:
                self.dummy_counters[pii_type] = idx + 1
                self.used_dummy_values.add(candidate)
                self.used_dummy_values_by_type.setdefault(pii_type, set()).add(candidate)
                return candidate

        return self._get_unique_generated_dummy(pii_type)

    def _get_unique_generated_dummy(self, pii_type: str) -> str:
        """Generate a unique dummy value for a PII type"""
        count = self.dummy_counters.get(pii_type, 0)
        while True:
            candidate = f"[DUMMY_{pii_type}_{count}]"
            count += 1
            if candidate not in self.used_dummy_values:
                self.dummy_counters[pii_type] = count
                self.used_dummy_values.add(candidate)
                self.used_dummy_values_by_type.setdefault(pii_type, set()).add(candidate)
                return candidate
    
    def _escape_special_chars(self, text: str) -> str:
        """Escape special regex characters"""
        return re.escape(text)

    def _validate_pii_value(self, value: str, pii_type: str) -> None:
        """Validate a PII value before processing."""
        if value is None:
            raise ValueError(f"PII value for type '{pii_type}' is missing")
        if not value.strip():
            raise ValueError(f"PII value for type '{pii_type}' is empty after stripping whitespace")
        if len(value) > MAX_PII_LENGTH:
            truncated = value[:50] + "..."
            raise ValueError(
                f"PII value for type '{pii_type}' exceeds {MAX_PII_LENGTH} chars: '{truncated}'"
            )
        if any(not ch.isprintable() for ch in value):
            raise ValueError(f"PII value for type '{pii_type}' contains non-printable characters")

    def _normalize_pii_payload(self, pii_data: PiiInput) -> PiiInput:
        """
        Normalize incoming PII payload to replacement-safe shape.
        We only keep pii-type -> values, and if a nested {'pii': {...}} payload
        is provided we unwrap it before replacement.
        """
        if isinstance(pii_data, dict) and "pii" in pii_data and isinstance(pii_data["pii"], dict):
            return pii_data["pii"]
        return pii_data
    
    def replace_pii_in_text(self, text: str, pii_data: PiiInput) -> Tuple[str, ReplacementMetadata]:
        """
        Replace PII values in text with dummy values
        Reuses existing mappings if available, otherwise creates new ones
        
        Accepts both formats:
        - List format: [{"pii_type": "SSN", "pii_value": "123-45-6789"}, ...]
        - Dict format: {"Person Name": ["John Doe"], "Email": [...], ...}
        
        Args:
            text: The text to process
            pii_data: Either list of dicts or dict with pii_type keys
            
        Returns:
            Tuple of (modified_text, mapping_dict)
            mapping_dict: {original_pii_value: dummy_value, ...}

        Example:
            {
              "mapping": {"John Doe": "Jane Smith"},
              "summary": {
                "Person Name": {
                  "count": 2,
                  "replacements": [
                    {"original": "John Doe", "dummy": "Jane Smith", "occurrences": 2}
                  ]
                }
              },
              "master_pii_map": {"Jane Smith": "John Doe"},
              "pii_type_map": {"John Doe": "Person Name"}
            }
        """
        pii_data = self._normalize_pii_payload(pii_data)
        modified_text = text
        local_mapping = {}  # Track replacements in this text
        replacement_summary = {}
        
        # Build a list of (pii_type, pii_value) tuples, sorted by value length (longest first)
        pii_items = []
        
        if not text:
            return modified_text, {
                'mapping': local_mapping,
                'summary': replacement_summary,
                'master_pii_map': self.pii_to_original,
                'pii_type_map': self.pii_type_mapping
            }

        if isinstance(pii_data, dict):
            # Dict format: {"Person Name": ["value1", "value2"], ...}
            for pii_type, values in pii_data.items():
                if isinstance(values, list):
                    for value in values:
                        # Handle dict values like {"value": "John Doe", "context": "..."}
                        if isinstance(value, dict):
                            if 'value' in value:
                                value = value['value']
                            else:
                                continue
                        if value:  # Skip empty values
                            self._validate_pii_value(value, pii_type)
                            pii_items.append((pii_type, value))
        elif isinstance(pii_data, list):
            # List format: [{"pii_type": "...", "pii_value": "..."}, ...]
            for item in pii_data:
                if isinstance(item, dict):
                    pii_type = item.get('pii_type', 'UNKNOWN')
                    pii_value = item.get('pii_value', '')
                    if pii_value:
                        self._validate_pii_value(pii_value, pii_type)
                        pii_items.append((pii_type, pii_value))
        
        # Sort by value length (longest first) to avoid partial replacements
        pii_items.sort(key=lambda x: len(x[1]), reverse=True)
        
        total_pii = len(pii_items)
        
        if total_pii == 0:
            return modified_text, {
                'mapping': local_mapping,
                'summary': replacement_summary,
                'master_pii_map': self.pii_to_original,
                'pii_type_map': self.pii_type_mapping
            }
        
        for idx, (pii_type, pii_value) in enumerate(pii_items, 1):
            if not pii_value:
                continue
            
            if pii_value in self.pii_mapping:
                dummy_value = self.pii_mapping[pii_value]
            else:
                dummy_value = self._get_next_dummy(pii_type)
                self.pii_mapping[pii_value] = dummy_value
                self.pii_to_original[dummy_value] = pii_value
                self.pii_type_mapping[pii_value] = pii_type
            
            local_mapping[pii_value] = dummy_value

        # Single-pass replacement to avoid re-replacing dummy values.
        # Note: we don't normalize text globally because regex uses case-insensitive matching.
        pattern_items = []
        seen_patterns = set()
        for pii_type, pii_value in pii_items:
            if not pii_value:
                continue

            dummy_value = self.pii_mapping[pii_value]
            info = {
                'dummy': dummy_value,
                'type': pii_type,
                'original': pii_value
            }

            can_add_flexible = len(pattern_items) < (MAX_PATTERN_GROUPS * 4)

            if pii_type.lower() == "person name":
                # Build flexible patterns to handle punctuation and spacing noise
                if can_add_flexible:
                    for tokens in self._name_variants(pii_value):
                        pattern = self._build_name_pattern(tokens)
                        if pattern not in seen_patterns:
                            pattern_items.append((pattern, info))
                            seen_patterns.add(pattern)
                        # Allow short-form person-name prefixes in a bounded way
                        # (e.g., "John", "Smith", "John A" from "John A Smith").
                        if tokens:
                            for prefix_tokens in self._flex_prefix_tokens(
                                tokens,
                                min_prefix_tokens=1,
                                max_prefix_tokens=3,
                            ):
                                # Single-token name matching is allowed for this type,
                                # but skip very short tokens to reduce false positives.
                                if len(prefix_tokens) == 1 and len(prefix_tokens[0]) < 3:
                                    continue
                                prefix_pattern = self._build_name_pattern(prefix_tokens)
                                if prefix_pattern not in seen_patterns:
                                    pattern_items.append((prefix_pattern, info))
                                    seen_patterns.add(prefix_pattern)
                else:
                    # Fall back to exact matching when pattern budget is exhausted.
                    pattern = self._escape_special_chars(pii_value)
                    if pattern not in seen_patterns:
                        pattern_items.append((pattern, info))
                        seen_patterns.add(pattern)
            else:
                pattern = self._escape_special_chars(pii_value)
                if pattern not in seen_patterns:
                    pattern_items.append((pattern, info))
                    seen_patterns.add(pattern)
                # For phone numbers, tolerate common formatting differences
                # (e.g., +1..., (619)..., 619-..., 619....).
                if pii_type.lower() == "phone":
                    phone_pattern = self._build_phone_pattern(pii_value)
                    if phone_pattern not in seen_patterns:
                        pattern_items.append((phone_pattern, info))
                        seen_patterns.add(phone_pattern)
                # Allow bounded-gap token matching for select org-like PII types only.
                if can_add_flexible and pii_type.lower() in FLEXIBLE_PII_TYPES:
                    tokens = self._flex_tokens_for_value(pii_value)
                    if tokens:
                        pattern = self._build_token_pattern(tokens)
                        if pattern not in seen_patterns:
                            pattern_items.append((pattern, info))
                            seen_patterns.add(pattern)
                        # For hospitals and street addresses, allow short-form
                        # prefix matches (bounded), including 2-3 token forms.
                        if pii_type.lower() in {"hospital", "street address"}:
                            for prefix_tokens in self._flex_prefix_tokens(
                                tokens,
                                min_prefix_tokens=2,
                                max_prefix_tokens=5,
                            ):
                                prefix_pattern = self._build_token_pattern(prefix_tokens)
                                if prefix_pattern not in seen_patterns:
                                    pattern_items.append((prefix_pattern, info))
                                    seen_patterns.add(prefix_pattern)

        if not pattern_items:
            return modified_text, {
                'mapping': local_mapping,
                'summary': replacement_summary,
                'master_pii_map': self.pii_to_original,
                'pii_type_map': self.pii_type_mapping
            }

        # Prefer more specific patterns first to avoid shorter matches dominating.
        pattern_items.sort(key=lambda item: len(item[0]), reverse=True)

        replacement_index = {}

        def replace_match(match, group_to_info):
            group_name = match.lastgroup
            info = group_to_info.get(group_name)
            if not info:
                return match.group(0)

            pii_type = info['type']
            dummy_value = info['dummy']
            original_value = info['original']

            if pii_type not in replacement_summary:
                replacement_summary[pii_type] = {
                    'count': 0,
                    'replacements': []
                }

            replacement_summary[pii_type]['count'] += 1
            key = (pii_type, original_value)
            entry = replacement_index.get(key)
            if entry is None:
                entry = {
                    'original': original_value,
                    'dummy': dummy_value,
                    'occurrences': 0
                }
                replacement_summary[pii_type]['replacements'].append(entry)
                replacement_index[key] = entry
            entry['occurrences'] += 1

            return dummy_value

        # Batch regex compilation to limit group count and reduce ReDoS risk.
        for batch_start in range(0, len(pattern_items), MAX_PATTERN_GROUPS):
            batch = pattern_items[batch_start:batch_start + MAX_PATTERN_GROUPS]
            group_to_info = {}
            group_patterns = []
            for idx, (pattern, info) in enumerate(batch):
                group_name = f"g{batch_start + idx}"
                group_patterns.append(f"(?P<{group_name}>{pattern})")
                group_to_info[group_name] = info

            compiled = re.compile(
                "|".join(group_patterns),
                flags=re.IGNORECASE
            )
            modified_text = compiled.sub(lambda m: replace_match(m, group_to_info), modified_text)
        
        return modified_text, {
            'mapping': local_mapping,
            'summary': replacement_summary,
            'master_pii_map': self.pii_to_original,
            'pii_type_map': self.pii_type_mapping
        }


def load_pii_from_json(pii_file: str) -> List[Dict[str, str]]:
    """
    Load PII data from JSON file
    
    Supports two formats:
    1. List format: [{"pii_type": "SSN", "pii_value": "123-45-6789"}, ...]
    2. Dict format: {"SSN": ["123-45-6789", "987-65-4321"], "Email": [...]}
    """
    try:
        with open(pii_file, 'r', encoding='utf-8') as f:
            pii_data = json.load(f)
        
        # Handle both formats
        if isinstance(pii_data, list):
            # Already in list format
            print(f"Loaded {len(pii_data)} PII items from: {pii_file} (list format)")
            return pii_data
        
        if isinstance(pii_data, dict):
            # Handle nested format: {"pii": {"Person Name": [...], ...}}
            if 'pii' in pii_data:
                pii_data = pii_data['pii']
            
            if 'pii_list' in pii_data:
                converted = pii_data['pii_list']
                return converted
            
            converted_list = []
            total_items = 0
            
            for pii_type, values in pii_data.items():
                if isinstance(values, list):
                    for value in values:
                        # Skip empty values and non-string values (like dicts)
                        if isinstance(value, dict):
                            # Extract value from dict if it has a 'value' key
                            if 'value' in value:
                                value = value['value']
                            else:
                                continue
                        if value:
                            converted_list.append({
                                'pii_type': pii_type,
                                'pii_value': str(value)
                            })
                            total_items += 1
                elif values:  # Handle non-list values (strings)
                    converted_list.append({
                        'pii_type': pii_type,
                        'pii_value': str(values)
                    })
                    total_items += 1
            
            return converted_list
        
        else:
            print(f"Error: Unexpected PII JSON format. Expected list or dict.")
            sys.exit(1)
            
    except FileNotFoundError:
        print(f"Error: PII file not found: {pii_file}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in PII file: {pii_file}")
        sys.exit(1)


def load_text(text_file: str) -> str:
    """Load text from file"""
    try:
        with open(text_file, 'r', encoding='utf-8') as f:
            text = f.read()
        return text
    except FileNotFoundError:
        print(f"Error: Text file not found: {text_file}")
        sys.exit(1)


def _validate_output_dir(output_dir: str) -> Path:
    """Validate output dir to prevent path traversal and unsafe absolute paths."""
    output_path = Path(output_dir)
    if ".." in output_path.parts:
        raise ValueError("Invalid output_dir: path traversal is not allowed")
    resolved = output_path.resolve()
    cwd = Path.cwd().resolve()
    if resolved.is_absolute() and cwd not in resolved.parents and resolved != cwd:
        raise ValueError("Invalid output_dir: must be within the current working directory")
    return resolved


def save_output(output_dir: str, sanitized_text: str, metadata: Dict, replacer: 'PIIReplacer' = None) -> Path:
    """Save sanitized text and metadata to output directory"""
    output_path = _validate_output_dir(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    text_output_path = output_path / "sanitized_text.txt"
    with open(text_output_path, 'w', encoding='utf-8') as f:
        f.write(sanitized_text)
    
    mapping_output_path = output_path / "pii_mapping.json"
    
    pii_mappings = {}
    if replacer:
        for original_pii, dummy_value in replacer.pii_mapping.items():
            pii_type = replacer.pii_type_mapping.get(original_pii, 'UNKNOWN')
            pii_mappings[original_pii] = {
                'dummy': dummy_value,
                'type': pii_type
            }
    
    mapping_data = {
        'pii_mappings': pii_mappings,
        'dummy_to_original': metadata['master_pii_map'],
        'pii_types': metadata['pii_type_map'],
        'replacement_summary': metadata['summary']
    }
    with open(mapping_output_path, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, indent=2)
    print(f"Saved PII mapping to: {mapping_output_path}")
    
    # Save detailed report
    report_output_path = output_path / "replacement_report.json"
    report = {
        'total_replacements': sum(
            item['count'] for item in metadata['summary'].values()
        ),
        'pii_types_found': list(metadata['summary'].keys()),
        'replacement_details': metadata['summary']
    }
    with open(report_output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    return mapping_output_path


def main() -> None:
    """Main entry point"""
    if len(sys.argv) < 4:
        print(__doc__)
        print("\nArguments:")
        print("  text_file           : Path to text file to process")
        print("  pii_json            : Path to JSON file with PII list")
        print("  dummy_values_json   : Path to JSON file with dummy values")
        print("  output_dir          : Output directory (default: ./pii_output)")
        print("  pii_mapping_json    : Optional existing PII mapping file for consistency")
        sys.exit(1)
    
    text_file = sys.argv[1]
    pii_json = sys.argv[2]
    dummy_json = sys.argv[3]
    output_dir = sys.argv[4] if len(sys.argv) > 4 else "pii_output"
    mapping_file = sys.argv[5] if len(sys.argv) > 5 else None
    
    # Load and process
    text = load_text(text_file)
    pii_list = load_pii_from_json(pii_json)
    
    # Process
    replacer = PIIReplacer(dummy_json, mapping_file)
    sanitized_text, metadata = replacer.replace_pii_in_text(text, pii_list)
    
    # Save outputs
    mapping_path = save_output(output_dir, sanitized_text, metadata, replacer)
    
    total_replacements = sum(item['count'] for item in metadata['summary'].values())
    print(f"OK: PII replacement completed: {total_replacements} replacements in {len(replacer.pii_mapping)} mapped values")


if __name__ == "__main__":
    main()
