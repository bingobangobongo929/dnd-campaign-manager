/**
 * Database Seed Script
 *
 * Populates the Supabase database with Curse of Strahd demo data.
 *
 * Usage:
 * 1. Sign up on the site first to create your user account
 * 2. Copy your user ID from the browser console:
 *    - Open dev tools, go to Application > Local Storage > find supabase auth
 *    - Or run: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes("auth-token")))).user.id
 * 3. Set your USER_ID below
 * 4. Run: npm run seed
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

// ============ CONFIGURATION ============
// Set your user ID here after signing up
const USER_ID = 'YOUR_USER_ID_HERE'

// Your Supabase credentials (loaded from .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// =======================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function seed() {
  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ Please set your USER_ID in the script first!')
    console.log('\nTo find your user ID:')
    console.log('1. Sign up/login on your site')
    console.log('2. Open browser dev tools (F12)')
    console.log('3. Go to Console and run:')
    console.log('   JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes("auth-token")))).user.id')
    process.exit(1)
  }

  console.log('🌱 Starting database seed...\n')

  // 1. Create Campaign
  console.log('📚 Creating campaign...')
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: USER_ID,
      name: 'Curse of Strahd',
      game_system: 'D&D 5e',
      description: 'A gothic horror adventure in the mist-shrouded realm of Barovia, where the vampire lord Strahd von Zarovich holds dominion over the land.',
      image_url: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&h=600&fit=crop',
    })
    .select()
    .single()

  if (campaignError) {
    console.error('Failed to create campaign:', campaignError)
    process.exit(1)
  }
  console.log(`   ✓ Created campaign: ${campaign.name} (${campaign.id})`)

  const campaignId = campaign.id

  // 2. Create Characters
  console.log('\n👥 Creating characters...')
  const characters = [
    {
      campaign_id: campaignId,
      name: 'Ser Theron Brightheart',
      type: 'pc',
      summary: 'A noble paladin of Lathander seeking to free Barovia from darkness. Haunted by a family secret that connects him to the vampire lords of old.',
      notes: '<h2>Character Overview</h2><p><strong>Player:</strong> Marcus | <strong>Class:</strong> Paladin 9 (Oath of Devotion)</p><p>Tall and broad-shouldered with sun-kissed skin. His armor bears the rose symbol of Lathander.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Theron&backgroundColor=1a1a24',
      position_x: 120,
      position_y: 100,
    },
    {
      campaign_id: campaignId,
      name: 'Lyra Shadowmend',
      type: 'pc',
      summary: 'A half-elf warlock bound to the Archfey known as the Prince of Frost. She fled to Barovia seeking her missing sister.',
      notes: '<h2>Character Overview</h2><p><strong>Player:</strong> Sarah | <strong>Class:</strong> Warlock 9 (Archfey Patron)</p><p>Pale skin with an almost luminescent quality. Her left eye is violet, her right an icy blue.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lyra&backgroundColor=1a1a24',
      position_x: 460,
      position_y: 100,
    },
    {
      campaign_id: campaignId,
      name: 'Grimjaw Ironfoot',
      type: 'pc',
      summary: "A gruff dwarven forge cleric exiled from his clan for a crime he didn't commit. His faith in Moradin wavers in this godless land.",
      notes: '<h2>Character Overview</h2><p><strong>Player:</strong> Dave | <strong>Class:</strong> Cleric 9 (Forge Domain)</p><p>Stocky even for a dwarf, with a magnificent braided beard streaked with iron-gray.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Grimjaw&backgroundColor=1a1a24',
      position_x: 120,
      position_y: 420,
    },
    {
      campaign_id: campaignId,
      name: 'Zara Nightwhisper',
      type: 'pc',
      summary: 'A tiefling rogue with a dark sense of humor and darker past. She came to Barovia chasing a bounty and found herself becoming the hunted.',
      notes: '<h2>Character Overview</h2><p><strong>Player:</strong> Jess | <strong>Class:</strong> Rogue 9 (Arcane Trickster)</p><p>Deep crimson skin, small curved horns filed to points, and a long tail she uses expressively.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zara&backgroundColor=1a1a24',
      position_x: 460,
      position_y: 420,
    },
    {
      campaign_id: campaignId,
      name: 'Strahd von Zarovich',
      type: 'npc',
      summary: 'The immortal vampire lord of Barovia. Once a conquering prince, now a prisoner in his own domain.',
      notes: '<h2>The Devil of Barovia</h2><p><strong>Role:</strong> Main Antagonist | <strong>CR:</strong> 15</p><p>Tall and gaunt, with sharp features. He dresses impeccably in noble finery of archaic style.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Strahd&backgroundColor=1a1a24',
      position_x: 800,
      position_y: 100,
    },
    {
      campaign_id: campaignId,
      name: 'Ireena Kolyana',
      type: 'npc',
      summary: "The adopted daughter of the late Burgomaster. She is the latest reincarnation of Tatyana, Strahd's eternal obsession.",
      notes: '<h2>The Hunted</h2><p><strong>Role:</strong> Key NPC / Protected Figure</p><p>A striking young woman with auburn hair and bright green eyes. Two puncture scars mark her neck.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ireena&backgroundColor=1a1a24',
      position_x: 800,
      position_y: 420,
    },
    {
      campaign_id: campaignId,
      name: 'Madam Eva',
      type: 'npc',
      summary: 'The ancient leader of the Vistani at Tser Pool. Her Tarokka readings reveal glimpses of possible futures.',
      notes: '<h2>The Seer</h2><p><strong>Role:</strong> Oracle / Quest Giver</p><p>Ancient beyond counting, with skin like weathered parchment and eyes that hold centuries of secrets.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MadamEva&backgroundColor=1a1a24',
      position_x: 1140,
      position_y: 100,
    },
    {
      campaign_id: campaignId,
      name: "Ezmerelda d'Avenir",
      type: 'npc',
      summary: 'A Vistani monster hunter trained by the legendary Van Richten. She has dedicated her life to destroying Strahd.',
      notes: '<h2>The Monster Hunter</h2><p><strong>Role:</strong> Ally / Potential Party Member</p><p>A striking young Vistani woman with dark curly hair often kept under a wide-brimmed hat.</p>',
      image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ezmerelda&backgroundColor=1a1a24',
      position_x: 1140,
      position_y: 420,
    },
  ]

  const { data: createdChars, error: charError } = await supabase
    .from('characters')
    .insert(characters)
    .select()

  if (charError) {
    console.error('Failed to create characters:', charError)
    process.exit(1)
  }
  console.log(`   ✓ Created ${createdChars.length} characters`)

  // Create a map for easy lookup
  const charMap = new Map(createdChars.map(c => [c.name, c.id]))

  // 3. Create Tags
  console.log('\n🏷️  Creating tags...')
  const tags = [
    { campaign_id: campaignId, name: 'ally', color: '#22c55e', icon: 'ally' },
    { campaign_id: campaignId, name: 'enemy', color: '#ef4444', icon: 'enemy' },
    { campaign_id: campaignId, name: 'romantic', color: '#ec4899', icon: 'romantic' },
    { campaign_id: campaignId, name: 'rival', color: '#f59e0b', icon: 'rival' },
    { campaign_id: campaignId, name: 'family', color: '#8b5cf6', icon: 'family' },
    { campaign_id: campaignId, name: 'mentor', color: '#3b82f6', icon: 'mentor' },
    { campaign_id: campaignId, name: 'suspicious', color: '#6b7280', icon: 'suspicious' },
    { campaign_id: campaignId, name: 'quest', color: '#eab308', icon: 'quest' },
  ]

  const { data: createdTags, error: tagError } = await supabase
    .from('tags')
    .insert(tags)
    .select()

  if (tagError) {
    console.error('Failed to create tags:', tagError)
    process.exit(1)
  }
  console.log(`   ✓ Created ${createdTags.length} tags`)

  const tagMap = new Map(createdTags.map(t => [t.name, t.id]))

  // 4. Create Character Tags (relationships)
  console.log('\n🔗 Creating character relationships...')
  const characterTags = [
    // Theron's relationships
    { character_id: charMap.get('Ser Theron Brightheart'), tag_id: tagMap.get('ally'), related_character_id: charMap.get('Lyra Shadowmend') },
    { character_id: charMap.get('Ser Theron Brightheart'), tag_id: tagMap.get('ally'), related_character_id: charMap.get('Grimjaw Ironfoot') },
    { character_id: charMap.get('Ser Theron Brightheart'), tag_id: tagMap.get('romantic'), related_character_id: charMap.get('Ireena Kolyana') },
    { character_id: charMap.get('Ser Theron Brightheart'), tag_id: tagMap.get('enemy'), related_character_id: charMap.get('Strahd von Zarovich') },
    // Strahd's relationships
    { character_id: charMap.get('Strahd von Zarovich'), tag_id: tagMap.get('romantic'), related_character_id: charMap.get('Ireena Kolyana') },
    { character_id: charMap.get('Strahd von Zarovich'), tag_id: tagMap.get('rival'), related_character_id: charMap.get('Ser Theron Brightheart') },
    // Ireena's relationships
    { character_id: charMap.get('Ireena Kolyana'), tag_id: tagMap.get('enemy'), related_character_id: charMap.get('Strahd von Zarovich') },
    { character_id: charMap.get('Ireena Kolyana'), tag_id: tagMap.get('ally'), related_character_id: charMap.get('Ser Theron Brightheart') },
    // Ezmerelda
    { character_id: charMap.get("Ezmerelda d'Avenir"), tag_id: tagMap.get('enemy'), related_character_id: charMap.get('Strahd von Zarovich') },
    { character_id: charMap.get("Ezmerelda d'Avenir"), tag_id: tagMap.get('mentor'), related_character_id: null },
  ].filter(ct => ct.character_id && ct.tag_id) // Filter out any undefined

  const { error: ctError } = await supabase
    .from('character_tags')
    .insert(characterTags)

  if (ctError) {
    console.error('Failed to create character tags:', ctError)
  } else {
    console.log(`   ✓ Created ${characterTags.length} character relationships`)
  }

  // 5. Create Canvas Groups
  console.log('\n📦 Creating canvas groups...')
  const groups = [
    {
      campaign_id: campaignId,
      name: 'The Party',
      position_x: 50,
      position_y: 50,
      width: 750,
      height: 700,
      color: '#8B5CF6',
    },
    {
      campaign_id: campaignId,
      name: 'Key NPCs',
      position_x: 730,
      position_y: 50,
      width: 750,
      height: 700,
      color: '#D4A843',
    },
  ]

  const { error: groupError } = await supabase
    .from('canvas_groups')
    .insert(groups)

  if (groupError) {
    console.error('Failed to create groups:', groupError)
  } else {
    console.log(`   ✓ Created ${groups.length} canvas groups`)
  }

  // 6. Create Sessions
  console.log('\n📝 Creating sessions...')
  const sessions = [
    {
      campaign_id: campaignId,
      session_number: 1,
      title: 'Into the Mists',
      date: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: 'The party was mysteriously drawn through the mists into Barovia.',
      notes: '<h1>Session 1: Into the Mists</h1><p>The party was traveling when a sudden, unnatural fog rolled in...</p>',
    },
    {
      campaign_id: campaignId,
      session_number: 2,
      title: 'Death House',
      date: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: 'The party explored the infamous Death House, barely escaping with their lives.',
      notes: '<h1>Session 2: Death House</h1><p>On their way to the Burgomaster\'s mansion, the party encountered two ghostly children...</p>',
    },
    {
      campaign_id: campaignId,
      session_number: 3,
      title: "The Burgomaster's Funeral",
      date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: "The party met Ismark and Ireena, learned of Strahd's pursuit of Ireena.",
      notes: '<h1>Session 3: The Burgomaster\'s Funeral</h1><p>After escaping Death House, the party finally reached the Burgomaster\'s mansion...</p>',
    },
    {
      campaign_id: campaignId,
      session_number: 4,
      title: 'The Tarokka Reading',
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: 'Madam Eva revealed the locations of the artifacts needed to defeat Strahd.',
      notes: '<h1>Session 4: The Tarokka Reading</h1><p>On the road to Vallaki, the party stopped at the Vistani encampment...</p>',
    },
    {
      campaign_id: campaignId,
      session_number: 5,
      title: 'Dinner with the Devil',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: 'Strahd invited the party to Castle Ravenloft for dinner. They accepted.',
      notes: '<h1>Session 5: Dinner with the Devil</h1><p>A formal invitation arrived: Strahd requested the pleasure of the party\'s company...</p>',
    },
  ]

  const { error: sessionError } = await supabase
    .from('sessions')
    .insert(sessions)

  if (sessionError) {
    console.error('Failed to create sessions:', sessionError)
  } else {
    console.log(`   ✓ Created ${sessions.length} sessions`)
  }

  console.log('\n✅ Database seeded successfully!')
  console.log(`\n🎮 Visit your app and navigate to the "${campaign.name}" campaign to see your data.`)
}

seed().catch(console.error)
