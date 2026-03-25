"""
Combine sanitized chunk files into one file-level text.

Input:
- chunks directory path containing files like chunk_0001_s.txt

Output:
- root-level file in parent directory of chunks, default: sanitized_full.txt
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional, Union
import re


def _chunk_sort_key(path: Path) -> tuple:
    match = re.search(r"chunk_(\d+)_s\.txt$", path.name)
    if not match:
        return (1, path.name)
    return (0, int(match.group(1)))


def combine_sanitized_chunks(
    chunks_dir: Union[str, Path],
    output_filename: str = "sanitized_full.txt",
) -> Optional[Path]:
    """
    Combine all sanitized chunk texts into a single output file.

    Args:
        chunks_dir: Directory containing chunk_XXXX_s.txt files
        output_filename: Output filename written at root level (parent of chunks_dir)

    Returns:
        Output file path, or None if no sanitized chunks are found.
    """
    chunks_path = Path(chunks_dir)
    if not chunks_path.exists() or not chunks_path.is_dir():
        return None

    sanitized_files = sorted(chunks_path.glob("chunk_*_s.txt"), key=_chunk_sort_key)
    if not sanitized_files:
        return None

    combined_parts = []
    for file_path in sanitized_files:
        text = file_path.read_text(encoding="utf-8")
        combined_parts.append(text.rstrip())

    output_path = chunks_path.parent / output_filename
    output_path.write_text("\n\n".join(combined_parts).strip() + "\n", encoding="utf-8")
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Combine chunk_XXXX_s.txt files into one root-level sanitized text file."
    )
    parser.add_argument("chunks_dir", help="Path to chunks directory")
    parser.add_argument(
        "--output",
        default="sanitized_full.txt",
        help="Output filename in parent directory of chunks (default: sanitized_full.txt)",
    )
    args = parser.parse_args()

    combined = combine_sanitized_chunks(args.chunks_dir, args.output)
    if not combined:
        print("No sanitized chunk files found or invalid chunks directory.")
        return 1

    print(str(combined))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
