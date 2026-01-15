#!/usr/bin/env python3
"""
Vault Character Import Script
Extracts character data from .docx files and generates JSON for import.
"""

import os
import sys
import json
import re
from datetime import datetime

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

try:
    from docx import Document
except ImportError:
    print("Error: python-docx not installed. Run: pip install python-docx")
    sys.exit(1)


def extract_text(filepath):
    """Extract all text from a docx file."""
    doc = Document(filepath)
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text.strip())
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                paragraphs.append(" | ".join(cells))
    return "\n".join(paragraphs)


def extract_urls(text):
    """Extract URLs from text."""
    url_pattern = r'https?://[^\s<>"\']+[^\s<>"\',.]'
    return re.findall(url_pattern, text)


def extract_character_sheet_url(text):
    """Extract D&D Beyond or other character sheet URLs."""
    urls = extract_urls(text)
    for url in urls:
        if 'dndbeyond.com' in url:
            return url
        if 'character' in url.lower() and 'sheet' in text.lower():
            return url
    return None


def extract_theme_music(text):
    """Extract YouTube or music URLs."""
    urls = extract_urls(text)
    for url in urls:
        if 'youtube.com' in url or 'youtu.be' in url or 'spotify.com' in url:
            return url
    return None


def extract_quotes(text):
    """Extract quoted text that looks like character quotes."""
    quotes = []
    # Look for lines that start with quotes
    lines = text.split('\n')
    for line in lines:
        if line.startswith('"') and line.endswith('"'):
            quotes.append(line.strip('"'))
        elif 'quote' in line.lower():
            continue  # Skip labels
    return quotes if quotes else None


def extract_common_phrases(text):
    """Extract common phrases from text."""
    phrases = []
    lower = text.lower()
    if 'common phrases:' in lower or 'phrases:' in lower:
        # Try to find the phrases section
        match = re.search(r'(?:common )?phrases?:\s*["\']?([^"\'\n]+)["\']?', text, re.IGNORECASE)
        if match:
            phrase_text = match.group(1)
            # Split by common delimiters
            for p in re.split(r'[-–—]|"\s*-\s*"', phrase_text):
                p = p.strip().strip('"').strip("'")
                if p and len(p) > 2:
                    phrases.append(p)
    return phrases if phrases else None


def extract_fears(text):
    """Extract fears/phobias from text."""
    fears = []
    lower = text.lower()

    # Look for explicit fear mentions
    fear_patterns = [
        r'(?:afraid of|fear of|terrified of|weakness:?\s*(?:terrified of)?)\s*([^.\n,]+)',
        r'fears?:\s*([^.\n]+)',
        r"she's afraid of\s*([^.\n]+)",
    ]

    for pattern in fear_patterns:
        matches = re.findall(pattern, lower)
        for match in matches:
            # Split by 'and' or ','
            for fear in re.split(r'\s+and\s+|,\s*', match):
                fear = fear.strip()
                if fear and len(fear) > 1 and fear not in fears:
                    fears.append(fear)

    return fears if fears else None


def extract_important_people(text, char_name):
    """Extract important NPCs/relationships from text."""
    people = []
    lower = text.lower()

    # Known relationship patterns
    relationships = {
        'father': 'family',
        'dad': 'family',
        'mother': 'family',
        'mom': 'family',
        'sister': 'family',
        'brother': 'family',
        'twin': 'family',
        'uncle': 'family',
        'aunt': 'family',
        'grandmother': 'family',
        'grandfather': 'family',
        'mentor': 'mentor',
        'teacher': 'mentor',
        'friend': 'friend',
        'lover': 'romantic',
        'enemy': 'enemy',
        'rival': 'enemy',
        'patron': 'patron',
        'familiar': 'pet_familiar',
        'pet': 'pet_familiar',
        'captain': 'patron',
        'boss': 'patron',
    }

    # Find named characters with relationship context
    for rel_word, rel_type in relationships.items():
        pattern = rf'(?:her|his|their)\s+{rel_word}[,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        matches = re.findall(pattern, text)
        for name in matches:
            if name.lower() != char_name.lower():
                people.append({
                    'name': name,
                    'relationship_type': rel_type,
                    'notes': None
                })

    return people if people else None


def extract_family(text):
    """Extract structured family information."""
    family = []

    # Patterns for family members
    family_patterns = [
        (r'(?:her|his)\s+(?:biological\s+)?father[,\s]+([A-Z][a-z]+)', 'father'),
        (r'(?:her|his)\s+(?:biological\s+)?mother[,\s]+([A-Z][a-z]+)', 'mother'),
        (r'(?:her|his)\s+(?:twin\s+)?(?:brother|sister)[,\s]+([A-Z][a-z]+)', 'sibling'),
        (r'(?:her|his)\s+dad[,\s]+([A-Z][a-z]+)', 'father'),
        (r'(?:her|his)\s+mom[,\s]+([A-Z][a-z]+)', 'mother'),
    ]

    for pattern, relation in family_patterns:
        matches = re.findall(pattern, text)
        for name in matches:
            # Check if deceased
            status = 'alive'
            if f'{name.lower()}' in text.lower():
                context = text.lower()
                if 'killed' in context or 'died' in context or 'passed' in context or 'deceased' in context:
                    status = 'deceased'
                elif 'missing' in context or 'disappeared' in context:
                    status = 'missing'

            family.append({
                'name': name,
                'relation': relation,
                'status': status,
                'notes': None
            })

    return family if family else None


def extract_signature_items(text):
    """Extract familiars, special items, etc."""
    items = []
    lower = text.lower()

    # Look for familiars
    familiar_patterns = [
        r'(?:her|his)\s+(?:familiar|pet)[,\s]+(?:a\s+)?([^,.\n]+)',
        r'familiar[,:\s]+([A-Z][a-z]+)',
    ]

    for pattern in familiar_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            items.append({
                'name': match.strip(),
                'type': 'familiar',
                'description': None
            })

    # Look for mechs (Lancer)
    if 'mech:' in lower or 'mech name:' in lower:
        match = re.search(r'mech[:\s]+([^\n]+)', text, re.IGNORECASE)
        if match:
            items.append({
                'name': match.group(1).strip(),
                'type': 'vehicle',
                'description': 'Mech'
            })

    return items if items else None


def extract_open_questions(text):
    """Extract unresolved plot hooks phrased as questions."""
    questions = []

    # Find lines ending with ?
    for line in text.split('\n'):
        line = line.strip()
        if line.endswith('?') and len(line) > 10:
            # Filter out meta questions
            if not any(skip in line.lower() for skip in ['discord', 'timezone', 'personality', 'what is fun', 'what annoys']):
                questions.append(line)

    return questions[:5] if questions else None  # Limit to 5


def extract_character_tags(text, game_system):
    """Extract thematic tags for the character."""
    tags = []
    lower = text.lower()

    tag_keywords = {
        'blood-magic': ['blood magic', 'bloodmagic', 'blood pact', 'blood witch'],
        'pirate': ['pirate', 'ship', 'captain', 'crew', 'harbor', 'harbour'],
        'changeling': ['changeling', 'shapeshifter'],
        'royal-heritage': ['king', 'queen', 'prince', 'princess', 'royal', 'bastard'],
        'amnesia': ['amnesia', 'memory loss', 'forget', 'forgotten'],
        'military': ['military', 'soldier', 'guard', 'army', 'squad'],
        'assassin': ['assassin', 'assassinate', 'kill for hire'],
        'magic-user': ['wizard', 'sorcerer', 'mage', 'magic', 'spell'],
        'nature': ['druid', 'forest', 'animal', 'nature'],
        'criminal': ['thief', 'criminal', 'steal', 'con artist', 'rogue'],
        'orphan': ['orphan', 'parents died', 'parents killed', 'raised by'],
        'cursed': ['curse', 'cursed', 'hex'],
        'noble': ['noble', 'baron', 'aristocrat'],
        'scientist': ['phd', 'scientist', 'engineer', 'bioengineering'],
        'cyborg': ['cyborg', 'augment', 'prosthetic', 'mechanical'],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in lower for kw in keywords):
            tags.append(tag)

    # Add game system as tag
    if game_system:
        tags.append(game_system.lower().replace(' ', '-'))

    return tags if tags else None


def extract_gold(text):
    """Extract gold amount from text."""
    match = re.search(r'(\d+)\s*gold', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def extract_session_notes(text):
    """Extract session notes into journal format."""
    journal = []

    # Look for session patterns
    session_pattern = r'Session\s+(\d+)[:\s-]+(\d{1,2}/\d{1,2}/\d{2,4})?(.+?)(?=Session\s+\d+|$)'
    matches = re.findall(session_pattern, text, re.IGNORECASE | re.DOTALL)

    for match in matches:
        session_num = match[0]
        date = match[1] if match[1] else None
        notes = match[2].strip()[:500] if match[2] else None  # Limit length

        if notes and len(notes) > 20:
            journal.append({
                'session_number': int(session_num),
                'date': date,
                'campaign_name': None,
                'title': f'Session {session_num}',
                'notes': notes,
                'character_growth': None
            })

    return journal if journal else None


def determine_status(text):
    """Determine if character should be draft or active."""
    # Very short backstories = draft
    if len(text) < 200:
        return 'draft'
    # Check for incomplete indicators
    if 'TODO' in text or 'TBD' in text or '???' in text:
        return 'draft'
    return 'active'


# Character definitions with manual enrichment
CHARACTER_DATA = {
    "Anastasia Callahan": {
        "game_system": "Warhammer Fantasy",
        "race": "Human",
        "class": "Wizard",
        "pronouns": "she/her",
        "personality": "Rebellious, charming, makes trouble, resourceful",
        "goals": "Avoid Baron Feuerbach, help mentor Giselbert investigate his mentor's death",
        "secrets": "Left Baron's service without permission; works with criminal Jaime; member of Hexenguild",
        "signature_items": [
            {"name": "Penny", "type": "familiar", "description": "Black ferret familiar"}
        ],
        "important_people": [
            {"name": "Egon", "relationship_type": "family", "notes": "Father, priest of Morr"},
            {"name": "Giselbert Almayda", "relationship_type": "mentor", "notes": "Wizard mentor, one of the Talabheim Eleven"},
            {"name": "Jaime de Sabatin", "relationship_type": "friend", "notes": "Criminal friend, bad influence"},
            {"name": "Baron Rainer Feuerbach", "relationship_type": "patron", "notes": "Former employer, may be hunting her"},
        ],
        "family": [
            {"name": "Egon", "relation": "father", "status": "alive", "notes": "Priest of Morr"},
            {"name": "Mother", "relation": "mother", "status": "deceased", "notes": "Burned as witch"}
        ],
        "plot_hooks": [
            "Baron Feuerbach may be hunting her for leaving his service",
            "Hexenguild politics and secrets",
            "Giselbert's mentor Eike von Hath possibly imprisoned in chaos realm",
            "Jaime's dangerous enemies"
        ],
        "character_tags": ["magic-user", "criminal", "noble", "warhammer-fantasy"],
    },
    "Kitanya Neaze": {
        "game_system": "D&D 5e",
        "race": "Goblin",
        "class": "Rogue",
        "background": "Criminal",
        "pronouns": "she/her",
        "common_phrases": ["Hold me back", "Who are you calling small?!", "Let me have em!", "I'm human you doofus"],
        "fears": ["water", "frogs"],
        "personality": "Feisty, defensive about her size, thinks she's human",
        "character_tags": ["criminal", "orphan", "dnd-5e"],
    },
    "Lyra Forglemmigej": {
        "game_system": "D&D 5e",
        "race": "Half-Elf",
        "class": "Druid",
        "pronouns": "she/her",
        "character_sheet_url": "https://www.dndbeyond.com/profile/Sorreia/characters/44443411",
        "theme_music_url": "https://www.youtube.com/watch?v=W1FFlMeT75w",
        "personality": "Kindhearted, loves animals, joyful despite trauma, forgetful",
        "weaknesses": ["Retrograde amnesia", "Memory issues", "Forgets names and bad experiences"],
        "gold": 474,
        "quotes": [
            "No one is born evil, circumstances force them to become so.",
            "No act of kindness, no matter how small, is ever wasted.",
            "We rise by lifting each other.",
            "I don't look down at anyone unless I'm helping them up."
        ],
        "family": [
            {"name": "Father", "relation": "father", "status": "unknown", "notes": "Elf, went mad from illusion magic and killed Flora"},
            {"name": "Mother", "relation": "mother", "status": "deceased", "notes": "Human, killed by drunk elves"},
            {"name": "Flora", "relation": "sibling", "status": "deceased", "notes": "Half-elf sister, killed by father under illusion"}
        ],
        "character_tags": ["amnesia", "nature", "orphan", "dnd-5e"],
    },
    "Cornelia Lia ONest": {
        "game_system": "D&D 5e",
        "race": "Genasi",
        "class": "Druid",
        "pronouns": "she/her",
        "personality": "Kind, good intentions, clumsy, unlucky",
        "weaknesses": ["Wildshape doesn't work correctly", "Accidents follow her", "Embarrassed easily"],
        "open_questions": [
            "Does she have living parents somewhere?",
            "Can she find and free the rare magical animals taken from her woods?",
            "Is there somewhere she'd actually fit in?"
        ],
        "plot_hooks": [
            "Find biological parents",
            "Free captured magical animals from poachers",
            "Find a true home where she belongs"
        ],
        "signature_items": [
            {"name": "Herbal Collection", "type": "other", "description": "Valerian root, White Willow bark, Aloe Vera, Wild lettuce, Opium poppy, Ginger root, Ramson Plant"}
        ],
        "character_tags": ["nature", "orphan", "dnd-5e"],
    },
    "Cove": {
        "game_system": "D&D 5e",
        "race": "Water Genasi",
        "class": "Blood Mage/Ranger",
        "pronouns": "she/her",
        "personality": "Dutiful, hardworking, haunted by voices",
        "secrets": "Made blood pact with sea witch Neritha; hears voices urging her to kill",
        "weaknesses": ["Voices in head when using blood magic", "Guilt over violence"],
        "tldr": [
            "Grew up seaside with parents and twin brother Tide",
            "Tide was lazy and sent away to become a cleric",
            "Returning from fishing, pirates attacked and killed mother",
            "Sought revenge and accepted blood magic from sea witch Neritha",
            "Killed all pirates in a trance-like state",
            "Hears voices wanting her to kill when using blood magic"
        ],
        "family": [
            {"name": "Tide", "relation": "sibling", "status": "alive", "notes": "Twin brother, Cleric of Lathander"},
            {"name": "Mother", "relation": "mother", "status": "deceased", "notes": "Killed by pirates"},
            {"name": "Father", "relation": "father", "status": "alive", "notes": "Retired after wife's death"}
        ],
        "important_people": [
            {"name": "Tide", "relationship_type": "family", "notes": "Twin brother, traveling companion"},
            {"name": "Neritha", "relationship_type": "patron", "notes": "Deep sea witch who granted blood magic"}
        ],
        "character_tags": ["blood-magic", "pirate", "dnd-5e"],
    },
    "Daeja": {
        "game_system": "D&D 5e",
        "race": "Human",
        "class": "Ranger",
        "background": "Noble",
        "age": 25,
        "pronouns": "she/her",
        "secrets": "Product of queen's infidelity with commander of king's guard; secretly royal",
        "fears": ["the dark", "ducks"],
        "family": [
            {"name": "The Queen", "relation": "mother", "status": "alive", "notes": "Biological mother, had affair"},
            {"name": "Commander of King's Guard", "relation": "father", "status": "missing", "notes": "Bio father, posed as uncle, disappeared"},
        ],
        "open_questions": ["Where did her uncle go?"],
        "plot_hooks": [
            "Uncle disappeared mysteriously - find him",
            "Hidden royal heritage could be discovered"
        ],
        "character_tags": ["royal-heritage", "nature", "noble", "dnd-5e"],
    },
    "Emerlin Reeves": {
        "game_system": "D&D 5e",
        "race": "Half-Elf",
        "class": "Rogue/Fighter",
        "pronouns": "she/her",
        "personality": "Survivor, adaptable, resilient",
        "secrets": "Sold to pirates by jealous brothers",
        "family": [
            {"name": "Emily", "relation": "mother", "status": "alive", "notes": "Baker"},
            {"name": "Challas", "relation": "father", "status": "alive", "notes": "Blacksmith"},
            {"name": "Emmet", "relation": "sibling", "status": "alive", "notes": "Eldest brother, betrayed her"},
            {"name": "Ethan", "relation": "sibling", "status": "alive", "notes": "Brother, betrayed her"},
            {"name": "Elias", "relation": "sibling", "status": "alive", "notes": "Brother, betrayed her"},
        ],
        "important_people": [
            {"name": "Noah", "relationship_type": "romantic", "notes": "Young pirate crew member, taught her to fight, fate unknown"}
        ],
        "plot_hooks": [
            "Find surviving crewmates, especially Noah",
            "Confront brothers who betrayed her"
        ],
        "character_tags": ["pirate", "criminal", "dnd-5e"],
    },
    "Eve Astor": {
        "game_system": "D&D 5e",
        "race": "Human",
        "class": "Fighter",
        "background": "Guard/Military",
        "pronouns": "she/her",
        "character_sheet_url": "https://www.dndbeyond.com/profile/Sorreia/characters/45952562",
        "personality": "Proud, justice-oriented, black-and-white morality",
        "goals": "Prove herself, bring family honor, capture known criminal",
        "weaknesses": ["Not as good a fighter as her sisters", "Brings shame to family"],
        "character_tags": ["military", "noble", "dnd-5e"],
    },
    "Fleur Alerie": {
        "game_system": "D&D 5e",
        "class": "Wizard",
        "pronouns": "she/her",
        "character_sheet_url": "https://www.dndbeyond.com/profile/Sorreia/characters/46456198",
        "goals": "Break the curse on the Ring of Futures, save adoptive father Bertrand",
        "family": [
            {"name": "Bertrand", "relation": "father", "status": "missing", "notes": "Adoptive father, antiquarian, cursed by Ring of Futures"},
            {"name": "Father", "relation": "father", "status": "unknown", "notes": "Biological father, traveling merchant"},
            {"name": "Mother", "relation": "mother", "status": "deceased", "notes": "Died shortly after Fleur's birth"}
        ],
        "plot_hooks": [
            "Find and break the curse on the Ring of Futures",
            "Locate missing Bertrand"
        ],
        "character_tags": ["magic-user", "cursed", "orphan", "dnd-5e"],
    },
    "Fleur Royal": {
        "game_system": "D&D 5e",
        "race": "Half-Elf",
        "class": "Sorcerer (Blood)",
        "pronouns": "she/her",
        "secrets": "Daughter of King Zeon and elven woman Aela; has blood magic from being born during blood moon",
        "family": [
            {"name": "Aela", "relation": "mother", "status": "unknown", "notes": "Elven woman, left to protect Fleur"},
            {"name": "King Zeon", "relation": "father", "status": "alive", "notes": "King, doesn't know Fleur exists"}
        ],
        "character_tags": ["blood-magic", "royal-heritage", "orphan", "dnd-5e"],
    },
    "Freya LeCroy": {
        "game_system": "Unknown",
        "pronouns": "she/her",
        "status": "draft",
        "notes": "Character image only, no backstory text",
    },
    "Mascha Huxley": {
        "game_system": "Lancer",
        "race": "Human",
        "class": "Mech Pilot",
        "background": "PHD in Bioengineering",
        "pronouns": "she/her",
        "personality": "Driven, morally grey, compassionate underneath, obsessive",
        "secrets": "Conducted unethical human experiments at SSC; involved in Vasana System disaster",
        "signature_items": [
            {"name": "Aaela V.2", "type": "vehicle", "description": "Mech named after deceased sister"},
            {"name": "Kato", "type": "companion", "description": "Cyborg dog, final university project"}
        ],
        "family": [
            {"name": "Aala", "relation": "sibling", "status": "deceased", "notes": "Sister, died of leukemia, mech named after her"},
            {"name": "Grandmother", "relation": "grandparent", "status": "alive", "notes": "Almost blind, Mascha cares for her"},
            {"name": "Father", "relation": "father", "status": "alive", "notes": "Mechanic"},
            {"name": "Mother", "relation": "mother", "status": "alive", "notes": "Nurse, disconnected from family"}
        ],
        "important_people": [
            {"name": "Ajax", "relationship_type": "romantic", "notes": "Ex-lover, manipulated her into unethical experiments"},
            {"name": "Kato", "relationship_type": "pet_familiar", "notes": "Cyborg dog she saved and rebuilt"}
        ],
        "plot_hooks": [
            "SSC may still be looking for her",
            "Ajax's manipulation and betrayal",
            "Atoning for past unethical experiments"
        ],
        "character_tags": ["scientist", "cyborg", "lancer"],
    },
    "Mei Day": {
        "game_system": "D&D 5e",
        "race": "Lightfoot Halfling",
        "class": "Rogue",
        "pronouns": "she/her",
        "character_sheet_url": "https://www.dndbeyond.com/profile/Sorreia/characters/42170499",
        "personality": "Natural pickpocket, thrillseeker",
        "status": "draft",  # Backstory incomplete
        "important_people": [
            {"name": "Huxley", "relationship_type": "family", "notes": "Adoptive father, con artist and thief"}
        ],
        "character_tags": ["criminal", "orphan", "dnd-5e"],
    },
    "Nora Two": {
        "game_system": "D&D 5e",
        "race": "Changeling",
        "class": "Rogue (Inquisitive)",
        "pronouns": "she/her",
        "personality": "Conflicted, wants to escape her past, determined",
        "secrets": "Refused to kill a child; fled House of Ezra; has magical tattoo '2/10' visible through all forms",
        "weaknesses": ["Tattoo visible through transformations", "Burns when siblings die"],
        "important_people": [
            {"name": "Ezra", "relationship_type": "family", "notes": "Father, power-mad creator of House of Ezra"},
            {"name": "One", "relationship_type": "enemy", "notes": "Sibling, best friend who would have betrayed her"},
            {"name": "Amir", "relationship_type": "mentor", "notes": "Elite assassin, trained the children"}
        ],
        "family": [
            {"name": "Ezra", "relation": "father", "status": "alive", "notes": "Cruel patriarch of assassin house"}
        ],
        "plot_hooks": [
            "House of Ezra hunting her",
            "Magical tattoo removal",
            "Confrontation with One"
        ],
        "character_tags": ["changeling", "assassin", "criminal", "dnd-5e"],
    },
    "Rue Redistuo": {
        "game_system": "D&D 5e",
        "race": "Changeling",
        "class": "Sorcerer",
        "pronouns": "she/her",
        "secrets": "Accidentally caused sibling's death revealing changeling nature; taking form of murdered girl",
        "important_people": [
            {"name": "Alex", "relationship_type": "friend", "notes": "Close friend, now hunting changelings"},
            {"name": "Fallax", "relationship_type": "family", "notes": "Biological parent, corrupt spy from The Nexus"}
        ],
        "family": [
            {"name": "Fallax", "relation": "parent", "status": "alive", "notes": "Changeling spy, abandoned Rue as baby"}
        ],
        "plot_hooks": [
            "Adoptive father trying to kill her",
            "Alex hunting changelings",
            "True identity and the murdered girl whose form she took"
        ],
        "character_tags": ["changeling", "magic-user", "orphan", "dnd-5e"],
    },
    "Seraphine Valeriel": {
        "game_system": "D&D 5e",
        "race": "Half-Siren",
        "class": "Fighter (Military)",
        "pronouns": "she/her",
        "personality": "Disciplined, empathetic, conflicted about identity",
        "weaknesses": ["Constant discrimination for being half-siren"],
        "important_people": [
            {"name": "Adoptive Father", "relationship_type": "family", "notes": "High-ranking Aresian council member"},
            {"name": "Trishera", "relationship_type": "enemy", "notes": "Rival, finished just below her in training"},
            {"name": "Astar", "relationship_type": "friend", "notes": "Blind traveler she's helping"}
        ],
        "goals": "Help Astar recover artifacts to cure his curse",
        "plot_hooks": [
            "Left squad to help Astar",
            "Seeking artifacts to cure Astar's curse",
            "Trishera's ongoing rivalry"
        ],
        "character_tags": ["military", "dnd-5e"],
    },
    "Shae Nadine Flint": {
        "game_system": "Spelljammer/D&D 5e",
        "race": "Human",
        "class": "Rogue (Pirate/Assassin)",
        "pronouns": "she/her",
        "personality": "Questioning violence, seeking peace, conflicted",
        "secrets": "Fled arranged marriage; works as assassin for extra gold",
        "family": [
            {"name": "Captain Nathaniel Flint", "relation": "father", "status": "alive", "notes": "Infamous pirate captain"},
            {"name": "Mother", "relation": "mother", "status": "alive", "notes": "Ruthless pirate queen"},
            {"name": "Shadow", "relation": "sibling", "status": "alive", "notes": "Twin brother, loyal to parents"}
        ],
        "important_people": [
            {"name": "Shadow", "relationship_type": "family", "notes": "Twin brother, thrives in chaos unlike Shae"},
            {"name": "Captain Nathaniel Flint", "relationship_type": "family", "notes": "Father, infamous pirate"}
        ],
        "plot_hooks": [
            "Family still searching for her",
            "Twin brother Shadow",
            "Illithid encounter at the inn"
        ],
        "character_tags": ["pirate", "assassin", "dnd-5e"],
    },
    "Silvia Baby Jennings": {
        "game_system": "D&D 5e",
        "race": "Human",
        "pronouns": "she/her",
        "status": "draft",
        "notes": "Only one sentence of backstory - raised in poor family with 3 brothers",
    },
}


def process_character(filename, text, manual_data):
    """Process a single character and return structured data."""
    char_name = filename.replace('.docx', '')

    # Start with manual data
    data = {
        "name": char_name,
        "type": "pc",
        "source_file": filename,
        "imported_at": datetime.now().isoformat(),
    }

    # Merge manual enrichment
    if manual_data:
        data.update(manual_data)

    # Auto-extract what we can
    if not data.get('character_sheet_url'):
        data['character_sheet_url'] = extract_character_sheet_url(text)

    if not data.get('theme_music_url'):
        data['theme_music_url'] = extract_theme_music(text)

    if not data.get('quotes'):
        data['quotes'] = extract_quotes(text)

    if not data.get('common_phrases'):
        data['common_phrases'] = extract_common_phrases(text)

    if not data.get('fears'):
        data['fears'] = extract_fears(text)

    if not data.get('gold'):
        data['gold'] = extract_gold(text)

    if not data.get('session_journal'):
        data['session_journal'] = extract_session_notes(text)

    if not data.get('status'):
        data['status'] = determine_status(text)

    # Extract backstory as description
    if not data.get('description'):
        # Try to find backstory section
        backstory_match = re.search(r'(?:Backstory|Background)[:\s]*\n(.+?)(?=\n[A-Z][a-z]+:|$)', text, re.DOTALL | re.IGNORECASE)
        if backstory_match:
            data['description'] = backstory_match.group(1).strip()[:2000]  # Limit length

    return data


def main():
    folder = r"C:\Users\edbar\Downloads\Character\Charactere"
    output_file = r"C:\Users\edbar\Downloads\Character\vault_characters_import.json"

    characters = []

    # Map filenames to manual data keys
    filename_mapping = {
        "Anastasia Callahan.docx": "Anastasia Callahan",
        "Kitanya Neaze.docx": "Kitanya Neaze",
        "Lyra Forglemmigej.docx": "Lyra Forglemmigej",
        "Cornelia \"Lia\" O'Nest.docx": "Cornelia Lia ONest",
        "Cove.docx": "Cove",
        "Daeja.docx": "Daeja",
        "Emerlin Reeves.docx": "Emerlin Reeves",
        "Eve Astor.docx": "Eve Astor",
        "Fleur Alerie.docx": "Fleur Alerie",
        "Fleur.docx": "Fleur Royal",
        "Freya Le_Croy.docx": "Freya LeCroy",
        "Mascha Huxley.docx": "Mascha Huxley",
        "Mei Day.docx": "Mei Day",
        "Nora _ Two.docx": "Nora Two",
        "Rue Redistuo.docx": "Rue Redistuo",
        "Seraphine Valeriel.docx": "Seraphine Valeriel",
        "Shae Nadine Flint.docx": "Shae Nadine Flint",
        "Silvia _Baby_ Jennings.docx": "Silvia Baby Jennings",
    }

    for filename in sorted(os.listdir(folder)):
        if not filename.endswith('.docx'):
            continue
        if filename == "Backstorie Ideas.docx":
            continue  # Skip draft ideas file

        filepath = os.path.join(folder, filename)
        print(f"Processing: {filename}")

        try:
            text = extract_text(filepath)
            manual_key = filename_mapping.get(filename)
            manual_data = CHARACTER_DATA.get(manual_key, {}) if manual_key else {}

            char_data = process_character(filename, text, manual_data)

            # Clean up name
            char_data['name'] = char_data['name'].replace('_', ' ').replace('"', '').strip()

            characters.append(char_data)

        except Exception as e:
            print(f"  Error: {e}")

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(characters, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Exported {len(characters)} characters to: {output_file}")
    print("\nCharacter summary:")
    for char in characters:
        status = char.get('status', 'active')
        game = char.get('game_system', 'Unknown')
        print(f"  - {char['name']} ({game}) [{status}]")


if __name__ == "__main__":
    main()
