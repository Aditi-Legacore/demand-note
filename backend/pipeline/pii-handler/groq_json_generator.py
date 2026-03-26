#!/usr/bin/env python3
"""
Groq JSON Generator
Invokes Groq API to generate JSON output based on a prompt and input text.
Only JSON is returned as output.
"""

import sys
import os
import json
import urllib.request
import urllib.error
from urllib.parse import quote
from pathlib import Path
from groq import Groq


def _is_gemini_model(model: str) -> bool:
    return str(model or "").lower().startswith("gemini")


def _normalize_gemini_model_name(model: str) -> str:
    """
    Accepts user-friendly variants like:
    - 'gemini 2.5 pro'
    - 'gemini-2.5-pro'
    and normalizes to API model id style.
    """
    cleaned = " ".join(str(model or "").strip().split()).lower()
    aliases = {
        "gemini 2.5 pro": "gemini-2.5-pro",
        "gemini 2.5 flash": "gemini-2.5-flash",
        "gemini 2.0 flash": "gemini-2.0-flash",
        "gemini 1.5 pro": "gemini-1.5-pro",
        "gemini 1.5 flash": "gemini-1.5-flash",
    }
    if cleaned in aliases:
        return aliases[cleaned]
    return cleaned.replace(" ", "-")


def _extract_json_text_from_gemini_response(payload: dict) -> str:
    """
    Extract model text from Gemini generateContent response.
    """
    candidates = payload.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini response has no candidates")
    first = candidates[0] or {}
    content = first.get("content", {}) or {}
    parts = content.get("parts", []) or []
    text_chunks = []
    for part in parts:
        if isinstance(part, dict) and "text" in part and part["text"] is not None:
            text_chunks.append(str(part["text"]))
    text = "\n".join(text_chunks).strip()
    if not text:
        raise ValueError("Gemini response did not contain text content")
    return text


def _generate_json_from_gemini(prompt: str, input_text: str, model: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    full_prompt = f"""{prompt}

INPUT TEXT:
{input_text}

INSTRUCTIONS:
- Generate ONLY valid JSON output
- Do not include any text before or after the JSON
- Do not include markdown code blocks
- Ensure the JSON is properly formatted and valid"""

    normalized_model = _normalize_gemini_model_name(model)
    url_model = quote(normalized_model, safe="")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{url_model}:generateContent?key={api_key}"
    request_payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
    }
    data = json.dumps(request_payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    print(f">> Calling Gemini API with model: {normalized_model}", file=sys.stderr)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API HTTP {e.code}: {error_body[:300]}")
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed: {e}")

    payload = json.loads(raw)
    response_text = _extract_json_text_from_gemini_response(payload)

    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("\n", 1)[0]
        response_text = response_text.strip()

    try:
        json_output = json.loads(response_text)
        print("✅ Successfully generated JSON from Gemini", file=sys.stderr)
        return json_output
    except json.JSONDecodeError as e:
        print("❌ Error: Gemini output is not valid JSON", file=sys.stderr)
        print(f"   Error: {e}", file=sys.stderr)
        print(f"   Response: {response_text[:200]}...", file=sys.stderr)
        raise ValueError(f"Invalid JSON from Gemini: {e}")


def generate_json_from_groq(prompt: str, input_text: str, model: str = "openai/gpt-oss-120b") -> dict:
    """
    Invoke Groq to generate JSON output based on prompt and input text.

    Args:
        prompt: The instruction/prompt for Groq
        input_text: The input text to process
        model: Groq model to use (default: mixtral-8x7b-32768)

    Returns:
        Parsed JSON output from Groq

    Raises:
        ValueError: If Groq output is not valid JSON
        Exception: If API call fails
    """

    # Route to Gemini when a Gemini model is requested.
    if _is_gemini_model(model):
        return _generate_json_from_gemini(prompt, input_text, model)

    # Initialize Groq client (uses GROQ_API_KEY environment variable)
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Please set it to use Groq API.")
    
    client = Groq(api_key=api_key)

    # Construct the message with explicit JSON-only instruction
    full_prompt = f"""{prompt}

INPUT TEXT:
{input_text}

INSTRUCTIONS:
- Generate ONLY valid JSON output
- Do not include any text before or after the JSON
- Do not include markdown code blocks
- Ensure the JSON is properly formatted and valid"""

    # Call Groq API
    print(f">> Calling Groq API with model: {model}", file=sys.stderr)

    message = client.chat.completions.create(
        model=model,
       # reasoning_format="hidden",
        messages=[
            {
                "role": "user",
                "content": full_prompt
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3,  # Lower temperature for more consistent JSON output
        max_tokens=40960
    )

    # Extract response text
    response_text = message.choices[0].message.content.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```"): 
        # Remove opening ```json or ```
        response_text = response_text.split("\n", 1)[1]
        # Remove closing ```
        if response_text.endswith("```"):
            response_text = response_text.rsplit("\n", 1)[0]
        response_text = response_text.strip()
        
    usage = message.usage
    print(f"\nToken Usage:")
    print(f"Prompt tokens: {usage.prompt_tokens}")
    print(f"Completion tokens: {usage.completion_tokens}")
    print(f"Total tokens: {usage.total_tokens}")

    # Parse JSON
    try:
        json_output = json.loads(response_text)
        print(f"✅ Successfully generated JSON from Groq", file=sys.stderr)
        return json_output
    except json.JSONDecodeError as e:
        print(f"❌ Error: Groq output is not valid JSON", file=sys.stderr)
        print(f"   Error: {e}", file=sys.stderr)
        print(f"   Response: {response_text[:200]}...", file=sys.stderr)
        raise ValueError(f"Invalid JSON from Groq: {e}")

def load_text_file(file_path: str) -> str:
    """Load text from file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ Error: File '{file_path}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading file: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    
    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Usage: python groq_json_generator.py <prompt_text_or_file> <input_text_or_file> [--output <output_file>] [model]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print("  prompt_text_or_file  - Direct prompt text or path to prompt file", file=sys.stderr)
        print("  input_text_or_file   - Direct input text or path to input file", file=sys.stderr)
        print("  --output <file>      - Optional output file to save JSON (stdout if not specified)", file=sys.stderr)
        print("  model                - Optional Groq model (default: qwen/qwen3-32b)", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  python groq_json_generator.py 'Extract entities as JSON' 'John lives in NYC'", file=sys.stderr)
        print("  python groq_json_generator.py prompt.txt input.txt", file=sys.stderr)
        print("  python groq_json_generator.py prompt.txt input.txt --output output.json", file=sys.stderr)
        sys.exit(1)
    
    prompt_arg = sys.argv[1]
    input_arg = sys.argv[2]
    
    # Parse optional arguments
    output_file = None
    model = "qwen/qwen3-32b"
    
    i = 3
    while i < len(sys.argv):
        if sys.argv[i] == "--output" and i + 1 < len(sys.argv):
            output_file = sys.argv[i + 1]
            i += 2
        else:
            model = sys.argv[i]
            i += 1
    
    # Load prompt (file if exists, otherwise treat as direct text)
    if Path(prompt_arg).exists():
        print(f"📖 Loading prompt from: {prompt_arg}", file=sys.stderr)
        prompt = load_text_file(prompt_arg)
    else:
        prompt = prompt_arg
    
    # Load input text (file if exists, otherwise treat as direct text)
    if Path(input_arg).exists():
        print(f"📄 Loading input from: {input_arg}", file=sys.stderr)
        input_text = load_text_file(input_arg)
    else:
        input_text = input_arg
    
    try:
        # Generate JSON from Groq
        json_output = generate_json_from_groq(prompt, input_text, model)
        
        # Output JSON
        json_str = json.dumps(json_output, indent=2)
        
        if output_file:
            # Save to file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(json_str)
            print(f"✅ JSON saved to: {output_file}", file=sys.stderr)
        else:
            # Print to stdout
            print(json_str)
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
