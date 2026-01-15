#!/usr/bin/env python3
"""
Edit and enrich vault character data.
Fixes typos, improves formatting, corrects relationship types, adds missing NPCs.
"""

import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')


def fix_formatting(text):
    """Fix markdown formatting - ensure headers and paragraphs are properly separated."""
    if not text:
        return text

    import re

    # First, normalize existing line breaks
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Protect quoted text from being split
    # Temporarily replace periods inside quotes
    quote_placeholder = "<<<PERIOD>>>"
    def protect_quotes(match):
        return match.group(0).replace('.', quote_placeholder)
    text = re.sub(r'"[^"]*"', protect_quotes, text)

    # Ensure ## headers are on their own lines with blank lines around them
    text = re.sub(r'([^\n])(##\s*)', r'\1\n\n## ', text)

    # After header line, ensure blank line before next content
    text = re.sub(r'(## [^\n]+)\n([^\n#])', r'\1\n\n\2', text)

    # Clean up header formatting - single space after ##
    text = re.sub(r'##\s+', '## ', text)

    # Add paragraph breaks between sentences, but only at clear sentence boundaries
    # Require period followed by 2+ spaces OR newline, then capital letter word (3+ chars)
    text = re.sub(r'\.(\s{2,})([A-Z][a-z]{2,})', r'.\n\n\2', text)

    # Also break at period + single space + capital if it looks like a real sentence break
    # (capital word followed by lowercase continuation)
    text = re.sub(r'\.(\s)([A-Z][a-z]{3,}\s+[a-z])', r'.\n\n\2', text)

    # Merge header continuations (e.g., "## How She Bonds" + "with the PCs")
    text = re.sub(r'(## [^\n]+)\n\n(with [^\n]+)', r'\1 \2', text)
    text = re.sub(r'(## [^\n]+)\n(with [^\n]+)', r'\1 \2', text)

    # Make sub-section titles bold (short lines that look like titles)
    lines = text.split('\n')
    formatted_lines = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Skip headers and empty lines
        if stripped.startswith('##') or stripped.startswith('**') or not stripped:
            formatted_lines.append(stripped)
            continue

        # Check if it looks like a sub-title
        is_subtitle = False

        # Short line, no period at end, looks like a title
        if len(stripped) < 50 and not stripped.endswith('.') and not stripped.endswith(','):
            # Starts with "The " or other title patterns
            if stripped.startswith('The ') or stripped.startswith('A '):
                is_subtitle = True
            # All lowercase short phrase (like "the cracks")
            elif stripped.islower() and len(stripped.split()) <= 4:
                is_subtitle = True
            # Title case with multiple capitals
            elif stripped[0].isupper() and sum(1 for c in stripped if c.isupper()) >= 2:
                is_subtitle = True

        # But not if it starts with common sentence starters
        if is_subtitle:
            sentence_starters = ['she ', 'he ', 'they ', 'ana ', 'her ', 'his ', 'it ', 'when ', 'after ', 'before ', 'through ', 'from ']
            if any(stripped.lower().startswith(w) for w in sentence_starters):
                is_subtitle = False

        if is_subtitle:
            formatted_lines.append(f'**{stripped.title() if stripped.islower() else stripped}**')
        else:
            formatted_lines.append(stripped)

    text = '\n'.join(formatted_lines)

    # Fix multiple newlines (more than 2) down to 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Restore periods in quotes
    text = text.replace(quote_placeholder, '.')

    return text.strip()


def fix_common_typos(text):
    """Fix common typos and grammar issues."""
    if not text:
        return text

    replacements = [
        # Character-specific fixes
        ("Anastasia's sense,", "Anastasia's senses,"),
        ("he found her way to keep her safe", "he found a way to keep her safe"),
        ("so day she just left", "so one day she just left"),
        ("studen't", "student"),
        ("brining food", "bringing food"),
        ("THose", "Those"),
        ("talebheim", "Talabheim"),
        ("Talebheim", "Talabheim"),
        ("does what he believed", "did what he believed"),
        ("to not be a pretentious as", "not to be as pretentious as"),
        ("a black ferret called she calls Penny", "a black ferret she calls Penny"),
        ("could server as", "could serve as"),
        ("which let to him", "which led to him"),
        ("observed of his private life", "observed much of his private life"),
        ("through Jamie", "through Jaime"),
        ("Knickname", "Nickname"),
        ("close to the docs,", "close to the docks,"),
        ("cursed ally", "cursed alley"),
        ("talagaad", "Talabheim"),

        # Cornelia fixes
        ("brood paratie", "brood parasite"),
        ("nesthatches", "nest hatches"),
        ("Genasis", "Genasi"),
        ("acidentally", "accidentally"),
        ("forrest", "forest"),
        ("continues mistakes", "continued mistakes"),
        ("butss", "butts"),

        # Cove fixes
        ("trans-like state", "trance-like state"),
        ("Everytime Cove", "Every time Cove"),
        ("asks the twin to", "asks the twins to"),

        # Daeja fixes
        ("Nobel", "Noble"),
        ("of cause be", "of course be"),
        ("kings guard", "king's guard"),
        ("kings child", "king's child"),
        ("the kings", "the king's"),

        # Common class misspelling
        ("Rouge", "Rogue"),

        # General contractions
        ("doesnt", "doesn't"),
        ("dont ", "don't "),
        ("Dont ", "Don't "),
        ("wont", "won't"),
        ("cant", "can't"),
        ("isnt", "isn't"),
        ("wasnt", "wasn't"),
        ("didnt", "didn't"),
        ("wouldnt", "wouldn't"),
        ("couldnt", "couldn't"),
        ("shouldnt", "shouldn't"),
        ("hasnt", "hasn't"),
        ("hadnt", "hadn't"),
        ("thats ", "that's "),
        ("whats ", "what's "),
        ("hes ", "he's "),
        ("shes ", "she's "),
        ("theyre", "they're"),
        ("youre", "you're"),
        ("its a ", "it's a "),
        ("its the ", "it's the "),
        ("its not", "it's not"),
        ("its her", "it's her"),
        ("its his", "it's his"),

        # Common misspellings
        ("recieve", "receive"),
        ("beleive", "believe"),
        ("wierd", "weird"),
        ("occured", "occurred"),
        ("seperate", "separate"),
        ("definately", "definitely"),
        ("necesary", "necessary"),
        ("untill", "until"),

        # Double spaces
        ("  ", " "),
    ]

    for old, new in replacements:
        text = text.replace(old, new)

    return text


def clean_npc_notes(notes):
    """Clean up NPC notes formatting."""
    if not notes:
        return notes
    notes = fix_common_typos(notes)
    notes = re.sub(r'\|\s*\|', '|', notes)
    notes = re.sub(r'\s*\|\s*', ' | ', notes)
    return notes.strip()


# ========== CHARACTER-SPECIFIC EDIT FUNCTIONS ==========

def edit_anastasia(char):
    """Edit Anastasia Callahan."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['notes'] = fix_formatting(fix_common_typos(char.get('notes', '')))
    char['race'] = 'Human'
    char['character_tags'] = ['magic-user', 'noble-connected', 'underground']

    char['important_people'] = [
        {
            'name': 'Giselbert Almayda',
            'relationship_type': 'mentor',
            'notes': 'One of the Talabheim Eleven. Sharp, patient, and oddly kind. Became a friend as much as a teacher. Nickname is "Orchpyre" (set a lot of orcs on fire). Needs allies to investigate the murder of his old mentor Eike von Hath. Powerful in the Hexenguilde.'
        },
        {
            'name': 'Jaime de Sabatin',
            'relationship_type': 'criminal_contact',
            'notes': "Don't trust him. Uses Ana as middleman for selling magic items to Hexenguilde members. Has powerful enemies that keep him in Talabheim. Transient - doesn't know where he stays."
        },
        {
            'name': 'Baron Rainer Feuerbach',
            'relationship_type': 'patron',
            'notes': "Very smart and ambitious. Has good connections. In a secret relationship with Ebore, a courtier who is strange and probably magically gifted. Has relations with Caroline Von Kassel (noble). Ana's former employer - she just left one day."
        },
        {
            'name': 'Penny',
            'relationship_type': 'pet_familiar',
            'notes': 'Black ferret familiar. Useful in Jaime\'s line of work.'
        },
        {
            'name': 'Egon',
            'relationship_type': 'family',
            'notes': 'Father. Priest of Morr. Fled with baby Ana to Talabheim after her mother was burned for witchcraft. Arranged her training with Baron Feuerbach to keep her safe.'
        }
    ]
    return char


def edit_cornelia(char):
    """Edit Cornelia 'Lia' O'Nest."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Air Genasi'
    char['class'] = 'Druid'
    char['character_tags'] = ['nature', 'magic-user', 'outsider']

    char['important_people'] = [
        {
            'name': 'Mrs. Cabbernath',
            'relationship_type': 'other',
            'notes': 'Old woman Lia tried to help with potions. Accidentally almost blew off the roof of her hut.'
        },
        {
            'name': 'Alfonse "Big Al" Kalazorn',
            'relationship_type': 'other',
            'notes': 'Ranch owner whose ranch was attacked by orcs. The party helped him.'
        }
    ]
    return char


def edit_cove(char):
    """Edit Cove."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Water Genasi'
    char['class'] = 'Blood Hunter'
    char['character_tags'] = ['blood-magic', 'revenge', 'magic-user']

    # Fix TLDR typos
    if char.get('tldr'):
        char['tldr'] = [fix_common_typos(item) for item in char['tldr']]

    char['important_people'] = [
        {
            'name': 'Tide',
            'relationship_type': 'family',
            'notes': 'Twin brother. Lazy but full of light. Was sent away to serve in Lathander\'s clergy. Now travels with Cove.'
        },
        {
            'name': 'Father',
            'relationship_type': 'family',
            'notes': 'Fisherman. Became a broken man after his wife was killed. Now retired.'
        },
        {
            'name': 'Mother',
            'relationship_type': 'family',
            'notes': 'Deceased. Killed by pirates while returning from a fishing trip with Cove. Fought to protect her daughter before being struck down.'
        },
        {
            'name': 'Neritha',
            'relationship_type': 'patron',
            'notes': 'Deep sea witch, more fishlike than human. Gave Cove blood magic in exchange for a blood pact. Her voice still whispers in Cove\'s head: "Child of the sea. You\'ve only just begun to drown."'
        }
    ]
    return char


def edit_daeja(char):
    """Edit Daeja."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Human'
    char['class'] = 'Ranger'
    char['background'] = 'Noble'
    char['character_tags'] = ['royal-heritage', 'nature', 'hidden-identity']
    char['fears'] = ['darkness', 'ducks']

    char['important_people'] = [
        {
            'name': 'The Queen',
            'relationship_type': 'family',
            'notes': 'Biological mother. Had an affair with the commander of the king\'s guard. Ordered Daeja to be taken away to hide the affair.'
        },
        {
            'name': 'Uncle (Commander)',
            'relationship_type': 'family',
            'notes': 'Biological father. Commander of the king\'s guard. Staged a kidnapping of Daeja and raised her as his niece in Ruby\'s Creek. Taught her archery and survival. Recently disappeared without explanation.'
        },
        {
            'name': 'The King',
            'relationship_type': 'other',
            'notes': 'Not Daeja\'s real father, though he believes she was kidnapped as a child.'
        }
    ]
    return char


def edit_emerlin(char):
    """Edit Emerlin Reeves."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Human'
    char['class'] = 'Swashbuckler'
    char['character_tags'] = ['pirate', 'betrayed', 'survivor']

    char['important_people'] = [
        {
            'name': 'Emily',
            'relationship_type': 'family',
            'notes': 'Mother. A baker. Adored Emerlin, perhaps too much.'
        },
        {
            'name': 'Challas',
            'relationship_type': 'family',
            'notes': 'Father. A blacksmith.'
        },
        {
            'name': 'Emmet, Ethan, Elias',
            'relationship_type': 'family',
            'notes': 'Three older brothers. Resented Emerlin for receiving their parents\' attention. Sold her to a pirate ship out of jealousy.'
        },
        {
            'name': 'Noah',
            'relationship_type': 'romantic',
            'notes': 'Young crew member who taught Emerlin to fight with a rapier. They grew close. Last seen fending off attackers when their ship was attacked. Emerlin hopes he survived.'
        }
    ]
    return char


def edit_eve(char):
    """Edit Eve Astor."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Human'
    char['class'] = 'Fighter'
    char['character_tags'] = ['military', 'family-honor', 'underdog']

    char['important_people'] = [
        {
            'name': 'Parents',
            'relationship_type': 'family',
            'notes': 'Guard/military background. Disappointed in Eve for not being as skilled as her sisters.'
        },
        {
            'name': 'Six Sisters',
            'relationship_type': 'family',
            'notes': 'All better fighters than Eve. Family of protectors and law upholders.'
        }
    ]
    return char


def edit_fleur_alerie(char):
    """Edit Fleur Alerie."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Human'
    char['class'] = 'Wizard'
    char['character_tags'] = ['magic-user', 'cursed-family', 'investigator']

    # Remove the incorrect "Centuries-old" NPC
    char['important_people'] = [
        {
            'name': 'Bertrand',
            'relationship_type': 'family',
            'notes': 'Adoptive father. Antiquarian of magical ancient artifacts. Put on "The Ring of Futures" which whispered to him and drove him mad. Left to protect Fleur. She swore to find a way to break the curse and save him.'
        },
        {
            'name': 'Father',
            'relationship_type': 'family',
            'notes': 'Biological father. Travelling merchant who sold artifacts to Bertrand. Left Fleur in Bertrand\'s care after her mother died.'
        },
        {
            'name': 'Mother',
            'relationship_type': 'family',
            'notes': 'Deceased. Got sick shortly after Fleur\'s birth and passed away.'
        }
    ]
    return char


def edit_fleur(char):
    """Edit Fleur (the half-elf, different from Fleur Alerie)."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Half-Elf'
    char['class'] = 'Fighter'
    char['character_tags'] = ['royal-heritage', 'orphan', 'survivor', 'criminal']

    if char.get('tldr'):
        char['tldr'] = [fix_common_typos(item) for item in char['tldr']]

    char['important_people'] = [
        {
            'name': 'King Zeon',
            'relationship_type': 'family',
            'notes': 'Biological father. King who had a one-night affair with Aela during a blood moon. Doesn\'t know Fleur exists.'
        },
        {
            'name': 'Aela',
            'relationship_type': 'family',
            'notes': 'Mother. Beautiful elven woman whose father was on the high council. Left Ora-Tel\'Teuvel to hide her pregnancy. Never returned after seeking help from the king when Fleur was six.'
        },
        {
            'name': 'Nana',
            'relationship_type': 'family',
            'notes': 'Older lady who runs "High Tide Pie" shop. Took in Fleur after catching her stealing a pie. Raised her as her own.'
        }
    ]
    return char


def edit_freya(char):
    """Edit Freya Le Croy."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Elf'
    char['age'] = 26
    char['character_tags'] = ['scarred', 'loner', 'criminal']

    char['important_people'] = [
        {
            'name': 'Mother',
            'relationship_type': 'family',
            'notes': 'Strict mother who raised her with a strong fist.'
        }
    ]
    return char


def edit_kitanya(char):
    """Edit Kitanya Neaze."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Goblin'
    char['class'] = 'Rogue'
    char['background'] = 'Criminal'
    char['character_tags'] = ['hidden-identity', 'criminal', 'outsider']
    char['fears'] = ['water', 'frogs']
    char['common_phrases'] = [
        "Hold me back",
        "Who are you calling small?!",
        "Let me have em!",
        "I'm human you doofus"
    ]

    char['important_people'] = [
        {
            'name': 'Morris',
            'relationship_type': 'family',
            'notes': 'Brother. "Dumb as a door" according to Kitanya.'
        },
        {
            'name': 'Mama',
            'relationship_type': 'family',
            'notes': 'Human adoptive mother. Told Kitanya that everyone is different.'
        }
    ]
    return char


def edit_lyra(char):
    """Edit Lyra Forglemmigej."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Half-Elf'
    char['class'] = 'Ranger'
    char['character_tags'] = ['amnesia', 'kindhearted', 'nature', 'tragic-past']

    char['important_people'] = [
        {
            'name': 'Father',
            'relationship_type': 'family',
            'notes': 'Elf. Good with animals. Was driven mad by illusion magic and killed Flora, thinking she was a monster. Then killed by the elves.'
        },
        {
            'name': 'Mother',
            'relationship_type': 'family',
            'notes': 'Human. Good with medicine and healing. Killed by drunk elves who attacked their camp.'
        },
        {
            'name': 'Flora',
            'relationship_type': 'family',
            'notes': 'Little sister (half-elf). Killed by her own father who was under illusion magic.'
        }
    ]
    return char


def edit_mascha(char):
    """Edit Mascha Huxley (Lancer)."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Human'
    char['class'] = 'Mech Pilot'
    char['game_system'] = 'Lancer'
    char['character_tags'] = ['scientist', 'tragic-past', 'cybernetics']

    char['important_people'] = [
        {
            'name': 'Aala',
            'relationship_type': 'family',
            'notes': 'Sister. Died of leukemia at around 16. Inspired Mascha\'s work in bioengineering and human enhancement. Her mech is named after her.'
        },
        {
            'name': 'Father',
            'relationship_type': 'family',
            'notes': 'Mechanic. Very busy, not home much.'
        },
        {
            'name': 'Mother',
            'relationship_type': 'family',
            'notes': 'Nurse at a hospital for the poor. Basically lived at the hospital, very disconnected from family.'
        },
        {
            'name': 'Grandmother',
            'relationship_type': 'family',
            'notes': 'Almost blind. Looked after the children while parents worked.'
        },
        {
            'name': 'Kato',
            'relationship_type': 'pet_familiar',
            'notes': 'Cyborg dog. Found as a scruffy street dog hit by a car. Mascha saved him and spent months creating the perfect cyborg companion. Name means "All-knowing" in Latin.'
        }
    ]
    return char


def edit_mei(char):
    """Edit Mei Day."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Lightfoot Halfling'
    char['class'] = 'Rogue'
    char['character_tags'] = ['criminal', 'orphan', 'thief']

    char['important_people'] = [
        {
            'name': 'Huxley',
            'relationship_type': 'family',
            'notes': 'Adoptive father. A scammer, con artist, and thief who found Mei abandoned as a baby. Taught her his lifestyle. Has criminal acquaintances.'
        }
    ]
    return char


def edit_nora(char):
    """Edit Nora (Two)."""
    char['name'] = 'Nora (Two)'
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Changeling'
    char['class'] = 'Inquisitive Rogue'
    char['character_tags'] = ['assassin', 'changeling', 'escaped', 'hidden-identity']

    char['important_people'] = [
        {
            'name': 'Ezra',
            'relationship_type': 'enemy',
            'notes': 'Father. Power-mad man who created "The House of Ezra" - an empire of assassins and thieves. Seduced women across the land and took the changeling children to raise as killers.'
        },
        {
            'name': 'Amir',
            'relationship_type': 'mentor',
            'notes': 'Ezra\'s right hand. Elite assassin who trained the children.'
        },
        {
            'name': 'One',
            'relationship_type': 'enemy',
            'notes': 'Former best friend and sibling. Shared a bedroom with Two. Refused to escape with her and threatened to tell Ezra. Two had to knock him out to flee.'
        },
        {
            'name': 'Katarina',
            'relationship_type': 'other',
            'notes': 'A 6-year-old girl Two was sent to assassinate. Unable to kill a child, Two failed the mission and was punished. This led to her escape.'
        }
    ]
    return char


def edit_rue(char):
    """Edit Rue Redistuo."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Changeling'
    char['class'] = 'Sorcerer'
    char['character_tags'] = ['changeling', 'orphan', 'magic-user', 'survivor']

    char['important_people'] = [
        {
            'name': 'Fallax',
            'relationship_type': 'family',
            'notes': 'Biological parent. Changeling spy from The Nexus who works as a corrupt spy. Left a magical tattoo on Rue\'s wrist that becomes visible when she comes of age.'
        },
        {
            'name': 'Adoptive Father',
            'relationship_type': 'enemy',
            'notes': 'Killed one of his own children thinking it was Rue when she accidentally shapeshifted. Called her a witch and swore to find and kill her.'
        },
        {
            'name': 'Alex',
            'relationship_type': 'friend',
            'notes': 'Similar-aged male who found Rue on the streets and took her in. Taught her about magic. His parents were replaced by changelings (possibly related to Rue\'s origin). She helped him escape.'
        }
    ]
    return char


def edit_seraphine(char):
    """Edit Seraphine Valeriel."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['race'] = 'Half-Siren'
    char['class'] = 'Fighter'
    char['character_tags'] = ['military', 'outsider', 'half-blood', 'loyal']

    char['important_people'] = [
        {
            'name': 'Adoptive Father',
            'relationship_type': 'family',
            'notes': 'High-ranking member of the Aresian council. Found Seraphine as a toddler and adopted her. Never had time for a partner or children of his own. Trained her in military discipline.'
        },
        {
            'name': 'Trishera',
            'relationship_type': 'enemy',
            'notes': 'Rival. Finished just below Seraphine in training and has been jealous ever since. Makes it her personal mission to make Seraphine\'s life miserable.'
        },
        {
            'name': 'Astar',
            'relationship_type': 'friend',
            'notes': 'Blind traveler Seraphine defended at an inn. She treated his wounds and apologized for her squad\'s behavior. They left together the next morning. Searching for artifacts to cure a sickness.'
        }
    ]
    return char


def edit_shae(char):
    """Edit Shae Nadine Flint."""
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['game_system'] = 'Spelljammer/D&D 5e'
    char['character_tags'] = ['pirate', 'spelljammer', 'noble', 'twins']

    # Remove the incorrectly detected NPCs and add correct ones
    char['important_people'] = [
        {
            'name': 'Captain Nathaniel Flint',
            'relationship_type': 'family',
            'notes': 'Father. Notorious pirate captain who ruled with an iron fist. Feared throughout the cosmos. "Show no weakness, show no mercy" was his creed.'
        },
        {
            'name': 'Mother (The Queen)',
            'relationship_type': 'family',
            'notes': 'Equally ruthless as her husband. Together they were feared throughout the starlit void.'
        },
        {
            'name': 'Shadow',
            'relationship_type': 'family',
            'notes': 'Twin sibling. Inseparable from Shae, two sides of the same coin. As they grew, tension developed - Shae began questioning the violence while Shadow embraced it.'
        }
    ]
    return char


def edit_silvia(char):
    """Edit Silvia 'Baby' Jennings."""
    char['name'] = 'Silvia "Baby" Jennings'
    char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
    char['status'] = 'draft'
    char['character_tags'] = ['poor-background']

    char['important_people'] = [
        {
            'name': 'Parents',
            'relationship_type': 'family',
            'notes': 'Poor family.'
        },
        {
            'name': 'Three Brothers',
            'relationship_type': 'family',
            'notes': 'Has three brothers.'
        }
    ]
    return char


def main():
    input_file = r"C:\Users\edbar\Downloads\Character\vault_characters_import.json"
    output_file = r"C:\Users\edbar\Downloads\Character\vault_characters_import_edited.json"

    with open(input_file, 'r', encoding='utf-8') as f:
        characters = json.load(f)

    print(f"Loaded {len(characters)} characters")
    print("=" * 70)

    edit_functions = {
        'anastasia callahan': edit_anastasia,
        'cornelia': edit_cornelia,  # Match by first name due to special chars
        'cove': edit_cove,
        'daeja': edit_daeja,
        'emerlin reeves': edit_emerlin,
        'eve astor': edit_eve,
        'fleur alerie': edit_fleur_alerie,
        'freya le croy': edit_freya,
        'kitanya neaze': edit_kitanya,
        'lyra forglemmigej': edit_lyra,
        'mascha huxley': edit_mascha,
        'mei day': edit_mei,
        'nora': edit_nora,  # Match by first name due to extra spaces
        'rue redistuo': edit_rue,
        'seraphine valeriel': edit_seraphine,
        'shae nadine flint': edit_shae,
        'silvia': edit_silvia,  # Match by first name due to special chars
    }
    # Special handling for Fleur (there are two)
    edit_functions_fleur = edit_fleur

    def normalize_name(n):
        """Normalize name for matching by removing special chars."""
        import unicodedata
        # Normalize unicode
        n = unicodedata.normalize('NFKD', n)
        # Replace common special chars
        for old, new in [('"', '"'), ('"', '"'), ("'", "'"), ("'", "'"), ('  ', ' ')]:
            n = n.replace(old, new)
        return n.lower().strip()

    def find_edit_function(name):
        """Find the edit function for a character name."""
        norm = normalize_name(name)
        # Direct match
        if norm in edit_functions:
            return edit_functions[norm]
        # First name match
        first_name = norm.split()[0] if norm else ''
        if first_name in edit_functions:
            return edit_functions[first_name]
        # Special case for "Fleur" (there are two - Fleur Alerie and just Fleur)
        if first_name == 'fleur' and 'alerie' not in norm:
            return edit_functions_fleur
        # Partial match
        for key in edit_functions:
            if key in norm or norm.startswith(key):
                return edit_functions[key]
        return None

    for i, char in enumerate(characters):
        name = char['name']
        print(f"\nEditing: {name}")

        edit_fn = find_edit_function(name)
        if edit_fn:
            char = edit_fn(char)
        else:
            # Apply general fixes
            char['description'] = fix_formatting(fix_common_typos(char.get('description', '')))
            char['notes'] = fix_formatting(fix_common_typos(char.get('notes', '')))

        characters[i] = char

        # Show summary
        print(f"  Race: {char.get('race', '?')}")
        print(f"  Class: {char.get('class', '?')}")
        print(f"  Tags: {char.get('character_tags', [])}")
        print(f"  NPCs: {len(char.get('important_people', []))}")
        for npc in char.get('important_people', []):
            print(f"    - {npc['name']} ({npc['relationship_type']})")

    # Save edited version
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(characters, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 70}")
    print(f"Saved edited characters to: {output_file}")
    print("\nReview the file, then rename it to vault_characters_import.json to use for import.")


if __name__ == "__main__":
    main()
