-- Migration: Seed Demo Content
-- Creates publicly viewable demo content for new users to explore

-- Use a consistent demo user ID (doesn't need to be a real auth user)
-- This content is accessible via is_demo=true flag
DO $$
DECLARE
  demo_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  demo_campaign_id UUID := '00000000-0000-0000-0001-000000000001'::UUID;
  demo_character_id UUID := '00000000-0000-0000-0002-000000000001'::UUID;
  demo_oneshot_id UUID := '00000000-0000-0000-0003-000000000001'::UUID;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════
  -- DEMO CAMPAIGN: "The Sunken Citadel"
  -- ═══════════════════════════════════════════════════════════════════

  INSERT INTO campaigns (
    id, user_id, name, description, game_system, status, is_demo, created_at, updated_at
  ) VALUES (
    demo_campaign_id,
    demo_user_id,
    'The Sunken Citadel',
    'Deep in the Thornwood Forest lies an ancient fortress, swallowed by the earth centuries ago. Now, strange lights flicker from its depths, and the nearby village of Oakhurst sends desperate pleas for help. What treasures and terrors await in the Sunken Citadel?',
    'D&D 5e',
    'active',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_demo = true,
    updated_at = NOW();

  -- Campaign Characters (NPCs)
  INSERT INTO characters (id, campaign_id, name, type, description, race, class, notes, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_campaign_id, 'Kerowyn Hucrele', 'npc',
     'A wealthy merchant and worried mother. Her children Talgen and Sharwyn ventured into the citadel a month ago and haven''t returned.',
     'Human', NULL, 'Offers 250gp per rescued child. Located in Oakhurst village.', NOW(), NOW()),
    (gen_random_uuid(), demo_campaign_id, 'Meepo', 'ally',
     'A pathetic kobold who lost his dragon wyrmling, Calcryx. Desperately seeks help recovering her from the goblins.',
     'Kobold', NULL, 'Knows the citadel layout. Loyal but cowardly. Speaks broken Common.', NOW(), NOW()),
    (gen_random_uuid(), demo_campaign_id, 'Belak the Outcast', 'villain',
     'A twisted druid corrupted by the Gulthias Tree. Plans to spread the tree''s dark influence across the land.',
     'Human', 'Druid', 'Controls the twilight grove. Has dominated the missing adventurers.', NOW(), NOW()),
    (gen_random_uuid(), demo_campaign_id, 'Calcryx', 'ally',
     'A young white dragon, stolen by goblins and kept as a trophy. Bad-tempered but potentially valuable ally.',
     'White Dragon Wyrmling', NULL, 'AC 16, HP 32. Breath weapon deals 2d8 cold damage.', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- Timeline Events
  INSERT INTO timeline_events (id, campaign_id, title, description, event_date, created_at)
  VALUES
    (gen_random_uuid(), demo_campaign_id, 'Session 1: Oakhurst',
     'The party arrived in Oakhurst and learned about the missing adventurers. Met with Kerowyn Hucrele who offered a reward for her children''s rescue.',
     '1492-03-15', NOW()),
    (gen_random_uuid(), demo_campaign_id, 'Session 2: Into the Citadel',
     'Descended into the ravine and entered the citadel. Encountered kobolds and befriended Meepo. Learned about the goblin/kobold war.',
     '1492-03-22', NOW()),
    (gen_random_uuid(), demo_campaign_id, 'Session 3: Goblin Territory',
     'Infiltrated goblin territory. Defeated Durnn the goblin chief. Recovered Calcryx the dragon wyrmling.',
     '1492-03-29', NOW())
  ON CONFLICT DO NOTHING;

  -- Sessions for Campaign
  INSERT INTO sessions (id, campaign_id, title, summary, session_date, notes, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_campaign_id, 'Session 1: The Call to Adventure',
     'The party gathered in the village of Oakhurst, drawn by rumors of treasure and missing adventurers.',
     '2024-01-15',
     '## Key Events\n- Met Kerowyn Hucrele at the Ol'' Boar Inn\n- Learned about her missing children Talgen and Sharwyn\n- Discovered the legend of the Sunken Citadel\n- Negotiated rescue reward: 250gp per child\n\n## NPCs Met\n- **Kerowyn Hucrele**: Wealthy merchant, desperate mother\n- **Garon**: Innkeeper, knows local legends\n- **Corkie**: Halfling barmaid, overheard goblin sightings\n\n## Loot\n- None yet\n\n## Next Steps\n- Travel to the ravine entrance\n- Explore the citadel depths',
     NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════════
  -- DEMO CHARACTER: "Lyra Silvervane"
  -- ═══════════════════════════════════════════════════════════════════

  INSERT INTO vault_characters (
    id, user_id, name, race, class, subclass, level, background, alignment,
    backstory, personality, ideals, bonds, flaws, status, is_demo, created_at, updated_at
  ) VALUES (
    demo_character_id,
    demo_user_id,
    'Lyra Silvervane',
    'Half-Elf',
    'Ranger',
    'Gloom Stalker',
    7,
    'Outlander',
    'Neutral Good',
    'Born in the borderlands between civilization and the wild, Lyra never quite fit in either world. Her human mother died when she was young, and her elven father taught her to track and hunt before vanishing into the deep woods when she was barely an adult.

She spent years as a guide through dangerous territories, earning a reputation for being able to find paths where none existed. But it was the night she stumbled upon a cult sacrificing travelers to a dark entity that changed everything. She barely survived, but something from that darkness touched her—and now she can see in shadows that blind others.

Now she hunts those who prey on the innocent, moving through darkness as comfortably as daylight.',
    'Quiet and observant, Lyra speaks only when necessary. She has a dry wit that surprises those who assume she''s humorless. Despite her solitary nature, she''s fiercely protective of those she considers friends.',
    'The wilderness is my home, and I will protect it and those who dwell within it. No innocent should become prey.',
    'My father is still out there somewhere. I will find him and learn why he abandoned me. I also owe a debt to the village of Thornhaven for sheltering me after the cult attack.',
    'I have difficulty trusting others completely, always expecting betrayal. I also have a dangerous curiosity about the darkness that touched me.',
    'Active',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    backstory = EXCLUDED.backstory,
    is_demo = true,
    updated_at = NOW();

  -- Character relationships (party members)
  INSERT INTO vault_character_relationships (id, character_id, name, race, class, relationship_type, backstory, is_party_member, is_companion, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_character_id, 'Marcus Brightforge', 'Human', 'Paladin',
     'Party Member', 'A devout paladin of Lathander. Met during the cult investigation. His unwavering optimism is both inspiring and occasionally exhausting.',
     true, false, NOW(), NOW()),
    (gen_random_uuid(), demo_character_id, 'Whisper', 'Tabaxi', 'Rogue',
     'Party Member', 'A mysterious information broker who joined the group for "personal reasons" they refuse to elaborate on. Surprisingly good at making tea.',
     true, false, NOW(), NOW()),
    (gen_random_uuid(), demo_character_id, 'Shadow', NULL, NULL,
     'Animal Companion', 'A giant owl that found Lyra after the cult attack. Unusually intelligent and seems to understand more than a normal animal should.',
     false, true, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- Character play journal entries
  INSERT INTO play_journal (id, character_id, title, content, session_date, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_character_id, 'The Sunken Citadel - Part 1',
     '## Session Notes

We descended into the ravine today. The citadel entrance was as the rumors described—massive stone doors partially buried in earth and rubble. Marcus insisted on saying a prayer before we entered. I didn''t object.

The kobolds found us first. Or rather, we found one of them—a pitiful creature named Meepo, crying over a cage where he''d kept a dragon wyrmling. The goblins had stolen it, and he begged for our help.

I don''t trust easily, but Meepo''s desperation seemed genuine. We''ve agreed to help him recover the dragon in exchange for information about the citadel. Marcus thinks we''re doing a good deed. Whisper thinks we''re being manipulated. I think the truth lies somewhere in between.

**Key Discoveries:**
- The citadel is divided between kobolds and goblins
- A "druid" controls the lower levels
- The missing adventurers may have gone down to find him

Shadow refuses to enter the citadel. That worries me more than I care to admit.',
     '2024-01-22', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════════
  -- DEMO ONE-SHOT: "The Night Market"
  -- ═══════════════════════════════════════════════════════════════════

  INSERT INTO oneshots (
    id, user_id, title, tagline, premise, game_system, estimated_duration, player_count_min, player_count_max,
    is_demo, created_at, updated_at
  ) VALUES (
    demo_oneshot_id,
    demo_user_id,
    'The Night Market',
    'Not everything for sale is meant to be bought.',
    'Once a month, when the moon is dark, the Night Market appears in the abandoned plaza of Old Town. Merchants from across the planes gather to sell impossible wares: bottled memories, shadows that whisper secrets, keys to doors that don''t exist.

The party has come seeking something specific—a cure for a dying friend, information about a missing person, or an artifact of terrible power. But the Night Market has rules, and not all of them are spoken. The merchants accept only unusual currency: years of life, cherished memories, or favors yet to be named.

Tonight, the party must navigate treacherous bargains, compete with other desperate seekers, and discover that some prices are too high to pay—even when the alternative is losing everything.',
    'D&D 5e',
    '3-4 hours',
    3,
    5,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    premise = EXCLUDED.premise,
    is_demo = true,
    updated_at = NOW();

  -- One-shot encounters
  INSERT INTO oneshot_encounters (id, oneshot_id, name, description, encounter_type, difficulty, notes, order_index, created_at, updated_at)
  VALUES
    (gen_random_uuid(), demo_oneshot_id, 'Market Entrance',
     'The party must prove their worth to enter the Night Market. The guardian—a cloaked figure with no face—demands they each answer a riddle or pay a toll.',
     'social', 'easy',
     '**Riddles (DC 12 INT):**
- "I am not alive, but I grow; I don''t have lungs, but I need air. What am I?" (Fire)
- "The more you take, the more you leave behind. What am I?" (Footsteps)

**Alternative Toll:** A secret the character has never told anyone (roleplay opportunity).',
     1, NOW(), NOW()),
    (gen_random_uuid(), demo_oneshot_id, 'The Merchant of Memories',
     'Madame Vesper sells bottled memories in crystal vials. She has what the party seeks, but her price is steep: a cherished memory from each buyer.',
     'social', 'medium',
     '**Vesper''s Wares:**
- Cure for any mundane disease (costs: memory of your happiest day)
- Location of any person (costs: memory of your mother''s face)
- Artifact location (costs: memory of why you''re adventuring)

**Negotiation:** DC 18 Persuasion might reduce the price slightly, but she cannot accept gold.',
     2, NOW(), NOW()),
    (gen_random_uuid(), demo_oneshot_id, 'The Auction',
     'The item the party seeks goes up for auction. They must outbid other desperate buyers using the Night Market''s strange currencies.',
     'social', 'hard',
     '**Other Bidders:**
- A weeping noblewoman offering years of her life
- A hooded figure bidding with "favors" (actually a devil)
- A desperate wizard offering his familiar

**Party Options:** Pool resources, convince other bidders to drop out, or try to steal the item (DC 20 Stealth, severe consequences if caught).',
     3, NOW(), NOW()),
    (gen_random_uuid(), demo_oneshot_id, 'The Market''s Rules',
     'The party breaks a rule (intentionally or not) and must face the consequences. The Market''s enforcers are not to be trifled with.',
     'combat', 'hard',
     '**Market Enforcers:** Use Shadow Mastiff stats (2) + 1 Bodak for a deadly encounter

**Alternative Resolution:** The party can plead their case to the Market Master (DC 20 Persuasion) or offer restitution.',
     4, NOW(), NOW())
  ON CONFLICT DO NOTHING;

END $$;

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR DEMO CONTENT (Public viewing)
-- ═══════════════════════════════════════════════════════════════════

-- Allow public read access to demo campaigns
DROP POLICY IF EXISTS "Public can view demo campaigns" ON campaigns;
CREATE POLICY "Public can view demo campaigns"
  ON campaigns FOR SELECT
  USING (is_demo = true);

-- Allow public read access to demo characters
DROP POLICY IF EXISTS "Public can view demo vault characters" ON vault_characters;
CREATE POLICY "Public can view demo vault characters"
  ON vault_characters FOR SELECT
  USING (is_demo = true);

-- Allow public read access to demo oneshots
DROP POLICY IF EXISTS "Public can view demo oneshots" ON oneshots;
CREATE POLICY "Public can view demo oneshots"
  ON oneshots FOR SELECT
  USING (is_demo = true);

-- Allow public read access to characters in demo campaigns
DROP POLICY IF EXISTS "Public can view demo campaign characters" ON characters;
CREATE POLICY "Public can view demo campaign characters"
  ON characters FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE is_demo = true)
  );

-- Allow public read access to sessions in demo campaigns
DROP POLICY IF EXISTS "Public can view demo campaign sessions" ON sessions;
CREATE POLICY "Public can view demo campaign sessions"
  ON sessions FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE is_demo = true)
  );

-- Allow public read access to timeline events in demo campaigns
DROP POLICY IF EXISTS "Public can view demo timeline events" ON timeline_events;
CREATE POLICY "Public can view demo timeline events"
  ON timeline_events FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE is_demo = true)
  );

-- Allow public read access to relationships of demo characters
DROP POLICY IF EXISTS "Public can view demo character relationships" ON vault_character_relationships;
CREATE POLICY "Public can view demo character relationships"
  ON vault_character_relationships FOR SELECT
  USING (
    character_id IN (SELECT id FROM vault_characters WHERE is_demo = true)
  );

-- Allow public read access to play journals of demo characters
DROP POLICY IF EXISTS "Public can view demo play journals" ON play_journal;
CREATE POLICY "Public can view demo play journals"
  ON play_journal FOR SELECT
  USING (
    character_id IN (SELECT id FROM vault_characters WHERE is_demo = true)
  );

-- Allow public read access to demo oneshot encounters
DROP POLICY IF EXISTS "Public can view demo oneshot encounters" ON oneshot_encounters;
CREATE POLICY "Public can view demo oneshot encounters"
  ON oneshot_encounters FOR SELECT
  USING (
    oneshot_id IN (SELECT id FROM oneshots WHERE is_demo = true)
  );

-- Allow public read access to demo oneshot runs
DROP POLICY IF EXISTS "Public can view demo oneshot runs" ON oneshot_runs;
CREATE POLICY "Public can view demo oneshot runs"
  ON oneshot_runs FOR SELECT
  USING (
    oneshot_id IN (SELECT id FROM oneshots WHERE is_demo = true)
  );
