#!/usr/bin/env python3
"""
Test the character document parser by sending extracted text to Google Gemini API.
This script validates that the parsing prompt correctly extracts all data.
"""

import os
import json
import sys
from pathlib import Path

# Load environment variables from .env.local
env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

import google.generativeai as genai

# Configure the API
api_key = os.environ.get('GOOGLE_GENERATIVE_AI_API_KEY')
if not api_key:
    print("ERROR: GOOGLE_GENERATIVE_AI_API_KEY not found in .env.local")
    sys.exit(1)

genai.configure(api_key=api_key)

# Use Gemini 3 Pro
model = genai.GenerativeModel('gemini-3.0-pro')

# Source directory for extracted documents
EXTRACTED_DIR = Path(__file__).parent / "extracted_documents"
OUTPUT_DIR = Path(__file__).parent / "parsed_output"

# The comprehensive parsing prompt
VAULT_CHARACTER_PARSE_PROMPT = """You are an expert at parsing D&D character documents. Your task is to extract EVERY piece of information from this document with ZERO data loss.

## CRITICAL RULES

1. **ZERO DATA LOSS**: Every single piece of information must be captured somewhere.
2. **PRESERVE ORIGINAL TEXT**: Keep the original wording and tone.
3. **PARAGRAPH BREAKS**: Use "\\n\\n" between paragraphs in backstory.
4. **NPCs ARE CRITICAL**: Extract EVERY bullet point into "full_notes".

## OUTPUT FORMAT

Return valid JSON with this structure:

{
  "character": {
    "name": "string",
    "race": "string | null",
    "class": "string | null",
    "backstory": "string with \\n\\n for paragraph breaks",
    "backstory_phases": [{"title": "string", "content": "string"}],
    "tldr": "string | null",
    "quotes": ["string"],
    "plot_hooks": ["string"],
    "theme_music_url": "string | null",
    "character_sheet_url": "string | null",
    "player_discord": "string | null",
    "player_timezone": "string | null"
  },
  "npcs": [
    {
      "name": "string",
      "nickname": "string | null",
      "relationship_type": "mentor|family|friend|enemy|patron|contact|ally|employer|love_interest|rival|other",
      "relationship_label": "string",
      "faction_affiliations": ["string"],
      "location": "string | null",
      "needs": "string | null",
      "can_provide": "string | null",
      "goals": "string | null",
      "secrets": "string | null",
      "full_notes": "string - ALL bullet points"
    }
  ],
  "companions": [
    {
      "name": "string",
      "companion_type": "familiar|pet|mount|animal_companion",
      "companion_species": "string"
    }
  ],
  "session_notes": [
    {
      "session_number": "number",
      "session_date": "string | null",
      "notes": "string",
      "kill_count": "number | null",
      "loot": "string | null",
      "thoughts_for_next": "string | null"
    }
  ],
  "writings": [
    {
      "title": "string",
      "writing_type": "letter|story|poem|diary|campfire_story",
      "content": "string",
      "recipient": "string | null"
    }
  ]
}

Extract EVERY NPC with ALL their bullet points. Nothing should be lost."""


def parse_document(document_text: str, character_name: str) -> dict:
    """Send document to Gemini API for parsing."""
    print(f"  Parsing {character_name}...")

    prompt = f"""{VAULT_CHARACTER_PARSE_PROMPT}

Parse this character document. Extract EVERY piece of information, especially NPCs with ALL their details.

Character Name: {character_name}

DOCUMENT:

{document_text}"""

    response = model.generate_content(prompt)

    # Extract JSON from response
    text = response.text
    try:
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "No JSON found", "raw_response": text[:500]}
    except json.JSONDecodeError as e:
        return {"error": str(e), "raw_response": text[:500]}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get list of text files
    txt_files = sorted(EXTRACTED_DIR.glob("*.txt"))
    print(f"Found {len(txt_files)} documents to parse\n")

    # Filter to key test files first
    test_files = [f for f in txt_files if f.stem in [
        "Anastasia Callahan",  # Has rich NPC data
        "Fleur",  # Has session notes, letters, NPCs
        "Shae Nadine Flint",  # Has DM Q&A, crew relations
    ]]

    if not test_files:
        print("No test files found, using first 3 files")
        test_files = txt_files[:3]

    results = []

    for txt_file in test_files:
        character_name = txt_file.stem
        print(f"Processing: {character_name}")

        with open(txt_file, "r", encoding="utf-8") as f:
            document_text = f.read()

        if len(document_text) < 50:
            print(f"  Skipping - too short ({len(document_text)} chars)")
            continue

        try:
            parsed = parse_document(document_text, character_name)

            # Save parsed output
            output_file = OUTPUT_DIR / f"{character_name}_parsed.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(parsed, f, indent=2, ensure_ascii=False)

            # Calculate stats
            stats = {
                "character_name": character_name,
                "input_length": len(document_text),
                "npc_count": len(parsed.get("npcs", [])),
                "companion_count": len(parsed.get("companions", [])),
                "session_count": len(parsed.get("session_notes", [])),
                "writing_count": len(parsed.get("writings", [])),
                "quote_count": len(parsed.get("character", {}).get("quotes", [])),
                "plot_hook_count": len(parsed.get("character", {}).get("plot_hooks", [])),
                "has_backstory": bool(parsed.get("character", {}).get("backstory")),
            }

            results.append(stats)

            # Show NPC names found
            npc_names = [npc.get("name", "?") for npc in parsed.get("npcs", [])]
            print(f"  NPCs found: {npc_names}")
            print(f"  Sessions: {stats['session_count']}, Writings: {stats['writing_count']}")

        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                "character_name": character_name,
                "error": str(e)
            })

    # Save summary
    summary_file = OUTPUT_DIR / "_test_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*60}")
    print("Test complete!")
    print(f"Output directory: {OUTPUT_DIR}")

    # Print summary
    if results:
        total_npcs = sum(r.get("npc_count", 0) for r in results)
        total_sessions = sum(r.get("session_count", 0) for r in results)
        total_writings = sum(r.get("writing_count", 0) for r in results)
        print(f"\nTotal NPCs extracted: {total_npcs}")
        print(f"Total Sessions extracted: {total_sessions}")
        print(f"Total Writings extracted: {total_writings}")


if __name__ == "__main__":
    main()
