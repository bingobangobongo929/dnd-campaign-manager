/**
 * Random Tables Index - Combines all 1000+ entry tables
 */

import { HUMAN_MALE_NAMES, HUMAN_FEMALE_NAMES } from './names-human'
import { ELF_NAMES, DWARF_NAMES, HALFLING_NAMES, ORC_GOBLIN_NAMES, TIEFLING_NAMES } from './names-fantasy'
import { TAVERN_NAMES, SHOP_NAMES, CITY_NAMES, VILLAGE_NAMES, WILDERNESS_LANDMARKS } from './locations'
import { WEATHER_CONDITIONS, ROAD_ENCOUNTERS, DUNGEON_FEATURES, LOOT_DESCRIPTORS } from './encounters'
import { NPC_TRAITS, NPC_MOTIVATIONS } from './npcs'
import { RUMORS, QUEST_HOOKS, COMPLICATIONS, STREET_NAMES } from './plots'

import type { RandomTableCategory, RandomTableDieType } from '@/types/database'

export interface TableTemplate {
  id: string
  name: string
  description: string
  category: RandomTableCategory
  roll_type: RandomTableDieType
  custom_die_size?: number
  entries: string[]
  tags: string[]
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: string
  templates: TableTemplate[]
}

// Export all individual arrays for direct access
export {
  HUMAN_MALE_NAMES,
  HUMAN_FEMALE_NAMES,
  ELF_NAMES,
  DWARF_NAMES,
  HALFLING_NAMES,
  ORC_GOBLIN_NAMES,
  TIEFLING_NAMES,
  TAVERN_NAMES,
  SHOP_NAMES,
  CITY_NAMES,
  VILLAGE_NAMES,
  WILDERNESS_LANDMARKS,
  WEATHER_CONDITIONS,
  ROAD_ENCOUNTERS,
  DUNGEON_FEATURES,
  LOOT_DESCRIPTORS,
  NPC_TRAITS,
  NPC_MOTIVATIONS,
  RUMORS,
  QUEST_HOOKS,
  COMPLICATIONS,
  STREET_NAMES,
}

// Build template categories with all 1000+ entry tables
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'names',
    name: 'Names',
    description: 'Fantasy names for NPCs, places, and more',
    icon: 'Users',
    templates: [
      {
        id: 'human-male-names',
        name: 'Human Male Names',
        description: 'Common male names for human NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: HUMAN_MALE_NAMES.length,
        entries: HUMAN_MALE_NAMES,
        tags: ['human', 'male', 'npc'],
      },
      {
        id: 'human-female-names',
        name: 'Human Female Names',
        description: 'Common female names for human NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: HUMAN_FEMALE_NAMES.length,
        entries: HUMAN_FEMALE_NAMES,
        tags: ['human', 'female', 'npc'],
      },
      {
        id: 'elf-names',
        name: 'Elven Names',
        description: 'Names for elven NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: ELF_NAMES.length,
        entries: ELF_NAMES,
        tags: ['elf', 'npc'],
      },
      {
        id: 'dwarf-names',
        name: 'Dwarven Names',
        description: 'Names for dwarven NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: DWARF_NAMES.length,
        entries: DWARF_NAMES,
        tags: ['dwarf', 'npc'],
      },
      {
        id: 'halfling-names',
        name: 'Halfling Names',
        description: 'Names for halfling NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: HALFLING_NAMES.length,
        entries: HALFLING_NAMES,
        tags: ['halfling', 'npc'],
      },
      {
        id: 'orc-goblin-names',
        name: 'Orc & Goblin Names',
        description: 'Names for orc and goblin NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: ORC_GOBLIN_NAMES.length,
        entries: ORC_GOBLIN_NAMES,
        tags: ['orc', 'goblin', 'npc', 'monster'],
      },
      {
        id: 'tiefling-names',
        name: 'Tiefling Names',
        description: 'Names and virtue names for tiefling NPCs',
        category: 'name',
        roll_type: 'custom',
        custom_die_size: TIEFLING_NAMES.length,
        entries: TIEFLING_NAMES,
        tags: ['tiefling', 'npc'],
      },
    ],
  },
  {
    id: 'locations',
    name: 'Locations',
    description: 'Names for taverns, shops, cities, and landmarks',
    icon: 'MapPin',
    templates: [
      {
        id: 'tavern-names',
        name: 'Tavern & Inn Names',
        description: 'Names for taverns, inns, and pubs',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: TAVERN_NAMES.length,
        entries: TAVERN_NAMES,
        tags: ['tavern', 'inn', 'location'],
      },
      {
        id: 'shop-names',
        name: 'Shop Names',
        description: 'Names for various shops and businesses',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: SHOP_NAMES.length,
        entries: SHOP_NAMES,
        tags: ['shop', 'business', 'location'],
      },
      {
        id: 'city-names',
        name: 'City & Town Names',
        description: 'Names for cities, towns, and large settlements',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: CITY_NAMES.length,
        entries: CITY_NAMES,
        tags: ['city', 'town', 'location'],
      },
      {
        id: 'village-names',
        name: 'Village Names',
        description: 'Names for villages and small settlements',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: VILLAGE_NAMES.length,
        entries: VILLAGE_NAMES,
        tags: ['village', 'hamlet', 'location'],
      },
      {
        id: 'wilderness-landmarks',
        name: 'Wilderness Landmarks',
        description: 'Notable features in the wilderness',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: WILDERNESS_LANDMARKS.length,
        entries: WILDERNESS_LANDMARKS,
        tags: ['wilderness', 'landmark', 'location'],
      },
      {
        id: 'street-names',
        name: 'Street Names',
        description: 'Names for streets, roads, and alleys',
        category: 'location',
        roll_type: 'custom',
        custom_die_size: STREET_NAMES.length,
        entries: STREET_NAMES,
        tags: ['street', 'road', 'location'],
      },
    ],
  },
  {
    id: 'encounters',
    name: 'Encounters',
    description: 'Random events and environmental details',
    icon: 'Swords',
    templates: [
      {
        id: 'road-encounters',
        name: 'Road Encounters',
        description: 'Random events while traveling on roads',
        category: 'encounter',
        roll_type: 'custom',
        custom_die_size: ROAD_ENCOUNTERS.length,
        entries: ROAD_ENCOUNTERS,
        tags: ['travel', 'road', 'encounter'],
      },
      {
        id: 'dungeon-features',
        name: 'Dungeon Features',
        description: 'Environmental features and hazards in dungeons',
        category: 'encounter',
        roll_type: 'custom',
        custom_die_size: DUNGEON_FEATURES.length,
        entries: DUNGEON_FEATURES,
        tags: ['dungeon', 'hazard', 'feature'],
      },
      {
        id: 'weather-conditions',
        name: 'Weather Conditions',
        description: 'Weather and atmospheric conditions',
        category: 'weather',
        roll_type: 'custom',
        custom_die_size: WEATHER_CONDITIONS.length,
        entries: WEATHER_CONDITIONS,
        tags: ['weather', 'atmosphere'],
      },
      {
        id: 'loot-descriptors',
        name: 'Loot Descriptors',
        description: 'Descriptive qualities for found treasure',
        category: 'loot',
        roll_type: 'custom',
        custom_die_size: LOOT_DESCRIPTORS.length,
        entries: LOOT_DESCRIPTORS,
        tags: ['loot', 'treasure', 'description'],
      },
    ],
  },
  {
    id: 'npcs',
    name: 'NPC Details',
    description: 'Personality traits, quirks, and motivations',
    icon: 'User',
    templates: [
      {
        id: 'npc-traits',
        name: 'NPC Personality Traits',
        description: 'Quirks, mannerisms, and personality aspects',
        category: 'npc',
        roll_type: 'custom',
        custom_die_size: NPC_TRAITS.length,
        entries: NPC_TRAITS,
        tags: ['npc', 'personality', 'trait'],
      },
      {
        id: 'npc-motivations',
        name: 'NPC Motivations',
        description: 'What drives NPCs - their goals and desires',
        category: 'npc',
        roll_type: 'custom',
        custom_die_size: NPC_MOTIVATIONS.length,
        entries: NPC_MOTIVATIONS,
        tags: ['npc', 'motivation', 'goal'],
      },
    ],
  },
  {
    id: 'plots',
    name: 'Plot & Story',
    description: 'Rumors, quest hooks, and story complications',
    icon: 'BookOpen',
    templates: [
      {
        id: 'rumors',
        name: 'Tavern Rumors',
        description: 'Plot hooks and rumors heard in taverns',
        category: 'rumor',
        roll_type: 'custom',
        custom_die_size: RUMORS.length,
        entries: RUMORS,
        tags: ['rumor', 'plot', 'hook'],
      },
      {
        id: 'quest-hooks',
        name: 'Quest Hooks',
        description: 'Adventure starters and quest beginnings',
        category: 'general',
        roll_type: 'custom',
        custom_die_size: QUEST_HOOKS.length,
        entries: QUEST_HOOKS,
        tags: ['quest', 'adventure', 'hook'],
      },
      {
        id: 'complications',
        name: 'Complications',
        description: 'Things that go wrong during quests',
        category: 'complication',
        roll_type: 'custom',
        custom_die_size: COMPLICATIONS.length,
        entries: COMPLICATIONS,
        tags: ['complication', 'twist', 'obstacle'],
      },
    ],
  },
]

// Helper function to get total entry count
export function getTotalEntryCount(): number {
  return TEMPLATE_CATEGORIES.reduce((total, cat) =>
    total + cat.templates.reduce((catTotal, template) =>
      catTotal + template.entries.length, 0
    ), 0
  )
}

// Helper function to get all templates flat
export function getAllTemplates(): TableTemplate[] {
  return TEMPLATE_CATEGORIES.flatMap(cat => cat.templates)
}

// Helper function to get template by ID
export function getTemplateById(id: string): TableTemplate | undefined {
  return getAllTemplates().find(t => t.id === id)
}

// Helper function to get random entry from template
export function getRandomEntry(templateId: string): string | undefined {
  const template = getTemplateById(templateId)
  if (!template || template.entries.length === 0) return undefined
  return template.entries[Math.floor(Math.random() * template.entries.length)]
}
