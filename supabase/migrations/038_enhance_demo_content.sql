-- Migration: Enhance Demo Content
-- Adds richer detail, more NPCs, better formatting, and prepares for images

-- Create demo-images storage bucket for demo content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-images', 'demo-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for demo images
DROP POLICY IF EXISTS "Public can view demo images" ON storage.objects;
CREATE POLICY "Public can view demo images"
ON storage.objects FOR SELECT
USING (bucket_id = 'demo-images');

DO $$
DECLARE
  demo_campaign_id UUID := '00000000-0000-0000-0001-000000000001'::UUID;
  demo_character_id UUID := '00000000-0000-0000-0002-000000000001'::UUID;
  demo_oneshot_id UUID := '00000000-0000-0000-0003-000000000001'::UUID;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════
  -- ENHANCED DEMO CAMPAIGN: "The Sunken Citadel"
  -- ═══════════════════════════════════════════════════════════════════

  UPDATE campaigns SET
    description = 'An ancient fortress lies buried beneath the Thornwood Forest, swallowed by the earth during a cataclysm three centuries past. The citadel once belonged to the dragon cult of Ashardalon, and rumors speak of a magical apple tree that grants either restoration or ruin to those who taste its fruit.

Now strange lights flicker in the ravine where the citadel sank, and goblins raid the roads with increasing boldness. The village of Oakhurst has sent word—two of their own, the Hucrele siblings, descended into the depths a month ago and never returned.

Your party stands at the edge of the ravine as twilight settles over the forest. Below, ancient stone walls jut from the earth at impossible angles. The adventure begins.',
    updated_at = NOW()
  WHERE id = demo_campaign_id;

  -- Delete existing NPCs to replace with enhanced versions
  DELETE FROM characters WHERE campaign_id = demo_campaign_id;

  -- Enhanced Campaign NPCs with rich detail
  INSERT INTO characters (id, campaign_id, name, type, description, race, class, notes, status, status_color, personality, goals, secrets, appearance, created_at, updated_at)
  VALUES
    -- Quest Giver
    (gen_random_uuid(), demo_campaign_id, 'Kerowyn Hucrele', 'npc',
     'A wealthy merchant who built her fortune trading rare herbs and alchemical ingredients. Now in her fifties, Kerowyn has weathered many hardships, but nothing has prepared her for the disappearance of her children. She spends her nights pacing the floor of her manor, clutching a worn portrait of Talgen and Sharwyn.',
     'Human', NULL,
     '**Quest Hook:** Offers 250gp per rescued child, will double it if both return alive. Has connections to apothecaries who might reward specimens from the citadel.',
     'Quest Giver', '#10B981',
     'Pragmatic and sharp-tongued, but her composure cracks when discussing her children. She has little patience for excuses but respects competence.',
     'See her children returned safely, no matter the cost.',
     'She secretly suspects the goblins have already killed them but cannot bear to admit it.',
     'Silver-streaked auburn hair pulled back severely. Expensive but practical clothing. Hands that show years of hard work despite her wealth.',
     NOW(), NOW()),

    -- Ally
    (gen_random_uuid(), demo_campaign_id, 'Meepo', 'npc',
     'Keeper of the dragon Calcryx for the Durnn tribe of kobolds. Meepo raised the wyrmling from an egg, feeding her choice bits of meat and singing kobold lullabies. When the goblins stole Calcryx during a raid, Meepo''s status in the tribe collapsed overnight. Now he wanders the kobold halls, weeping and muttering, desperate for someone—anyone—to help him recover his charge.',
     'Kobold', NULL,
     '**Ally Information:** Knows the citadel layout intimately. Will fight alongside the party against goblins but is cowardly against anything larger. Speaks broken Common with a lisp.',
     'Potential Ally', '#F59E0B',
     'Pathetic, weepy, but genuinely devoted to Calcryx. Alternates between self-pity and desperate hope.',
     'Recover Calcryx and restore his honor among the kobolds.',
     'He actually likes the dragon more than his own tribe. If the party helps him, he might be convinced to leave with them.',
     'Scraggly brown scales, a perpetually runny snout, and large watery eyes. Wears a makeshift dragon-keeper''s uniform that''s far too big for him.',
     NOW(), NOW()),

    -- Villain
    (gen_random_uuid(), demo_campaign_id, 'Belak the Outcast', 'npc',
     'Once a respected druid of the Circle of the Land, Belak discovered the Gulthias Tree during an expedition twelve years ago. The tree''s whispers promised power over life and death—power Belak believed could save the dying forests. Instead, it corrupted him utterly. Now he tends the tree in the citadel''s twilight grove, nurturing its dark influence and creating twisted plant-creatures called blights.',
     'Human', 'Druid',
     '**Villain Details:** CR 6 Druid with modified spells. The tree grants him regeneration while he remains within 60 feet of it. Has dominated the missing adventurers using enchanted seeds.',
     'Villain', '#EF4444',
     'Speaks softly with unsettling calm. Sees his work as salvation, not corruption. Genuinely believes he''s saving nature from civilization.',
     'Spread the Gulthias Tree''s influence across the region, eventually "redeeming" all forests.',
     'Part of him remembers who he was and weeps at what he''s become. A DC 20 Persuasion check during battle might create a moment of hesitation.',
     'Gaunt and pale, with bark-like patches spreading across his skin. His eyes have a faint green luminescence. Wears robes of woven vines that seem to move on their own.',
     NOW(), NOW()),

    -- Monster/Creature
    (gen_random_uuid(), demo_campaign_id, 'Calcryx', 'npc',
     'A white dragon wyrmling stolen from the kobolds by goblins who have no idea how to properly care for a dragon. Calcryx is angry, hungry, and increasingly dangerous. She''s taken to freezing her goblin captors whenever they get too close, which they find both terrifying and hilarious.',
     'White Dragon Wyrmling', NULL,
     '**Combat Stats:** AC 16, HP 32. Breath weapon deals 2d8 cold damage (DC 12 CON save). Immune to cold. Can be calmed with raw meat and a DC 15 Animal Handling check.',
     'Captive', '#3B82F6',
     'Imperious despite her captivity. Considers all non-dragons beneath her but might respect strength.',
     'Escape captivity and eat something that isn''t goblin rations.',
     'She actually remembers Meepo fondly—he was kind to her. A reunion with him grants advantage on calming checks.',
     'Pristine white scales, icy blue eyes, and a wingspan of about eight feet. Despite her youth, she carries herself with draconic arrogance.',
     NOW(), NOW()),

    -- Faction Leader
    (gen_random_uuid(), demo_campaign_id, 'Yusdrayl', 'npc',
     'Chieftain of the Durnn kobolds, Yusdrayl rules her tribe from a throne of dragon bones she claims belonged to a servant of Ashardalon himself. She''s cunning enough to know her tribe can''t defeat the goblins alone, and pragmatic enough to ally with adventurers—temporarily. But her ultimate loyalty is to dragonkind, and she dreams of the day a true dragon will recognize the Durnn tribe''s devotion.',
     'Kobold', NULL,
     '**Faction Details:** Commands 30+ kobolds. Will trade information and safe passage for help against goblins. Possesses a key to the lower levels.',
     'Faction Leader', '#8B5CF6',
     'Regal and formal, with an inflated sense of her tribe''s importance. Quick to take offense but respects those who treat her as an equal.',
     'Recover Calcryx, destroy the goblins, and restore the Durnn tribe''s glory.',
     'She''s been secretly negotiating with Belak, hoping to trade prisoners for the dragon. She doesn''t know about his true nature.',
     'Unusually large for a kobold, with scales polished to a deep bronze sheen. Wears a crown of small dragon teeth and carries an ancient dagger.',
     NOW(), NOW()),

    -- Goblin Chief
    (gen_random_uuid(), demo_campaign_id, 'Durnn the Goblin Chief', 'npc',
     'The bloated hobgoblin warlord who leads the Durbuluk tribe. Durnn is cruel and paranoid, convinced that his underlings are plotting against him—which, to be fair, several of them are. He keeps Calcryx as a status symbol, not understanding that the dragon grows more dangerous with each passing day.',
     'Hobgoblin', 'Fighter',
     '**Combat Stats:** AC 18 (chain mail + shield), HP 52. Martial Advantage deals extra 2d6 damage when ally is adjacent to target. Carries a +1 longsword looted from a dead adventurer.',
     'Hostile', '#EF4444',
     'Bullying and boastful around subordinates, but actually competent in battle. Underestimates non-goblinoid races.',
     'Consolidate power over the citadel and eventually raid Oakhurst itself.',
     'The +1 longsword belonged to Talgen Hucrele. Durnn suspects the young man might still be alive somewhere in the lower levels.',
     'Tall and broad for a hobgoblin, with ritual scars across his face that mark him as a warlord. His armor is mismatched but well-maintained.',
     NOW(), NOW());

  -- Delete existing sessions to replace with enhanced versions
  DELETE FROM sessions WHERE campaign_id = demo_campaign_id;

  -- Enhanced Sessions with detailed notes
  INSERT INTO sessions (id, campaign_id, session_number, title, summary, date, notes, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_campaign_id, 1, 'The Call to Adventure',
     'The party gathered in Oakhurst and learned about the missing Hucrele siblings. After gathering information and supplies, they prepared to descend into the ravine.',
     '2024-01-15',
     '## The Story So Far

The party arrived in **Oakhurst** as autumn''s chill settled over the Thornwood. Word had spread through adventurer circles of easy coin—a wealthy merchant seeking heroes to rescue her missing children.

## Key Events

### Meeting Kerowyn Hucrele
The party met Kerowyn at her manor on the hill. She was composed but clearly exhausted, dark circles under her eyes betraying sleepless nights. She explained:
- Her children **Talgen** (a fighter) and **Sharwyn** (a wizard) left for the citadel a month ago
- They were accompanied by a ranger named **Karakas** and a paladin named **Sir Braford**
- None have returned, and the villagers fear the worst

**Reward Offered:** 250 gold per child returned alive

### The Ol'' Boar Inn
The party gathered information at the local tavern:
- **Garon** (innkeeper) shared the legend of the magic apple tree that produces fruit of healing or harm
- **Corkie** (halfling barmaid) mentioned increased goblin activity on the roads
- A drunk farmer claimed to have seen "walking twigs" near the ravine at night

### Preparing for the Descent
The party purchased supplies and learned:
- The ravine is a half-day''s travel through the forest
- Rope will be needed—the drop is about 50 feet
- Both goblins AND kobolds inhabit the ruins below

## NPCs Met
| Name | Role | Disposition |
|------|------|-------------|
| Kerowyn Hucrele | Quest Giver | Desperate, Generous |
| Garon | Innkeeper | Helpful, Superstitious |
| Corkie | Barmaid | Friendly, Gossip |

## Loot & Expenses
- Purchased 100ft of rope
- Bought 10 days of rations
- Received advance of 50gp from Kerowyn

## Unresolved Threads
- [ ] What happened to the missing adventurers?
- [ ] What is the "magic apple tree"?
- [ ] Why are goblins raiding more frequently?

## Next Session Preview
The party will travel to the ravine and make their descent into the Sunken Citadel.',
     NOW(), NOW()),

    (gen_random_uuid(), demo_campaign_id, 2, 'Into the Darkness',
     'The party descended into the ravine and entered the citadel. They encountered the kobolds and forged an uneasy alliance against the goblins.',
     '2024-01-22',
     '## Descent into the Citadel

The ravine yawned before the party like a wound in the earth. Ancient stone walls jutted at impossible angles, and the smell of damp decay rose from below.

## Key Events

### The Climb Down
- Anchored ropes and descended 50 feet to a ledge
- Found an old campsite—belongings marked with the Hucrele family crest
- Discovered a **rusted cage** with goblin writing scratched into it

### First Contact: Kobolds
A patrol of **four kobolds** ambushed the party near the entrance. After a tense standoff:
- Party wounded but didn''t kill the scouts
- Kobolds agreed to bring them to their leader
- Passed through crude fortifications and dragon iconography

### Audience with Yusdrayl
The kobold chieftain received the party in a chamber dominated by a throne of dragon bones:

> "You are large. You are clumsy. But perhaps you are useful. The **filthy goblins** have stolen our dragon, Calcryx. Return her to us, and the Durnn tribe will name you friends."

**Alliance Formed:** The party agreed to help recover Calcryx in exchange for:
- Safe passage through kobold territory
- Information about the citadel layout
- A key to the lower levels

### Meeting Meepo
Yusdrayl assigned **Meepo** as their guide—the former dragon-keeper, disgraced since Calcryx''s capture. He proved:
- Surprisingly knowledgeable about the citadel
- Completely devoted to recovering Calcryx
- Terrible in combat but good at avoiding it

## Combat Encounters
| Enemy | Difficulty | Result |
|-------|------------|--------|
| 4 Kobold Scouts | Easy | Diplomatic Resolution |

## NPCs Met
| Name | Role | Disposition |
|------|------|-------------|
| Yusdrayl | Kobold Chieftain | Calculating, Allied |
| Meepo | Dragon Keeper | Desperate, Helpful |

## Loot
- Dragon-shaped key (from Yusdrayl)
- Crude map of upper citadel
- 3 flasks of alchemist''s fire (kobold tribute)

## Unresolved Threads
- [ ] Recover Calcryx from the goblins
- [ ] Find the Hucrele siblings
- [ ] Explore the lower levels
- [ ] Investigate the "twilight grove" mentioned by Yusdrayl',
     NOW(), NOW()),

    (gen_random_uuid(), demo_campaign_id, 3, 'The Dragon''s Rescue',
     'The party infiltrated goblin territory, defeated Chief Durnn, and recovered Calcryx. But troubling signs pointed to something darker in the citadel''s depths.',
     '2024-01-29',
     '## Assault on the Goblins

With Meepo as their guide, the party pushed into goblin-held territory. The halls here were cruder, covered in crude graffiti and the remnants of many meals.

## Key Events

### Goblin Ambush
- Party triggered a trap in a narrow corridor
- Fought through **six goblin warriors** and **two goblin sharpshooters**
- Meepo nearly died protecting the wizard (this will be remembered)

### Durnn''s Throne Room
The hobgoblin chief waited with his elite guard:
- Durnn sat on a crude throne, Calcryx chained nearby
- Boasted about killing "soft pink adventurers" who came before
- **Combat erupted** when he refused to negotiate

### The Battle
Durnn proved a formidable opponent:
- His guards fell quickly but he rallied twice
- Used Calcryx''s presence to threaten the party
- Finally fell to a critical hit from the party fighter

**Significant Moment:** The party found a +1 longsword on Durnn''s body—the initials "T.H." engraved on the pommel. Talgen Hucrele''s weapon.

### Recovering Calcryx
The wyrmling was angry but:
- Meepo''s presence calmed her significantly
- She allowed herself to be unchained
- Actually nuzzled Meepo in a rare display of affection

## Combat Encounters
| Enemy | Difficulty | Result |
|-------|------------|--------|
| 6 Goblin Warriors | Medium | Victory |
| 2 Goblin Sharpshooters | - | Victory |
| Chief Durnn + 2 Guards | Hard | Victory (1 PC downed) |

## NPCs Status Update
| Name | Previous | Current |
|------|----------|---------|
| Chief Durnn | Hostile | **Dead** |
| Calcryx | Captive | **Rescued** |
| Meepo | Disgraced | Redeemed |

## Loot
- +1 Longsword (Talgen''s)
- 230 gp from goblin treasury
- Crude map showing "Twilight Grove" in lower levels
- Note in Sharwyn''s handwriting: "The tree speaks. It promises everything."

## Revelations
The Hucrele siblings went **deeper**—toward something called the Twilight Grove. Sharwyn''s note suggests she was drawn by something... or someone.

## Next Session Preview
Return Calcryx to the kobolds and descend to the lower levels in search of the Hucrele siblings.',
     NOW(), NOW());

  -- Delete existing timeline events to replace with enhanced versions
  DELETE FROM timeline_events WHERE campaign_id = demo_campaign_id;

  -- Enhanced Timeline Events
  INSERT INTO timeline_events (id, campaign_id, title, description, event_date, event_type, is_major, location, created_at)
  VALUES
    (gen_random_uuid(), demo_campaign_id, 'Campaign Begins: Oakhurst',
     'The party arrived in the village of Oakhurst, drawn by rumors of missing adventurers and ancient treasure. They met with Kerowyn Hucrele, who offered substantial rewards for the return of her children Talgen and Sharwyn.',
     '1492-03-15', 'quest_start', true, 'Oakhurst Village', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Descent into the Citadel',
     'After gathering supplies and information, the party descended into the ravine where the Sunken Citadel lies buried. They found evidence of the missing adventurers at an abandoned campsite.',
     '1492-03-22', 'discovery', false, 'The Ravine', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Alliance with the Durnn Tribe',
     'The party negotiated an alliance with Yusdrayl, chieftain of the Durnn kobolds. In exchange for recovering their stolen dragon Calcryx, the kobolds provided safe passage and information about the citadel.',
     '1492-03-22', 'alliance', true, 'Kobold Domain', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Meeting Meepo',
     'The disgraced dragon-keeper Meepo was assigned as the party''s guide. Despite his pathetic demeanor, he proved invaluable for navigating the citadel''s passages.',
     '1492-03-22', 'character_intro', false, 'Kobold Domain', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Fall of Chief Durnn',
     'The party assaulted goblin territory and slew Chief Durnn in his throne room. Among his possessions, they found Talgen Hucrele''s magical sword—an ominous sign.',
     '1492-03-29', 'combat', true, 'Goblin Stronghold', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Calcryx Recovered',
     'The white dragon wyrmling Calcryx was rescued from goblin captivity and reunited with Meepo. The kobold alliance was cemented, and the party gained access to the lower levels.',
     '1492-03-29', 'quest_complete', true, 'Goblin Stronghold', NOW()),

    (gen_random_uuid(), demo_campaign_id, 'Discovery: Sharwyn''s Note',
     'A disturbing note in Sharwyn Hucrele''s handwriting was found: "The tree speaks. It promises everything." The party realized the siblings had descended to something called the Twilight Grove.',
     '1492-03-29', 'discovery', true, 'Goblin Stronghold', NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- ENHANCED DEMO CHARACTER: "Lyra Silvervane"
  -- ═══════════════════════════════════════════════════════════════════

  UPDATE vault_characters SET
    backstory = 'The borderlands between the Kingdom of Valdris and the Thornwood Wilds have always bred survivors. Lyra was born to a human herbalist mother and an elven ranger father in a small outpost that served as the last stop before the true wilderness.

Her mother, Maren, died of plague when Lyra was seven. Her father, Thalion, retreated into grief and eventually into the deep forest itself, leaving a teenage Lyra to fend for herself. She survived by learning the skills he''d taught her—tracking, hunting, reading the land like a book.

For years, she worked as a wilderness guide, leading merchants and scholars through dangerous territory. She earned a reputation for finding paths where none existed and for an uncanny ability to sense danger before it arrived.

Everything changed the night she stumbled upon the Cult of the Dying Star.

She was tracking a missing caravan when she found them—thirteen figures in black robes, arranged around an altar where travelers were being sacrificed to something that existed in the spaces between stars. She watched, frozen, as darkness coalesced into a shape that hurt to perceive.

She barely escaped. The cult''s servants pursued her for three days through the forest. When she finally collapsed at the edge of Thornhaven village, something had changed. The darkness had touched her—and now she could see in shadows that blinded others, move through darkness as if it were daylight.

The village took her in, nursed her back to health. The local priest said she''d been marked by something, but whether as champion or victim, he couldn''t say. Lyra decided to find out for herself.

Now she hunts those who prey on the innocent—cultists, bandits, monsters. She''s joined a group of adventurers who don''t ask too many questions about why her eyes sometimes gleam silver in the dark. Together, they delve into dungeons and right wrongs, though Lyra knows that eventually she''ll have to face the Cult of the Dying Star again.

And whatever spoke to her from the darkness between stars.',

    personality = 'Lyra is a study in contrasts. She''s quiet and observant, preferring to watch and listen rather than dominate conversations. Those who mistake her silence for timidity soon discover a sharp wit and an even sharper tongue—she simply chooses her words carefully.

She has difficulty trusting others, a legacy of her father''s abandonment and the betrayals she''s witnessed. New companions are kept at arm''s length until they prove themselves. But once someone earns her trust, she''s fiercely loyal—she''ll walk into certain death for those she considers friends.

Despite her grim profession, Lyra finds joy in small things: the first light of dawn on autumn leaves, the satisfaction of a perfect arrow flight, the warmth of a fire after a long day. She''s more sentimental than she''ll ever admit, keeping small mementos from her travels hidden in a leather pouch.

She struggles with the darkness that touched her. Sometimes she wakes from nightmares she can''t remember, her hands reaching for weapons that aren''t there. She fears what she might become if the darkness takes hold, but she''s also come to rely on the abilities it gave her. It''s a dangerous bargain, and she knows it.',

    ideals = 'The wilderness is my home, and I will protect it and those who dwell within it. No innocent should become prey to those who lurk in shadows—because I know better than most what hunts in the dark.',

    bonds = 'My father is still out there somewhere in the deep woods. I will find him and learn why he abandoned me—even if I have to track him to the ends of the earth.

I owe a debt to the village of Thornhaven for sheltering me after the cult attack. They asked nothing in return, and I will never forget that kindness.

Shadow, my giant owl companion, has been with me since that terrible night. She found me somehow, guided me to safety. I suspect she''s more than she appears.',

    flaws = 'I have difficulty trusting others completely. I always expect betrayal, always sleep with one eye open, always plan escape routes. It''s kept me alive, but it''s also kept me alone.

I have a dangerous curiosity about the darkness that touched me. I should fear it, and part of me does. But another part wants to understand it, to master it, to find out what spoke to me from between the stars. That curiosity might be my undoing.',

    updated_at = NOW()
  WHERE id = demo_character_id;

  -- Delete existing relationships to replace with enhanced versions
  DELETE FROM vault_character_relationships WHERE character_id = demo_character_id;

  -- Enhanced Character Relationships
  INSERT INTO vault_character_relationships (id, character_id, user_id, related_name, relationship_type, relationship_label, description, is_party_member, is_companion, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_character_id, NULL, 'Marcus Brightforge', 'ally', 'Party Member - Paladin',
     '**Human Paladin of Lathander, Level 7**

Marcus is everything Lyra isn''t—loud, optimistic, and utterly convinced that good will always triumph. A former soldier who found faith after a near-death experience, he''s devoted to bringing light to dark places.

They met during the investigation of the Dying Star cult. Marcus was the only one who didn''t flinch when Lyra emerged from the shadows with silver-gleaming eyes. "The dawn welcomes all who stand against the dark," he said, and meant it.

His unwavering optimism is both inspiring and occasionally exhausting. He insists on giving enemies chances to surrender, says prayers before every meal, and somehow remains cheerful in the worst dungeons. Lyra finds herself wanting to protect that optimism, even as part of her waits for reality to crush it.

*He reminds her of who she might have been, if the darkness hadn''t found her first.*',
     true, false, NOW(), NOW()),

    (gen_random_uuid(), demo_character_id, NULL, 'Whisper', 'ally', 'Party Member - Rogue',
     '**Tabaxi Rogue, Level 7**

No one knows Whisper''s real name—they claim Tabaxi don''t have names, only sounds, and "Whisper" is close enough. They''re an information broker, spy, and occasional thief who joined the party for "personal reasons" they refuse to elaborate on.

Whisper speaks in riddles, collects secrets like other people collect coins, and has an unsettling habit of appearing from nowhere. They treat everything as a transaction, even friendship—favors given and favors owed, carefully tracked.

Despite this mercenary outlook, Whisper has saved Lyra''s life three times. When asked why, they only smiled. "Because you haven''t told me your secrets yet. It would be a waste to let you die with them."

They make surprisingly good tea. It''s probably the only normal thing about them.

*Lyra suspects Whisper knows more about the Dying Star cult than they''re telling. She''s waiting for the right moment to ask.*',
     true, false, NOW(), NOW()),

    (gen_random_uuid(), demo_character_id, NULL, 'Shadow', 'ally', 'Animal Companion',
     '**Giant Owl, Bonded Companion**

Shadow found Lyra on the worst night of her life. As she fled the cult through the darkened forest, bleeding and half-mad with terror, the owl appeared—a massive shape with wings spanning eight feet, eyes that gleamed with uncanny intelligence.

She led Lyra to safety, hooting softly to guide her through the darkness. When Lyra finally collapsed at Thornhaven''s gates, Shadow was perched in a nearby tree, watching.

She''s been with Lyra ever since.

Shadow is no ordinary owl. She understands complex commands, shows tactical thinking in combat, and sometimes seems to know things before Lyra does. The priest at Thornhaven called her a "spirit guide"—a creature from the borders between worlds, drawn to those touched by extraordinary forces.

Lyra has stopped questioning it. Shadow is her companion, her scout, her friend. In the darkness of the Sunken Citadel, where light fails and monsters lurk, that''s enough.

*Shadow refuses to enter certain places. It worries Lyra more than she admits.*',
     false, true, NOW(), NOW()),

    (gen_random_uuid(), demo_character_id, NULL, 'Thalion Silvervane', 'family', 'Father - Missing',
     '**Elven Ranger, Whereabouts Unknown**

Lyra hasn''t seen her father in fifteen years. After her mother''s death, Thalion retreated into grief, becoming distant and distracted. One morning she woke to find him gone, with only a note: "I must walk alone for a time. The forest calls."

She''s spent years trying to find him. Rumors surface occasionally—a lone elf seen in the deep woods, moving with supernatural grace. Rangers in distant kingdoms speak of a grey-haired hunter who appears during great need, then vanishes.

Lyra tells herself she wants closure, wants to understand why he left. But part of her also wants to prove herself worthy—to show the father who abandoned her what she''s become.

*She keeps his old hunting knife. The leather is worn smooth from her hands.*',
     false, false, NOW(), NOW());

  -- Delete existing play journals to replace with enhanced versions
  DELETE FROM play_journal WHERE character_id = demo_character_id;

  -- Enhanced Play Journal
  INSERT INTO play_journal (id, character_id, title, notes, session_date, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_character_id, 'The Sunken Citadel - Descent',
     '## Session Notes

We descended into the ravine today. The citadel entrance was exactly as the rumors described—massive stone doors partially buried in earth and rubble, carved with dragon motifs that made my skin crawl. Marcus insisted on saying a prayer before we entered. For once, I didn''t roll my eyes.

Shadow wouldn''t come inside. She perched on a dead tree at the ravine''s edge, hooting anxiously as we disappeared into the darkness. I''ve never seen her refuse to follow me before. I didn''t tell the others how much that worried me.

## The Kobolds

The kobolds found us first. Or rather, we found one of them—a pathetic creature named Meepo, crying over an empty cage where he''d kept a dragon wyrmling. The goblins had stolen it, and he begged for our help like we were the last hope he''d ever have.

I don''t trust easily. But Meepo''s desperation seemed genuine. Not the calculating kind of desperation that precedes betrayal—the raw kind that comes from losing something you love.

We agreed to help him recover the dragon in exchange for information about the citadel. Marcus thinks we''re doing a good deed. Whisper thinks we''re being manipulated. I think the truth lies somewhere in between.

## The Kobold Queen

Their leader, Yusdrayl, is interesting. Sits on a throne of dragon bones, speaks like a queen despite ruling maybe thirty kobolds. But there''s real cunning in her eyes. She knows exactly what she''s offering us and exactly what she wants in return.

She gave us a key to the lower levels. Said there''s something called the "Twilight Grove" down there. The way she said it—with fear in her voice—made me pay attention.

## What I''ve Learned

- The citadel is divided between kobolds (upper levels) and goblins (middle)
- A "druid" controls the lower levels—but the kobolds speak of him like a monster
- The missing adventurers may have gone down to find him
- Something about this place feels *wrong* in a way I recognize

## Private Thoughts

The darkness here feels different from ordinary shadow. It presses against my senses like something alive, something waiting. I haven''t told the others that I can feel it watching us.

Part of me is terrified.

Part of me feels like I''m coming home.

*I''m not sure which part scares me more.*',
     '2024-01-22', NOW(), NOW()),

    (gen_random_uuid(), demo_character_id, 'The Sunken Citadel - Victory and Doubt',
     '## Session Notes

We killed the goblin chief today. Durnn was his name—a hobgoblin with more ambition than sense and a stolen sword that turned out to belong to one of the missing adventurers.

The battle was harder than expected. Durnn fought like a cornered animal, and for a moment I thought we might actually lose. Marcus went down under a flurry of blows, and I saw something I''ve never seen before—genuine fear in Whisper''s eyes.

But we won. We always seem to win. Sometimes I wonder when our luck will run out.

## Calcryx

The dragon—Calcryx—is beautiful in a terrible way. White scales like winter frost, eyes like chips of glacial ice. She was chained, angry, half-starved on goblin scraps.

When we freed her, I thought she might attack us. Instead, she turned to Meepo. And I swear—I *swear*—she made a sound like a cat''s purr. This ancient creature of legend, nuzzling the pathetic kobold who raised her.

It was almost sweet. Almost enough to make me forget she could freeze us solid with a breath.

## The Sword

Talgen''s sword. That''s who it belonged to—Talgen Hucrele, one of the missing adventurers. His initials were engraved on the pommel.

We found a note in Sharwyn''s handwriting among the goblin loot: *"The tree speaks. It promises everything."*

I don''t like that note. I don''t like what it implies about where the Hucrele siblings went, or what they found when they got there.

## The Lower Levels

Tomorrow we descend to the Twilight Grove. Yusdrayl gave us the key, and the kobolds will hold the upper levels while we''re gone. It''s the best deal we could make.

## Private Thoughts

I haven''t slept well since we entered the citadel. The dreams are back—formless things that whisper in a language I almost understand. I wake up with my hands reaching for something, but I can never remember what.

The darkness down here *knows* me. I''m certain of it now. Whatever touched me that night with the cult, whatever speaks from the spaces between stars—it has a connection to this place.

I should tell the others.

I won''t.

*Because part of me wants to see what''s waiting in the Grove. And that scares me most of all.*',
     '2024-01-29', NOW(), NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- ENHANCED DEMO ONE-SHOT: "The Night Market"
  -- ═══════════════════════════════════════════════════════════════════

  UPDATE oneshots SET
    introduction = 'Once a month, when the moon hides her face, the Night Market appears.

It comes to different places—an abandoned plaza, a crossroads at midnight, a clearing in haunted woods. No one knows who founded it or when. The oldest texts mention it only in whispers: a place where anything can be bought, if you''re willing to pay the price.

**Tonight, the Market has come to the old plaza in the Temple District of Westgate.**

The party has sought it out. Each of them needs something that cannot be found in ordinary shops—a cure for a dying friend, information about a missing person, a weapon capable of killing something that shouldn''t exist, or perhaps an answer to a question that keeps them awake at night.

The vendors are not human. They might wear human faces, but their eyes are too old, their smiles too wide, their shadows not quite right. They sell impossible things:
- Bottled memories in crystal vials
- Shadows that whisper secrets
- Keys to doors that don''t exist
- Time, measured in heartbeats
- Love and hate in equal measure
- The truth—but never the whole truth

**The Night Market has rules.** Some are posted on signs in languages that shift when you try to read them. Others are learned only by breaking them. The consequences are... memorable.

**Gold means nothing here.** The merchants accept only unusual currency:
- Years of your life
- Cherished memories
- Favors owed, to be collected later
- Secrets you''ve never told
- Tears of genuine grief
- The sound of your laughter

Tonight, the party must navigate treacherous bargains, compete with other desperate seekers, and discover that some prices are too high to pay—even when the alternative is losing everything.

*Welcome to the Night Market. Please watch your step, your words, and your soul.*',

    session_plan = '## Overview
A 3-4 hour one-shot about making deals with dangerous entities. Best for players who enjoy roleplay, moral dilemmas, and creative problem-solving. Combat is possible but not required.

---

## Act 1: The Gates (30-45 min)

### Setting the Scene
The party arrives at the old plaza at the stroke of midnight. Where there should be empty flagstones, there''s now a labyrinth of colorful tents and stalls that definitely weren''t there before. Impossible lights float overhead—not torches, but glowing moths the size of fists.

### The Faceless Guardian
A cloaked figure stands at the entrance. It has no face—just smooth skin where features should be. When it speaks, the voice comes from everywhere at once.

> "Welcome, seekers. The Night Market opens its arms to all who come with genuine need. But first... you must prove you understand the value of secrets."

**Each player must either:**
- Answer a riddle (DC 12 Intelligence)
- Pay a toll: A secret they''ve never told anyone (roleplay opportunity)

**Sample Riddles:**
- "I am not alive, but I grow; I don''t have lungs, but I need air. What am I?" (Fire)
- "The more you take, the more you leave behind. What am I?" (Footsteps)
- "I can be cracked, made, told, and played. What am I?" (Joke)

**If a player fails or refuses:** They may still enter, but the Guardian marks them. They''ll have disadvantage on one roll at the DM''s discretion later in the session.

---

## Act 2: The Market (60-90 min)

### Exploration Phase
Let players explore the Market. Describe vendors selling strange wares:

- A skeletal figure in finery selling "Tomorrow''s Regrets"
- A child with ancient eyes offering "Lost Toys" that might be more than they seem
- A beautiful woman whose reflection is a withered crone, selling "Mirrors of Truth"
- A man with too many fingers crafting keys to "Anywhere You''ve Been"

**The party''s goal is somewhere in this chaos.**

### Key Encounter: Madame Vesper

Madame Vesper runs **The Memory Emporium**, a stall draped in twilight-colored silks. She sells bottled memories in crystal vials—and she has what the party seeks.

**Her Appearance:** Ageless and elegant. Silver eyes that see too much. Her voice is like silk over steel.

**Her Wares:**
| Item | Price |
|------|-------|
| Cure for any mundane disease | Memory of your happiest day |
| Location of any person | Memory of your mother''s face |
| Answer to any question | Memory of why you became an adventurer |
| Artifact location | Memory of your first love |

**Negotiation Options:**
- DC 18 Persuasion might convince her to accept a partial payment
- DC 20 Deception might let you offer a false memory (but she''ll know eventually)
- Offering something she hasn''t heard before grants advantage

**She cannot and will not accept gold.** But she might accept a particularly interesting secret, a genuine tear, or a promise she finds amusing.

---

## Act 3: The Auction (45-60 min)

### Setup
If the party seeks a specific item/information, it goes up for auction. The auctioneer is a imp in a top hat who speaks entirely in rhyme.

### Other Bidders
The party must outbid these desperate seekers:

**Lady Miriam Voss** - A weeping noblewoman
- Bidding years of her life for a cure to her son''s curse
- Will go up to 15 years before she breaks down
- Could potentially be convinced to join forces with the party

**The Hooded Figure** - Actually a devil named Velixar
- Bidding "favors" (actually souls he''s already collected)
- Will bid aggressively to drive up prices
- His contract offers are tempting but dangerous

**Aldric the Collector** - A wizard in moth-eaten robes
- Bidding with his familiar''s remaining lifespan
- Genuinely desperate and will make poor decisions
- Might give the party useful information if they help him

### Party Options
- Pool their resources for a combined bid
- Convince other bidders to drop out (roleplay)
- Attempt to steal the item (DC 20 Stealth, severe consequences if caught)
- Make a deal with one of the other bidders
- Interrupt the auction with a challenge

---

## Act 4: Breaking the Rules (30-45 min)

### Optional Confrontation
If at any point the party:
- Attempts theft
- Uses violence unprovoked
- Breaks a spoken promise
- Tries to leave without paying a debt

The Market responds. The lights dim. All conversation stops. And the enforcers come.

### The Market''s Enforcers
- 2 Shadow Mastiffs (MM p. 190)
- 1 Bodak (VGM p. 127) - or reduce to Shadow Demon for lower levels

**This is meant to be a dangerous fight.** The party should understand that the Market''s rules exist for a reason.

### Alternative Resolution
The party can plead their case to the Market Master—a figure who appears as whatever the viewer fears most. DC 20 Persuasion to argue for leniency, with advantage if they can offer something the Master finds interesting.

---

## Conclusion

### Possible Endings

**They Got What They Came For**
- But at what cost? Make sure players feel the weight of their payments
- The merchant thanks them and invites them to return "when need drives you back"
- Hint that some prices have... interest rates

**They Left Empty-Handed**
- Sometimes the price is too high. This is a valid ending
- The Market offers a consolation: "Come back when you''re more... desperate"

**They Outsmarted the Market**
- Very difficult but possible with creativity
- The Market respects cleverness—but also remembers

### Aftermath Hook
Before they leave, a vendor presses something into one character''s hand—a token marked with the Market''s symbol. "For when you need us again. And you will. They always do."',

    key_npcs = '## Major NPCs

### The Faceless Guardian
**Role:** Gatekeeper | **Disposition:** Neutral

The entity that guards the Night Market''s entrance. It has no face—just smooth skin where features should be. When it speaks, the voice comes from everywhere and nowhere.

**Personality:** Absolutely fair. It doesn''t favor or punish—it simply enforces the entry requirements. Those who try to bypass it find themselves walking in circles, always arriving back at its feet.

**What It Wants:** Proof that visitors understand the value of secrets. Nothing more.

**Voice:** Multiple whispered voices speaking in unison, slightly out of sync.

---

### Madame Vesper
**Role:** Merchant | **Disposition:** Businesslike

The proprietor of The Memory Emporium. She is ageless—old texts mention her, always described the same way. She buys and sells memories, treating them with the care other merchants show gold.

**Appearance:** Elegant and timeless. Silver eyes that see through pretense. Her stall smells of forgotten summers and the sea at dawn.

**Personality:** Scrupulously fair but utterly without sentiment. A memory is a memory—she doesn''t care if it''s your wedding day or your grandmother''s funeral. She''ll pay the same for grief as joy.

**What She Wants:** Interesting memories. She''s collected thousands of ordinary ones. Surprise her with something unique, and she might offer a discount.

**Quote:** *"The past is currency, dear customer. Everyone''s saving up and no one wants to spend. How shortsighted. Memories fade anyway—why not trade them for something permanent?"*

---

### The Market Master
**Role:** Authority | **Disposition:** Terrifying

No one knows what the Market Master truly is. When it appears to judge transgressions, it wears the face of whatever the viewer fears most—a disappointed parent, a vengeful god, their own corpse.

**What It Wants:** Order. The Market Master exists to enforce the rules that make the Night Market possible. Without rules, the Market would descend into chaos—and the things that sell here would have no reason to maintain their fragile peace.

**Voice:** Your own voice, speaking truths you''ve never said aloud.

---

## Secondary NPCs

### Lady Miriam Voss
A noblewoman whose son lies cursed and dying. She''s been to every healer, every temple, every witch. The Night Market is her last hope. She''ll pay anything—years of her life, her happiest memories, her very name.

*Use her to show players the human cost of the Market. She''s sympathetic and desperate.*

### Velixar (The Hooded Figure)
A devil disguised as a wealthy merchant. He''s here collecting souls through "favorable deals" and driving up auction prices to force others into making desperate bargains with him.

*If the party realizes what he is, he''ll offer them a deal directly—something they want, in exchange for a "small service" later.*

### Aldric the Collector
A wizard who traded his youth for power decades ago. Now ancient and dying, he''s seeking a way to undo his bargain. He''ll share information freely if the party seems sympathetic—he''s too desperate to be cautious.

*Good source of exposition about the Market''s history and rules.*',

    updated_at = NOW()
  WHERE id = demo_oneshot_id;

END $$;
