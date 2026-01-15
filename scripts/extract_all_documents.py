#!/usr/bin/env python3
"""
Extract all character documents from .docx files.
Outputs both raw text and embedded images.
"""

import os
import json
import re
from pathlib import Path
from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT

# Source directory
SOURCE_DIR = Path(r"C:\Users\edbar\Downloads\Character\Charactere")
OUTPUT_DIR = Path(r"C:\Users\edbar\Documents\Projects\dnd-campaign-manager\scripts\extracted_documents")

def extract_document(docx_path: Path) -> dict:
    """Extract text and images from a docx file."""
    doc = Document(docx_path)

    result = {
        "filename": docx_path.name,
        "character_name": docx_path.stem,
        "paragraphs": [],
        "full_text": "",
        "images": [],
        "image_count": 0
    }

    # Extract all paragraphs with their formatting
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            # Check for bold runs
            is_bold = False
            for run in para.runs:
                if run.bold and run.text.strip():
                    is_bold = True
                    break

            paragraphs.append({
                "text": text,
                "is_bold": is_bold,
                "style": para.style.name if para.style else None
            })

    result["paragraphs"] = paragraphs
    result["full_text"] = "\n\n".join([p["text"] for p in paragraphs])

    # Extract images
    image_dir = OUTPUT_DIR / "images" / docx_path.stem
    image_dir.mkdir(parents=True, exist_ok=True)

    image_count = 0
    for rel in doc.part.rels.values():
        if "image" in rel.reltype:
            image_count += 1
            image_data = rel.target_part.blob

            # Determine extension from content type
            content_type = rel.target_part.content_type
            ext = ".png"
            if "jpeg" in content_type or "jpg" in content_type:
                ext = ".jpg"
            elif "gif" in content_type:
                ext = ".gif"

            image_filename = f"image_{image_count:03d}{ext}"
            image_path = image_dir / image_filename

            with open(image_path, "wb") as f:
                f.write(image_data)

            result["images"].append({
                "index": image_count,
                "filename": image_filename,
                "path": str(image_path),
                "size_bytes": len(image_data)
            })

    result["image_count"] = image_count

    return result


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_documents = []

    # Process all docx files
    docx_files = sorted(SOURCE_DIR.glob("*.docx"))

    print(f"Found {len(docx_files)} document(s) to process\n")

    for docx_path in docx_files:
        print(f"Processing: {docx_path.name}")
        try:
            doc_data = extract_document(docx_path)
            all_documents.append(doc_data)

            # Save individual document text
            text_path = OUTPUT_DIR / f"{docx_path.stem}.txt"
            with open(text_path, "w", encoding="utf-8") as f:
                f.write(doc_data["full_text"])

            # Save individual document JSON with paragraph formatting info
            json_path = OUTPUT_DIR / f"{docx_path.stem}.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(doc_data, f, indent=2, ensure_ascii=False)

            print(f"  - {len(doc_data['paragraphs'])} paragraphs")
            print(f"  - {doc_data['image_count']} images")
            print(f"  - {len(doc_data['full_text'])} characters total")

        except Exception as e:
            print(f"  ERROR: {e}")

    # Save summary
    summary = {
        "total_documents": len(all_documents),
        "documents": [
            {
                "filename": d["filename"],
                "character_name": d["character_name"],
                "paragraph_count": len(d["paragraphs"]),
                "image_count": d["image_count"],
                "text_length": len(d["full_text"])
            }
            for d in all_documents
        ]
    }

    summary_path = OUTPUT_DIR / "_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Extraction complete!")
    print(f"Total documents: {len(all_documents)}")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
