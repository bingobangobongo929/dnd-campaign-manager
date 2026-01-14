/**
 * API Route: Import Allycan Campaign
 *
 * POST /api/import/allycan
 *
 * Creates the Allycan campaign with all characters, sessions, factions, and relationships
 * for the authenticated user.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Faction tags
const FACTION_TAGS = [
  { name: 'Allycan Academy', color: '#8B5CF6', category: 'faction' },
  { name: 'House Ha\'an-Vodusas', color: '#DC2626', category: 'faction' },
  { name: 'Ivory Reavers', color: '#F5F5DC', category: 'faction' },
  { name: 'Cappera Family', color: '#059669', category: 'faction' },
  { name: 'The Party', color: '#3B82F6', category: 'faction' },
  { name: 'Teachers', color: '#F59E0B', category: 'faction' },
  { name: 'Students', color: '#10B981', category: 'faction' },
]

// All character data (condensed from full script)
const CHARACTERS = [
  // Party
  { name: 'Esther', type: 'pc', race: 'Human', class: 'Warlock', status: 'alive', summary: 'A medium who can hear the voices of the dead, raised by violent raiders.', faction: 'The Party' },
  { name: 'Faust Blackwood', type: 'pc', race: 'Human', class: 'Doctor', status: 'alive', summary: 'The Revenant Doctor - family killed by assassins but spared by Jayce, raised by Darketh.', faction: 'The Party' },
  { name: 'Ilviana Gloam', type: 'pc', race: 'Unknown', class: 'Spy', status: 'alive', summary: 'Former spy for the Cappera family who died and came back, seeking answers at Allycan.', faction: 'The Party' },
  { name: 'Torik Allycan', type: 'pc', race: 'Half-Human/Half-Orc', class: 'Barbarian', status: 'alive', summary: 'Son of Gerold Allycan, nephew of the wealthy Roderick Allycan, can grow massive when raging.', faction: 'The Party' },
  { name: 'Wolfgang Runecarver', type: 'pc', race: 'Dwarf', class: 'Runecarver', status: 'alive', summary: 'A dwarven runecarver searching for Giants and his lost dwarven kin.', faction: 'The Party' },
  { name: 'Ravyn Ha\'an-Vodusas', type: 'pc', race: 'Dark High-Elf', class: 'Paladin', status: 'alive', summary: 'Last survivor of a tyrannical house that descended from Zariel, raised by the paladin who helped overthrow her family.', faction: 'The Party' },
  { name: 'Lynndis "Lynn" Grace', type: 'pc', race: 'Human', class: 'Unknown', status: 'alive', summary: 'Also known as Amelia Miriam O\'Malley, connected to the sea goddess Umberlee who took her heart.', faction: 'The Party' },
  // Teachers
  { name: 'Alistair "Cupcake" Killigan', type: 'npc', race: 'Goliath', role: 'Teacher - Physical/Fighting', status: 'alive', summary: 'Teaches physical fighting, absolutely loves cupcakes. Hard on the outside but a big softy.', faction: 'Teachers' },
  { name: 'Hannibal James', type: 'npc', race: 'Wendigo (disguised)', role: 'Teacher - Magic', status: 'alive', summary: 'Teaches magic. Is really a wendigo.', faction: 'Teachers', secrets: 'Is actually a wendigo.' },
  { name: 'Brea "Dean" Aman', type: 'npc', race: 'Unknown', role: 'Dean - Politics', status: 'alive', summary: 'The dean of the academy. Teaches politics. Goodhearted, was a Dark Warden before becoming the dean.', faction: 'Teachers' },
  { name: 'Leila Pence', type: 'npc', race: 'Unknown', role: 'Teacher - Necromancy', status: 'alive', summary: 'Teaches necromancy and anything beyond the living.', faction: 'Teachers' },
  { name: 'Nilas Finnick', type: 'npc', race: 'Unknown', role: 'Teacher - Potions', status: 'alive', summary: 'Teaches potions.', faction: 'Teachers' },
  // Students
  { name: 'Jayce Killigan', type: 'npc', race: 'Drow', class: 'Unknown', status: 'alive', summary: 'Son of Alistair. From the Ivory Reavers clan - was supposed to kill Faust but let him go.', faction: 'Students' },
  { name: 'Valerie Novak', type: 'npc', race: 'Vampire', class: 'Unknown', status: 'alive', summary: '2nd year vampire student. Made a deal with Mr. Allycan for her freedom from her enslaver.', faction: 'Students' },
  { name: 'Aelin Huxly', type: 'npc', race: 'Half Elf', class: 'Moon Druid', status: 'alive', summary: '3rd year Moon Druid. Her and her dad found refuge with Shadow Druids but left when they discovered their alliance.', faction: 'Students' },
  { name: 'L.R. Scooter Burlington II "NightMoose"', type: 'npc', race: 'Human', class: 'Ranger', status: 'alive', summary: '2nd year ranger from a rich family. Calls himself Night Moose. Goofy and nerdy but means well.', faction: 'Students' },
  { name: 'Kale Sthorm', type: 'npc', race: 'Unknown', class: 'Warlock', status: 'missing', summary: 'The quiet type, always seemed nervous. Would stare at blank space. First student to go missing.', faction: 'Students' },
  { name: 'Alice Acorn', type: 'npc', race: 'Elf', class: 'Sorcerer', status: 'missing', summary: 'Kind and intelligent elf sorcerer. Always took your side. Currently missing.', faction: 'Students' },
  { name: 'Peter Burlington', type: 'npc', race: 'Half-Goliath', class: 'Barbarian', status: 'alive', summary: '2nd year barbarian with a tragic past. Sold to circus as a child, eventually sold to the academy.', faction: 'Students' },
  // Key NPCs
  { name: 'Roderick Allycan', type: 'npc', race: 'Human', role: 'Academy Patron', status: 'alive', summary: 'Father figure. Richest and most influential man in the world. Owns most of Rovenia where he resides.', faction: 'Allycan Academy' },
  { name: 'Gerold Allycan', type: 'npc', race: 'Human', role: 'Noble (estranged)', status: 'alive', summary: 'Roderick\'s brother. Torik\'s father. Lives with a northern tribe.', faction: 'Allycan Academy' },
  { name: 'Darketh Rothwell', type: 'npc', race: 'Unknown', role: 'Doctor/Mentor', status: 'alive', summary: 'Uncle figure. Raised Faust as his own. Saved Ravyn\'s brother and never agreed with the Ha\'an-Vodusas family.' },
  { name: 'Mortissa Gloam', type: 'npc', race: 'Unknown', role: 'Drug Smuggler', status: 'alive', summary: 'Ilviana\'s father\'s sister. Develops drugs from corpses with her brother. Faust\'s nemesis.' },
  { name: 'Ki-Ev Cappera', type: 'npc', race: 'Unknown', role: 'Crime Boss', status: 'alive', summary: 'Head of Cappera family. Fishing empire is a cover for weapon smuggling.', faction: 'Cappera Family' },
  { name: 'Crystal', type: 'npc', race: 'Unknown', role: 'Ivory Reavers Leader', status: 'alive', summary: 'Co-leader of Ivory Reavers with Urza. Esther\'s adoptive mother.', faction: 'Ivory Reavers' },
  { name: 'Urza', type: 'npc', race: 'Unknown', role: 'Ivory Reavers Leader', status: 'alive', summary: 'Co-leader of Ivory Reavers with Crystal. Esther\'s adoptive father.', faction: 'Ivory Reavers' },
  { name: 'Umberlee', type: 'npc', race: 'Deity', role: 'Goddess of the Sea', status: 'alive', summary: 'Goddess of the sea. Took Lynn\'s heart so she could walk the earth. Jealous of Lynn\'s mother.' },
]

// Session titles
const SESSION_TITLES = [
  'Welcome to Allycan Academy', 'First Classes and Introductions', 'The Library\'s Secrets',
  'Night Moose\'s Grand Plan', 'Shadows in the Courtyard', 'Cupcake\'s Training',
  'The Missing Student', 'Investigating Kale\'s Disappearance', 'Into the Catacombs',
  'Dark Discoveries', 'The Wendigo\'s Hunger', 'Confronting Hannibal',
  'Alice Goes Missing', 'The Search Continues', 'Dream Pastries',
  'Mortissa\'s Trail', 'Family Secrets Revealed', 'The Ivory Reavers Strike',
  'Recognition', 'Jayce\'s Confession', 'Blood Bonds',
  'The Crown\'s Trail', 'Ravyn\'s Heritage', 'Journey to Egmont',
  'Brother Found', 'Wolfgang\'s Discovery', 'Giant Ruins',
  'The Iron Duke\'s Visit', 'Esther\'s Bargain', 'The Battle Begins',
]

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: 'Allycan Academy',
        game_system: 'D&D 5e',
        description: 'A dark fantasy campaign set in Allycan Academy, where students with troubled pasts learn magic and combat. Hidden secrets, missing students, and powerful enemies await.',
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // 2. Create faction tags
    const tagMap = new Map<string, string>()
    for (const tag of FACTION_TAGS) {
      const { data: tagData } = await supabase
        .from('tags')
        .insert({
          campaign_id: campaign.id,
          name: tag.name,
          color: tag.color,
          category: tag.category,
        })
        .select()
        .single()

      if (tagData) {
        tagMap.set(tag.name, tagData.id)
      }
    }

    // 3. Import characters
    const characterMap = new Map<string, string>()
    let posX = 100, posY = 100, col = 0
    const COLS = 6

    for (const char of CHARACTERS) {
      const { data: charData } = await supabase
        .from('characters')
        .insert({
          campaign_id: campaign.id,
          name: char.name,
          type: char.type,
          race: char.race || null,
          class: char.class || null,
          role: char.role || null,
          status: char.status || 'alive',
          summary: char.summary || null,
          secrets: char.secrets || null,
          position_x: posX,
          position_y: posY,
        })
        .select()
        .single()

      if (charData) {
        characterMap.set(char.name, charData.id)

        // Add faction tag
        const faction = char.faction
        if (faction && tagMap.has(faction)) {
          await supabase.from('character_tags').insert({
            character_id: charData.id,
            tag_id: tagMap.get(faction),
          })
        }
      }

      col++
      if (col >= COLS) {
        col = 0
        posX = 100
        posY += 250
      } else {
        posX += 220
      }
    }

    // 4. Create sessions (30 sessions starting March 2nd 2025)
    const startDate = new Date('2025-03-02')
    for (let i = 0; i < 30; i++) {
      const sessionDate = new Date(startDate)
      sessionDate.setDate(startDate.getDate() + (i * 7))
      if (i >= 5) sessionDate.setDate(sessionDate.getDate() + 7)
      if (i >= 12) sessionDate.setDate(sessionDate.getDate() + 7)
      if (i >= 20) sessionDate.setDate(sessionDate.getDate() + 14)

      await supabase.from('sessions').insert({
        campaign_id: campaign.id,
        session_number: i + 1,
        title: SESSION_TITLES[i],
        date: sessionDate.toISOString().split('T')[0],
        summary: `Session ${i + 1} of the Allycan campaign.`,
      })
    }

    // 5. Create canvas groups
    const groups = [
      { name: 'The Party', color: '#3B82F6', icon: 'users', x: 50, y: 50, width: 1400, height: 300 },
      { name: 'Teachers', color: '#F59E0B', icon: 'graduation-cap', x: 50, y: 400, width: 1200, height: 280 },
      { name: 'Students', color: '#10B981', icon: 'book-open', x: 50, y: 730, width: 1600, height: 280 },
      { name: 'Key NPCs', color: '#8B5CF6', icon: 'crown', x: 50, y: 1060, width: 1600, height: 280 },
    ]

    for (const group of groups) {
      await supabase.from('canvas_groups').insert({
        campaign_id: campaign.id,
        name: group.name,
        color: group.color,
        icon: group.icon,
        position_x: group.x,
        position_y: group.y,
        width: group.width,
        height: group.height,
      })
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      stats: {
        characters: CHARACTERS.length,
        sessions: 30,
        factions: FACTION_TAGS.length,
      },
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import campaign' },
      { status: 500 }
    )
  }
}
