// Demo data to showcase the app's potential
// These are used as placeholders and examples

export const DEMO_CAMPAIGNS = [
  {
    id: 'demo-1',
    name: 'Curse of Strahd',
    game_system: 'D&D 5e',
    description: 'A gothic horror adventure in the mist-shrouded realm of Barovia, where the vampire lord Strahd von Zarovich holds dominion over the land.',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop',
    updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Storm King\'s Thunder',
    game_system: 'D&D 5e',
    description: 'Giants have emerged from their strongholds to threaten civilization as never before. Hill giants steal food, stone giants destroy settlements, and cloud giants claim the skies.',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=300&fit=crop',
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Tomb of Annihilation',
    game_system: 'D&D 5e',
    description: 'A death curse has befallen the land. Venture into the jungles of Chult to find the source and end the curse before time runs out.',
    image_url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop',
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_CHARACTERS = [
  // Player Characters
  {
    id: 'char-1',
    campaign_id: 'demo-1',
    name: 'Theron Brightheart',
    type: 'pc',
    summary: 'A noble paladin seeking to free Barovia from its dark curse. Sworn to the Oath of Devotion.',
    notes: '**Background:** Noble from Waterdeep\n**Class:** Paladin 8\n**Goals:** Destroy Strahd, protect the innocent\n**Secrets:** His family has a dark history with vampires',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Theron%20Brightheart&backgroundColor=b6e3f4',
    position_x: 100,
    position_y: 100,
  },
  {
    id: 'char-2',
    campaign_id: 'demo-1',
    name: 'Lyra Shadowmend',
    type: 'pc',
    summary: 'A half-elf warlock who made a pact with an archfey to escape her tragic past.',
    notes: '**Background:** Charlatan\n**Class:** Warlock 8 (Archfey)\n**Patron:** The Prince of Frost\n**Goals:** Find her missing sister, gain more power',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lyra%20Shadowmend&backgroundColor=c0aede',
    position_x: 350,
    position_y: 100,
  },
  {
    id: 'char-3',
    campaign_id: 'demo-1',
    name: 'Grimjaw Ironfoot',
    type: 'pc',
    summary: 'A grumpy dwarven cleric of Moradin who follows the party despite constant complaints.',
    notes: '**Background:** Acolyte\n**Class:** Cleric 8 (Forge Domain)\n**Quirks:** Complains about everything, secretly cares deeply\n**Goals:** Find a legendary forge, prove his worth to his clan',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Grimjaw%20Ironfoot&backgroundColor=d1d4f9',
    position_x: 600,
    position_y: 100,
  },
  {
    id: 'char-4',
    campaign_id: 'demo-1',
    name: 'Zara Nightwhisper',
    type: 'pc',
    summary: 'A tiefling rogue with a mysterious past and connections to the criminal underworld.',
    notes: '**Background:** Criminal\n**Class:** Rogue 8 (Arcane Trickster)\n**Specialties:** Lock picking, investigation, deception\n**Goals:** Steal something that cannot be stolen',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zara%20Nightwhisper&backgroundColor=ffd5dc',
    position_x: 225,
    position_y: 300,
  },
  // NPCs
  {
    id: 'char-5',
    campaign_id: 'demo-1',
    name: 'Strahd von Zarovich',
    type: 'npc',
    summary: 'The immortal vampire lord of Barovia. Elegant, tragic, and utterly ruthless.',
    notes: '**Role:** Main Antagonist\n**Motivations:** Possess Ireena, maintain control of Barovia\n**Weaknesses:** Sunlight, holy symbols, his own tragic past\n**Personality:** Charming, manipulative, melancholic',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Strahd%20von%20Zarovich&backgroundColor=1a1a2e',
    position_x: 475,
    position_y: 300,
  },
  {
    id: 'char-6',
    campaign_id: 'demo-1',
    name: 'Ireena Kolyana',
    type: 'npc',
    summary: 'The adopted daughter of the late Burgomaster. She is the reincarnation of Strahd\'s lost love, Tatyana.',
    notes: '**Role:** Key NPC / Quest Giver\n**Personality:** Brave, compassionate, determined\n**Goals:** Escape Barovia, protect her brother\n**Secret:** Bears bite marks from Strahd',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ireena%20Kolyana&backgroundColor=ffdfbf',
    position_x: 100,
    position_y: 500,
  },
  {
    id: 'char-7',
    campaign_id: 'demo-1',
    name: 'Madam Eva',
    type: 'npc',
    summary: 'An ancient Vistani seer who can read the fortunes of those who enter Barovia.',
    notes: '**Role:** Oracle / Guide\n**Location:** Tser Pool Encampment\n**Abilities:** Tarokka reading, foresight\n**Secret:** Knows more about Strahd than she reveals',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Madam%20Eva&backgroundColor=a3c4bc',
    position_x: 350,
    position_y: 500,
  },
  {
    id: 'char-8',
    campaign_id: 'demo-1',
    name: 'Ezmerelda d\'Avenir',
    type: 'npc',
    summary: 'A Vistani monster hunter and former protégé of the legendary Rudolph van Richten.',
    notes: '**Role:** Ally / Potential Party Member\n**Class:** Fighter/Wizard\n**Equipment:** Magic wagon, silver weapons\n**Goals:** Destroy Strahd, prove herself',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ezmerelda%20dAvenir&backgroundColor=f9c74f',
    position_x: 600,
    position_y: 500,
  },
]

export const DEMO_TAGS = [
  { id: 'tag-1', campaign_id: 'demo-1', name: 'ally', color: '#34d399' },
  { id: 'tag-2', campaign_id: 'demo-1', name: 'enemy', color: '#e85d4c' },
  { id: 'tag-3', campaign_id: 'demo-1', name: 'romantic', color: '#ec4899' },
  { id: 'tag-4', campaign_id: 'demo-1', name: 'rival', color: '#f59e0b' },
  { id: 'tag-5', campaign_id: 'demo-1', name: 'family', color: '#8b5cf6' },
  { id: 'tag-6', campaign_id: 'demo-1', name: 'mentor', color: '#3b82f6' },
  { id: 'tag-7', campaign_id: 'demo-1', name: 'business', color: '#6b7280' },
  { id: 'tag-8', campaign_id: 'demo-1', name: 'mysterious', color: '#a855f7' },
]

export const DEMO_CHARACTER_TAGS = [
  // Theron's relationships
  { id: 'ct-1', character_id: 'char-1', tag_id: 'tag-1', related_character_id: 'char-2', notes: 'Trusts her with his life' },
  { id: 'ct-2', character_id: 'char-1', tag_id: 'tag-2', related_character_id: 'char-5', notes: 'Sworn to destroy him' },
  { id: 'ct-3', character_id: 'char-1', tag_id: 'tag-1', related_character_id: 'char-6', notes: 'Has vowed to protect her' },
  // Lyra's relationships
  { id: 'ct-4', character_id: 'char-2', tag_id: 'tag-1', related_character_id: 'char-1', notes: 'Respects his dedication' },
  { id: 'ct-5', character_id: 'char-2', tag_id: 'tag-8', related_character_id: 'char-7', notes: 'The fortune troubles her' },
  // Strahd's relationships
  { id: 'ct-6', character_id: 'char-5', tag_id: 'tag-3', related_character_id: 'char-6', notes: 'Obsessed with her' },
  { id: 'ct-7', character_id: 'char-5', tag_id: 'tag-2', related_character_id: 'char-1', notes: 'Sees him as a nuisance' },
]

export const DEMO_SESSIONS = [
  {
    id: 'session-1',
    campaign_id: 'demo-1',
    session_number: 1,
    title: 'Mists of Barovia',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party was mysteriously transported to Barovia through the mists. They found a body with a letter and made their way to the village of Barovia.',
    notes: '# Session 1: Mists of Barovia\n\n## Key Events\n- Party entered Barovia through the mists\n- Found a letter from the Burgomaster pleading for help\n- Encountered wolves at the gates of Barovia\n\n## NPCs Met\n- None yet\n\n## Loot\n- Letter from Kolyan Indirovich\n- 50 gold pieces from the body',
  },
  {
    id: 'session-2',
    campaign_id: 'demo-1',
    session_number: 2,
    title: 'Death House',
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party was lured into the infamous Death House by two ghost children. They explored the haunted manor and faced the horrors within.',
    notes: '# Session 2: Death House\n\n## Key Events\n- Explored the Durst Manor\n- Discovered the dark history of the cult\n- Defeated the shambling mound in the basement\n\n## NPCs Met\n- Rose and Thorn (ghost children)\n\n## Loot\n- Deed to the Durst windmill\n- +1 Longsword',
  },
  {
    id: 'session-3',
    campaign_id: 'demo-1',
    session_number: 3,
    title: 'The Village of Barovia',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'After escaping Death House, the party explored the village, met Ismark and Ireena, and attended the Burgomaster\'s funeral.',
    notes: '# Session 3: The Village of Barovia\n\n## Key Events\n- Met Ismark the Lesser at the Blood of the Vine tavern\n- Visited the Burgomaster\'s mansion\n- Attended the funeral at the church\n- Met Father Donavich and heard about his son Doru\n\n## NPCs Met\n- Ismark Kolyanovich\n- Ireena Kolyana\n- Father Donavich\n\n## Loot\n- Payment from Ismark (100 gp)',
  },
  {
    id: 'session-4',
    campaign_id: 'demo-1',
    session_number: 4,
    title: 'Tser Pool Encampment',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party escorted Ireena toward Vallaki, stopping at the Vistani camp where Madam Eva read their fortunes.',
    notes: '# Session 4: Tser Pool Encampment\n\n## Key Events\n- Traveled with Ireena toward Vallaki\n- Met the Vistani at Tser Pool\n- Received a Tarokka reading from Madam Eva\n\n## The Tarokka Reading\n- **Tome of Strahd:** The Broken One - in a place of madness\n- **Holy Symbol:** The Innocent - with a young man\n- **Sunsword:** The Beast - in a place of bones\n- **Strahd\'s Enemy:** The Mists - a wanderer of the lands\n- **Strahd\'s Location:** The Darklord - in his tomb\n\n## NPCs Met\n- Madam Eva\n- Various Vistani',
  },
]

export const DEMO_TIMELINE_EVENTS = [
  {
    id: 'event-1',
    campaign_id: 'demo-1',
    title: 'Arrived in Barovia',
    description: 'The party was mysteriously drawn through the mists into the demiplane of dread.',
    event_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'discovery',
    character_id: null,
  },
  {
    id: 'event-2',
    campaign_id: 'demo-1',
    title: 'Escaped Death House',
    description: 'The party survived the horrors of the Durst manor and defeated the shambling mound.',
    event_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'combat',
    character_id: null,
  },
  {
    id: 'event-3',
    campaign_id: 'demo-1',
    title: 'Met Ireena Kolyana',
    description: 'The party met the adopted daughter of the late Burgomaster at his funeral.',
    event_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'character_intro',
    character_id: 'char-6',
  },
  {
    id: 'event-4',
    campaign_id: 'demo-1',
    title: 'Tarokka Reading',
    description: 'Madam Eva revealed the locations of the artifacts needed to defeat Strahd.',
    event_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'discovery',
    character_id: 'char-7',
  },
  {
    id: 'event-5',
    campaign_id: 'demo-1',
    title: 'Quest: Escort Ireena to Vallaki',
    description: 'The party agreed to protect Ireena and take her to the fortified town of Vallaki.',
    event_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'quest_start',
    character_id: 'char-6',
  },
]

export const DEMO_VAULT_CHARACTERS = [
  {
    id: 'vault-1',
    name: 'Marcus Blackwood',
    type: 'npc',
    summary: 'A mysterious merchant who appears in various campaigns, always with rare and unusual goods.',
    notes: '**Appearance:** Tall, thin man with silver hair and knowing eyes\n**Personality:** Cryptic, helpful, seems to know more than he should\n**Uses:** Can appear in any setting as a source of magic items or plot hooks',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus%20Blackwood&backgroundColor=8b5cf6',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'vault-2',
    name: 'Seraphina the Wise',
    type: 'npc',
    summary: 'An ancient elven sage with knowledge of forgotten lore and prophecies.',
    notes: '**Appearance:** Elderly elf with silver hair, often seen with a crow familiar\n**Specialty:** History, arcane lore, prophecy interpretation\n**Uses:** Exposition, quest hooks, mentor figure',
    image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Seraphina%20the%20Wise&backgroundColor=d4a843',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'vault-3',
    name: 'Template: Tavern Owner',
    type: 'npc',
    summary: 'A generic template for tavern owners that can be customized for any setting.',
    notes: '**Customize:** Name, race, personality\n**Common Traits:** Friendly, well-connected, hears all the rumors\n**Plot Hooks:** Rumors, bounty boards, mysterious patrons',
    image_url: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Generate a DiceBear avatar URL for a character name
export function generateAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name)
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`
}

// Character images for canvas nodes (using DiceBear for fantasy feel)
export const CHARACTER_PLACEHOLDER_IMAGES = {
  warrior: 'https://api.dicebear.com/7.x/adventurer/svg?seed=warrior&backgroundColor=b6e3f4',
  mage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mage&backgroundColor=c0aede',
  rogue: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rogue&backgroundColor=1a1a2e',
  cleric: 'https://api.dicebear.com/7.x/adventurer/svg?seed=cleric&backgroundColor=d1d4f9',
  default: 'https://api.dicebear.com/7.x/adventurer/svg?seed=adventurer&backgroundColor=ffd5dc',
}

// Helper function to check if we should show demo data
export function shouldShowDemoData(realDataCount: number): boolean {
  return realDataCount === 0
}

// Helper to get demo character by ID
export function getDemoCharacterById(id: string) {
  return DEMO_CHARACTERS.find(c => c.id === id)
}

// Helper to get demo tags for a character
export function getDemoTagsForCharacter(characterId: string) {
  return DEMO_CHARACTER_TAGS.filter(ct => ct.character_id === characterId)
    .map(ct => ({
      ...ct,
      tag: DEMO_TAGS.find(t => t.id === ct.tag_id),
      related_character: ct.related_character_id
        ? DEMO_CHARACTERS.find(c => c.id === ct.related_character_id)
        : null
    }))
}
