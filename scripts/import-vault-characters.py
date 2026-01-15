#!/usr/bin/env python3
"""
Comprehensive Vault Character Import Script - Enhanced Schema
Extracts ALL character data from Word documents into the new enhanced schema.
Supports: physical appearance, relationships, NPCs, backstory phases, companions, etc.
"""

import os
import sys
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

try:
    from docx import Document
    from docx.opc.exceptions import PackageNotFoundError
except ImportError:
    print("Installing python-docx...")
    os.system(f"{sys.executable} -m pip install python-docx")
    from docx import Document
    from docx.opc.exceptions import PackageNotFoundError

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests")
    import requests


# =============================================================================
# CONFIGURATION
# =============================================================================

CHARACTERS_DIR = r"C:\Users\edbar\Downloads\Character\Charactere"
API_URL = "http://localhost:3000/api/vault/import"
OUTPUT_FILE = r"C:\Users\edbar\Downloads\Character\vault_characters_import.json"
DEFAULT_GAME_SYSTEM = "D&D 5e"
DEFAULT_PRONOUNS = "she/her"


# =============================================================================
# TEXT UTILITIES
# =============================================================================

def normalize_text(text: str) -> str:
    """Normalize Unicode characters and clean up text."""
    if not text:
        return ""
    text = unicodedata.normalize('NFKC', text)
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(''', "'").replace(''', "'")
    text = text.replace('–', '-').replace('—', '-')
    return text.strip()


def fix_formatting(text: str) -> str:
    """Apply markdown formatting fixes."""
    if not text:
        return text

    # Protect quoted text from being split
    quotes_placeholder = {}
    quote_pattern = re.compile(r'"[^"]+(?:\.[^"]+)*"')

    def protect_quote(match):
        key = f"__QUOTE_{len(quotes_placeholder)}__"
        quotes_placeholder[key] = match.group(0)
        return key

    text = quote_pattern.sub(protect_quote, text)

    # Ensure headers have blank lines before them
    text = re.sub(r'([^\n])\n(#{1,3} )', r'\1\n\n\2', text)

    # Add paragraph breaks after sentences ending with period + capital letter
    text = re.sub(r'\.(\s+)([A-Z][a-z]{2,})', r'.\n\n\2', text)

    # Make sub-section titles bold
    subsection_patterns = [
        r'^(Early Life|Student Life|Adult Life|Childhood|Backstory|History|Background):?\s*$',
        r'^(Appearance|Personality|Goals|Secrets|Fears|Weaknesses):?\s*$',
        r'^(Relationships|Family|Friends|Allies|Enemies):?\s*$',
        r'^(Equipment|Inventory|Possessions|Items):?\s*$',
    ]
    for pattern in subsection_patterns:
        text = re.sub(pattern, r'**\1**', text, flags=re.MULTILINE | re.IGNORECASE)

    # Restore quotes
    for key, value in quotes_placeholder.items():
        text = text.replace(key, value)

    return text


def fix_common_typos(text: str) -> str:
    """Fix common typos."""
    if not text:
        return text

    typos = {
        'Rouge': 'Rogue',
        'rouge': 'rogue',
        'Palyer': 'Player',
        'palyer': 'player',
        'Charcter': 'Character',
        'charcter': 'character',
        'recieve': 'receive',
        'Recieve': 'Receive',
        'seperate': 'separate',
        'Seperate': 'Separate',
        'occured': 'occurred',
        'Occured': 'Occurred',
        'definately': 'definitely',
        'Definately': 'Definitely',
    }

    for typo, correction in typos.items():
        text = text.replace(typo, correction)

    return text


# =============================================================================
# DOCUMENT EXTRACTION
# =============================================================================

def extract_paragraphs(filepath: str) -> list[str]:
    """Extract all paragraphs from a docx file."""
    try:
        doc = Document(filepath)
    except PackageNotFoundError:
        print(f"  Error: Could not open {filepath}")
        return []

    paragraphs = []

    for para in doc.paragraphs:
        text = normalize_text(para.text)
        if text:
            # Check if it's a heading
            if para.style and para.style.name.startswith('Heading'):
                level = para.style.name.replace('Heading ', '')
                try:
                    level_num = int(level)
                    prefix = '#' * level_num
                    paragraphs.append(f"{prefix} {text}")
                except ValueError:
                    paragraphs.append(f"## {text}")
            else:
                paragraphs.append(text)

    # Also get table content
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                paragraphs.append(" | ".join(cells))

    return paragraphs


def extract_full_text(paragraphs: list[str]) -> str:
    """Join paragraphs into full text."""
    return "\n".join(paragraphs)


# =============================================================================
# SECTION EXTRACTION
# =============================================================================

def is_section_header(text: str) -> bool:
    """Check if text looks like a section header."""
    headers = [
        'backstory', 'background', 'early life', 'adult life', 'student life',
        'quotes', 'session', 'notes', 'tldr', 'important people', 'npcs',
        'how she bonds', 'how he bonds', 'the good path', 'new friend',
        'what she knows', 'what he knows', 'appearance', 'personality',
        'goals', 'secrets', 'fears', 'relationships', 'companions'
    ]
    lower = text.lower().strip()
    for h in headers:
        if lower == h or lower.startswith(h + ':') or lower.startswith(h + ' '):
            return True
    if text.startswith('#'):
        return True
    if len(text) < 40 and re.match(r'^[A-Z][a-z]+(\s+[A-Za-z]+){0,4}$', text):
        return True
    return False


def find_section(paragraphs: list[str], headers: list[str], stop_headers: list[str] = None) -> str:
    """Extract content between a header and the next header."""
    content = []
    in_section = False

    for para in paragraphs:
        lower = para.lower().strip()

        # Check if this is our target section
        for header in headers:
            if lower == header or lower.startswith(header + ':') or lower.startswith(header + ' '):
                in_section = True
                # Get rest of line after header
                rest = para[len(header):].strip().lstrip(':').strip()
                if rest:
                    content.append(rest)
                break
            if para.startswith('#') and header in lower:
                in_section = True
                break
        else:
            if in_section:
                # Check if we should stop
                if stop_headers:
                    for sh in stop_headers:
                        if lower == sh or lower.startswith(sh + ':') or lower.startswith(sh + ' '):
                            return '\n\n'.join(content)
                        if para.startswith('#') and sh in lower:
                            return '\n\n'.join(content)

                # Check for any section header
                if is_section_header(para) and not any(h in lower for h in headers):
                    return '\n\n'.join(content)

                content.append(para)

    return '\n\n'.join(content)


def extract_bullet_points(text: str) -> list[str]:
    """Extract bullet points from text."""
    if not text:
        return []

    bullets = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith(('- ', '• ', '* ', '· ')):
            content = line[2:].strip()
            if content and len(content) > 3:
                bullets.append(content)

    return bullets


# =============================================================================
# PHYSICAL APPEARANCE EXTRACTION
# =============================================================================

def extract_physical_appearance(paragraphs: list[str], full_text: str) -> dict:
    """Extract physical appearance details."""
    appearance = {}

    # Look for biodata table patterns
    patterns = {
        'height': [r'height[:\s]+([^\n|,]+)', r'(\d+[\'"\s]*\d*["\s]*)(?:\s*tall)?'],
        'weight': [r'weight[:\s]+([^\n|,]+)', r'(\d+\s*(?:lbs?|kg|pounds?))'],
        'hair': [r'hair[:\s]+([^\n|,]+)', r'hair\s*(?:color)?[:\s]*([a-zA-Z]+\s*[a-zA-Z]*)'],
        'eyes': [r'eyes?[:\s]+([^\n|,]+)', r'eye\s*(?:color)?[:\s]*([a-zA-Z]+)'],
        'skin': [r'skin[:\s]+([^\n|,]+)', r'complexion[:\s]+([^\n|,]+)'],
        'voice': [r'voice[:\s]+([^\n|,]+)'],
        'age': [r'age[:\s]+([^\n|,]+)', r'(\d+)\s*years?\s*old'],
    }

    for field, field_patterns in patterns.items():
        for pattern in field_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if value and len(value) < 100:
                    appearance[field] = value
                    break

    # Look for distinguishing marks
    marks_pattern = r'(?:scar|tattoo|birthmark|marking)[s]?[:\s]+([^\n.]+)'
    match = re.search(marks_pattern, full_text, re.IGNORECASE)
    if match:
        appearance['distinguishing_marks'] = match.group(1).strip()

    return appearance


# =============================================================================
# NPC/RELATIONSHIP EXTRACTION
# =============================================================================

def is_npc_header(text: str, char_name: str) -> bool:
    """Check if text looks like an NPC name header."""
    if char_name and char_name.lower().split()[0] in text.lower():
        return False

    section_words = [
        'backstory', 'background', 'early', 'adult', 'student', 'quotes',
        'session', 'notes', 'tldr', 'important', 'npcs', 'bonds', 'path',
        'friend', 'knows', 'life', 'the', 'how', 'what', 'new'
    ]
    lower = text.lower()
    if any(lower.startswith(w) for w in section_words):
        return False

    description_starts = [
        'dont', "don't", 'has ', 'is ', 'was ', 'very ', 'needs', 'uses ',
        'he ', 'she ', 'they ', 'his ', 'her ', 'their ', 'interesting',
        'talks ', 'dislikes', 'loves ', 'enjoys ', 'hates ', 'favors'
    ]
    if any(lower.startswith(w) for w in description_starts):
        return False

    if len(text) < 50:
        name_pattern = r'^[A-Z][a-z]+(\s+(de|von|van|la|el|[A-Z][a-z]+))*(\s*-\s*[A-Za-z\.]+)?$'
        if re.match(name_pattern, text):
            if len(text) > 3 and text.lower() not in ['dad', 'mom', 'mother', 'father']:
                return True
    return False


def extract_relationships(paragraphs: list[str], char_name: str) -> list[dict]:
    """Extract NPC/relationship information."""
    relationships = []
    current_npc = None
    current_details = []
    in_npc_section = False

    for i, para in enumerate(paragraphs):
        lower = para.lower()

        # Detect NPC section start
        if 'how she bonds' in lower or 'how he bonds' in lower or 'important people' in lower or 'npcs' in lower:
            in_npc_section = True
            continue

        if in_npc_section or i > len(paragraphs) // 2:
            if is_npc_header(para, char_name):
                if current_npc and current_details:
                    relationships.append({
                        'related_name': current_npc,
                        'description': ' '.join(current_details)[:1000],
                        'relationship_type': 'other'
                    })
                current_npc = para.strip()
                if ' - ' in current_npc:
                    parts = current_npc.split(' - ')
                    current_npc = parts[0].strip()
                current_details = []
            elif current_npc:
                if len(para) < 500:
                    current_details.append(para)

    if current_npc and current_details:
        relationships.append({
            'related_name': current_npc,
            'description': ' '.join(current_details)[:1000],
            'relationship_type': 'other'
        })

    # Determine relationship types
    for rel in relationships:
        details_lower = rel['description'].lower()

        if any(w in details_lower for w in ['father', 'dad', 'mother', 'mom', 'parent', 'brother', 'sister', 'sibling', 'twin']):
            rel['relationship_type'] = 'family'
            if 'father' in details_lower or 'dad' in details_lower:
                rel['relationship_label'] = 'Father'
            elif 'mother' in details_lower or 'mom' in details_lower:
                rel['relationship_label'] = 'Mother'
            elif 'brother' in details_lower:
                rel['relationship_label'] = 'Brother'
            elif 'sister' in details_lower:
                rel['relationship_label'] = 'Sister'
            elif 'twin' in details_lower:
                rel['relationship_label'] = 'Twin'
        elif any(w in details_lower for w in ['patron', 'warlock']):
            rel['relationship_type'] = 'patron'
            rel['relationship_label'] = 'Patron'
        elif any(w in details_lower for w in ['mentor', 'teacher', 'master', 'tutor']):
            rel['relationship_type'] = 'mentor'
            rel['relationship_label'] = 'Mentor'
        elif any(w in details_lower for w in ['friend', 'ally']):
            rel['relationship_type'] = 'friend'
            rel['relationship_label'] = 'Friend'
        elif any(w in details_lower for w in ['enemy', 'rival', 'nemesis', "don't trust"]):
            rel['relationship_type'] = 'enemy'
            rel['relationship_label'] = 'Enemy'
        elif any(w in details_lower for w in ['love', 'romantic', 'partner', 'spouse', 'husband', 'wife']):
            rel['relationship_type'] = 'romantic'
            rel['relationship_label'] = 'Romantic Interest'
        elif any(w in details_lower for w in ['familiar', 'pet', 'fam.']):
            rel['relationship_type'] = 'companion'
            rel['relationship_label'] = 'Companion'
        elif any(w in details_lower for w in ['baron', 'employer', 'boss']):
            rel['relationship_type'] = 'employer'
            rel['relationship_label'] = 'Employer'

    return relationships


# =============================================================================
# BACKSTORY PHASES EXTRACTION
# =============================================================================

def extract_backstory_phases(paragraphs: list[str]) -> list[dict]:
    """Extract structured backstory phases."""
    phases = []
    phase_headers = ['Early Life', 'Childhood', 'Youth', 'Student Life',
                     'Adult Life', 'Adventuring', 'Current', 'Recent Events']

    for header in phase_headers:
        content = find_section(paragraphs, [header.lower()],
                              [h.lower() for h in phase_headers if h != header])
        if content and len(content) > 50:
            phases.append({
                'title': header,
                'content': fix_formatting(content)
            })

    return phases


def clean_backstory_text(text: str) -> str:
    """Remove markdown headers from backstory text to create clean prose."""
    if not text:
        return text

    # Remove ## headers but keep the content
    cleaned = re.sub(r'^#{1,3}\s+[A-Za-z\s]+\n+', '\n', text, flags=re.MULTILINE)

    # Remove **bold** section headers that were converted
    cleaned = re.sub(r'^\*\*[A-Za-z\s]+\*\*\n+', '\n', cleaned, flags=re.MULTILINE)

    # Clean up multiple newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    return cleaned.strip()


# =============================================================================
# COMPANIONS EXTRACTION
# =============================================================================

def extract_companions(paragraphs: list[str], full_text: str) -> list[dict]:
    """Extract companion/pet/familiar information."""
    companions = []

    # Look for companion-related text
    companion_patterns = [
        r'(?:familiar|pet|mount|companion)[:\s]+([A-Z][a-z]+)',
        r'([A-Z][a-z]+)(?:\s+the\s+|\s+is\s+(?:her|his)\s+)(?:familiar|pet|mount|companion)',
    ]

    for pattern in companion_patterns:
        matches = re.finditer(pattern, full_text, re.IGNORECASE)
        for match in matches:
            name = match.group(1)
            if name and len(name) > 2:
                companions.append({
                    'name': name,
                    'type': 'companion',
                    'description': ''
                })

    return companions


# =============================================================================
# SESSION JOURNAL EXTRACTION
# =============================================================================

def extract_session_journal(paragraphs: list[str]) -> list[dict]:
    """Extract session journal entries."""
    sessions = []
    current_session = None
    current_content = []

    for para in paragraphs:
        session_match = re.match(r'^Session\s*#?(\d+)', para, re.IGNORECASE)
        if session_match:
            if current_session is not None and current_content:
                sessions.append({
                    'session_number': current_session,
                    'title': '',
                    'summary': '\n'.join(current_content)
                })
            current_session = int(session_match.group(1))
            rest = para[session_match.end():].strip()
            current_content = [rest] if rest else []
        elif current_session is not None:
            if is_section_header(para) and 'session' not in para.lower():
                sessions.append({
                    'session_number': current_session,
                    'title': '',
                    'summary': '\n'.join(current_content)
                })
                current_session = None
                current_content = []
            else:
                current_content.append(para)

    if current_session is not None and current_content:
        sessions.append({
            'session_number': current_session,
            'title': '',
            'summary': '\n'.join(current_content)
        })

    return sessions


# =============================================================================
# DETECTION UTILITIES
# =============================================================================

def detect_game_system(full_text: str) -> str:
    """Detect the game system from text."""
    lower = full_text.lower()

    if 'talabheim' in lower or 'morr' in lower or 'hexen' in lower:
        return 'Warhammer Fantasy'
    elif 'mech' in lower and 'pilot' in lower:
        return 'Lancer'
    elif 'spelljammer' in lower or 'astral sea' in lower:
        return 'Spelljammer/D&D 5e'
    elif 'pathfinder' in lower:
        return 'Pathfinder'
    else:
        return 'D&D 5e'


def detect_race_class(full_text: str) -> tuple:
    """Detect race, class, and subclass from text."""
    race = None
    char_class = None
    subclass = None

    races = [
        'Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc',
        'Tiefling', 'Dragonborn', 'Aasimar', 'Genasi', 'Goliath', 'Tabaxi',
        'Kenku', 'Firbolg', 'Changeling', 'Warforged', 'Goblin', 'Shadar-Kai',
        'Half-Siren', 'Triton', 'Kalashtar'
    ]

    classes = [
        'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
        'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
        'Artificer', 'Blood Hunter', 'Blood Mage'
    ]

    subclasses = {
        'Bard': ['College of Lore', 'College of Valor', 'College of Swords', 'College of Glamour'],
        'Warlock': ['The Fiend', 'The Archfey', 'The Great Old One', 'The Celestial', 'The Hexblade'],
        'Wizard': ['School of Evocation', 'School of Necromancy', 'School of Divination'],
        'Rogue': ['Thief', 'Assassin', 'Arcane Trickster', 'Swashbuckler'],
    }

    # Detect race
    for r in races:
        if re.search(r'\b' + re.escape(r) + r'\b', full_text, re.IGNORECASE):
            race = r
            break

    # Detect class
    for c in classes:
        if re.search(r'\b' + re.escape(c) + r'\b', full_text, re.IGNORECASE):
            char_class = c
            if c in subclasses:
                for sc in subclasses[c]:
                    if sc.lower() in full_text.lower():
                        subclass = sc
                        break
            break

    # Fix typos
    if char_class == 'Rouge':
        char_class = 'Rogue'

    return race, char_class, subclass


def extract_character_tags(full_text: str, race: str, char_class: str) -> list[str]:
    """Generate character tags based on content."""
    tags = []
    lower = full_text.lower()

    tag_keywords = {
        'blood-magic': ['blood magic', 'blood pact', 'hemomancy'],
        'pirate': ['pirate', 'ship captain', 'sailor', 'sea'],
        'changeling': ['changeling'],
        'noble': ['noble', 'baron', 'aristocrat', 'royalty'],
        'criminal': ['thief', 'criminal', 'smuggler', 'con artist'],
        'scholar': ['scholar', 'academic', 'researcher', 'library'],
        'military': ['soldier', 'military', 'army', 'veteran'],
        'religious': ['temple', 'priest', 'cleric', 'faith'],
        'nature': ['druid', 'forest', 'animals', 'nature'],
        'arcane': ['wizard', 'sorcerer', 'magic'],
        'cursed': ['curse', 'cursed'],
        'tragic': ['tragic', 'loss', 'grief', 'trauma'],
        'mysterious': ['mysterious', 'secret', 'hidden'],
        'assassin': ['assassin', 'killer'],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in lower for kw in keywords):
            tags.append(tag)

    if race:
        tags.append(race.lower().replace(' ', '-'))
    if char_class:
        tags.append(char_class.lower())

    return list(set(tags))[:10]


def extract_quotes(paragraphs: list[str]) -> list[str]:
    """Extract quoted dialogue."""
    quotes = []
    for para in paragraphs:
        found = re.findall(r'"([^"]{10,150})"', para)
        for q in found:
            if 'http' not in q.lower() and 'session' not in q.lower():
                quotes.append(q)
    return quotes[:15]


def extract_media_links(full_text: str) -> dict:
    """Extract URLs for theme music, character sheets, etc."""
    links = {}

    urls = re.findall(r'https?://[^\s<>"\']+[^\s<>"\',.\)]', full_text)

    for url in urls:
        if 'dndbeyond.com' in url:
            links['character_sheet_url'] = url
        elif 'youtube.com' in url or 'youtu.be' in url or 'spotify.com' in url:
            if 'theme_music_url' not in links:
                links['theme_music_url'] = url

    return links


def extract_gold(full_text: str) -> int:
    """Extract gold amount."""
    match = re.search(r'(\d+)\s*(?:gold|gp)', full_text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


# =============================================================================
# MAIN CHARACTER EXTRACTION
# =============================================================================

def extract_character(filepath: str) -> dict:
    """Extract all character data from a document."""
    filename = os.path.basename(filepath)
    name = os.path.splitext(filename)[0]
    name = normalize_text(name)

    print(f"\nProcessing: {name}")

    paragraphs = extract_paragraphs(filepath)
    if not paragraphs:
        print(f"  Warning: No paragraphs extracted")
        return None

    full_text = extract_full_text(paragraphs)
    full_text = fix_common_typos(full_text)

    # Detect basics
    game_system = detect_game_system(full_text)
    race, char_class, subclass = detect_race_class(full_text)
    appearance = extract_physical_appearance(paragraphs, full_text)

    # Extract sections
    backstory = find_section(paragraphs, ['backstory', 'background', 'history'])
    personality = find_section(paragraphs, ['personality', 'traits', 'character'])
    goals = find_section(paragraphs, ['goals', 'objectives', 'ambitions'])
    secrets = find_section(paragraphs, ['secrets', 'hidden'])
    fears_text = find_section(paragraphs, ['fears', 'phobias'])

    # Summary
    summary = find_section(paragraphs, ['summary', 'overview', 'tldr'])
    if not summary and backstory:
        first_para = backstory.split('\n\n')[0]
        if len(first_para) > 50:
            summary = first_para[:500] + '...' if len(first_para) > 500 else first_para

    # Extract lists
    tldr = extract_bullet_points(find_section(paragraphs, ['tldr', 'tl;dr']))
    plot_hooks = extract_bullet_points(find_section(paragraphs, ['plot hooks', 'story hooks', 'knives']))
    open_questions = extract_bullet_points(find_section(paragraphs, ['open questions', 'mysteries']))
    weaknesses = extract_bullet_points(find_section(paragraphs, ['weaknesses', 'flaws']))
    fears = extract_bullet_points(fears_text) if fears_text else []
    quotes = extract_quotes(paragraphs)

    # Structured data
    relationships = extract_relationships(paragraphs, name)
    backstory_phases = extract_backstory_phases(paragraphs)
    companions = extract_companions(paragraphs, full_text)
    session_journal = extract_session_journal(paragraphs)

    # Tags and links
    tags = extract_character_tags(full_text, race, char_class)
    media_links = extract_media_links(full_text)
    gold = extract_gold(full_text)

    # Notes field is what the UI displays as "Full Backstory"
    # Use the clean backstory text (without ## headers) for notes
    # The backstory_phases array captures the structured data separately
    notes = clean_backstory_text(fix_formatting(backstory)) if backstory else clean_backstory_text(fix_formatting(full_text))

    # Build character data
    character = {
        'name': name,
        'type': 'pc',
        'game_system': game_system,
        'pronouns': DEFAULT_PRONOUNS,

        # Basic info
        'race': race,
        'class': char_class,
        'subclass': subclass,

        # Physical appearance
        'height': appearance.get('height'),
        'weight': appearance.get('weight'),
        'hair': appearance.get('hair'),
        'eyes': appearance.get('eyes'),
        'skin': appearance.get('skin'),
        'voice': appearance.get('voice'),
        'age': appearance.get('age'),
        'distinguishing_marks': appearance.get('distinguishing_marks'),

        # Text content - clean up backstory if we have phases
        'backstory': clean_backstory_text(fix_formatting(backstory)) if backstory else clean_backstory_text(fix_formatting(full_text)),
        'description': clean_backstory_text(fix_formatting(backstory)) if backstory else clean_backstory_text(fix_formatting(full_text)),
        'summary': fix_formatting(summary) if summary else None,
        'personality': fix_formatting(personality) if personality else None,
        'goals': fix_formatting(goals) if goals else None,
        'secrets': fix_formatting(secrets) if secrets else None,
        'notes': fix_formatting(notes) if notes else None,

        # Arrays
        'quotes': quotes if quotes else None,
        'tldr': tldr if tldr else None,
        'plot_hooks': plot_hooks if plot_hooks else None,
        'open_questions': open_questions if open_questions else None,
        'weaknesses': weaknesses if weaknesses else None,
        'fears': fears if fears else None,
        'character_tags': tags if tags else None,

        # Structured JSONB
        'backstory_phases': backstory_phases if backstory_phases else None,
        'companions': companions if companions else None,
        'session_journal': session_journal if session_journal else None,

        # Relationships (for separate table)
        'relationships': relationships if relationships else None,

        # Media links
        'theme_music_url': media_links.get('theme_music_url'),
        'character_sheet_url': media_links.get('character_sheet_url'),

        # Tracking
        'gold': gold,
        'status': 'active' if len(full_text) > 200 else 'draft',
        'source_file': filename,
        'imported_at': datetime.now().isoformat(),
        'raw_document_text': full_text,
    }

    # Report results
    print(f"  Game System: {game_system}")
    print(f"  Race: {race or 'Unknown'}")
    print(f"  Class: {char_class or 'Unknown'}{f' ({subclass})' if subclass else ''}")
    print(f"  Backstory: {len(backstory or '')} chars")
    print(f"  Relationships: {len(relationships)}")
    print(f"  Backstory Phases: {len(backstory_phases)}")
    print(f"  Quotes: {len(quotes)}")
    print(f"  Tags: {', '.join(tags[:5])}{'...' if len(tags) > 5 else ''}")

    return character


def process_directory(directory: str) -> list[dict]:
    """Process all Word documents in a directory."""
    characters = []

    if not os.path.exists(directory):
        print(f"Error: Directory not found: {directory}")
        return characters

    for filename in sorted(os.listdir(directory)):
        if not filename.endswith('.docx'):
            continue
        if filename.startswith('~') or filename == "Backstorie Ideas.docx":
            continue

        filepath = os.path.join(directory, filename)
        try:
            char = extract_character(filepath)
            if char:
                characters.append(char)
        except Exception as e:
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()

    return characters


def send_to_api(characters: list[dict], api_url: str) -> dict:
    """Send characters to the import API."""
    try:
        response = requests.post(
            api_url,
            json={'characters': characters},
            headers={'Content-Type': 'application/json'},
            timeout=120
        )
        return response.json()
    except requests.exceptions.RequestException as e:
        return {'error': str(e)}


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 70)
    print("Vault Character Import - Enhanced Schema")
    print("=" * 70)

    characters = process_directory(CHARACTERS_DIR)

    if not characters:
        print("\nNo characters extracted!")
        return

    print(f"\n{'=' * 70}")
    print(f"Extracted {len(characters)} characters")
    print("=" * 70)

    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(characters, f, indent=2, ensure_ascii=False)
    print(f"\nSaved to: {OUTPUT_FILE}")

    # Summary
    print("\n" + "=" * 70)
    print("EXTRACTION SUMMARY")
    print("=" * 70)
    for char in characters:
        print(f"\n{char['name']}:")
        print(f"  Race/Class: {char.get('race', '?')}/{char.get('class', '?')}")
        print(f"  Backstory: {len(char.get('backstory') or '')} chars")
        print(f"  Relationships: {len(char.get('relationships') or [])}")
        print(f"  Phases: {len(char.get('backstory_phases') or [])}")
        print(f"  Tags: {char.get('character_tags') or []}")

    # Ask to send to API
    print(f"\nAPI URL: {API_URL}")
    response = input("\nSend to API? (y/n): ").strip().lower()

    if response == 'y':
        print("\nSending to API...")
        result = send_to_api(characters, API_URL)
        print("\nAPI Response:")
        print(json.dumps(result, indent=2))
    else:
        print("\nSkipped API upload. JSON saved for manual review.")


if __name__ == "__main__":
    main()
