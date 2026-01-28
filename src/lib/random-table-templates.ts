/**
 * Random Table Starter Templates
 * Pre-built tables with 1000+ entries per category
 *
 * This file re-exports from the modular random-tables directory
 * for backward compatibility.
 */

// Re-export everything from the new modular structure
export {
  // Types
  type TableTemplate,
  type TemplateCategory,

  // Main exports
  TEMPLATE_CATEGORIES,
  getTotalEntryCount,
  getAllTemplates,
  getTemplateById,
  getRandomEntry,

  // Individual arrays for direct access
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
} from './random-tables'
