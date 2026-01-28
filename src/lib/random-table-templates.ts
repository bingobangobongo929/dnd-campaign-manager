/**
 * Random Table Starter Templates
 * Pre-built tables with extensive name lists and useful content
 */

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

// =====================================================
// FANTASY NAMES - 500+ entries
// =====================================================

const HUMAN_MALE_NAMES = [
  'Aldric', 'Baldric', 'Cedric', 'Derrick', 'Edmund', 'Fredric', 'Godwin', 'Harold', 'Ivan', 'Jasper',
  'Kendrick', 'Leopold', 'Marcus', 'Nathaniel', 'Oswald', 'Percival', 'Quentin', 'Roland', 'Sebastian', 'Theodore',
  'Ulrich', 'Victor', 'Wilhelm', 'Xavier', 'Yorick', 'Zachary', 'Adrian', 'Bernard', 'Conrad', 'Dominic',
  'Everett', 'Felix', 'Gregory', 'Henry', 'Isaac', 'Julian', 'Kenneth', 'Lawrence', 'Maxwell', 'Nicholas',
  'Oliver', 'Patrick', 'Raymond', 'Samuel', 'Thomas', 'Vincent', 'Walter', 'Alexander', 'Benjamin', 'Charles',
  'Daniel', 'Edward', 'Francis', 'George', 'Harrison', 'James', 'Kevin', 'Leonard', 'Martin', 'Nathan',
  'Oscar', 'Peter', 'Richard', 'Stephen', 'Timothy', 'Vaughn', 'William', 'Andrew', 'Brian', 'Christopher',
  'David', 'Eric', 'Frank', 'Gerald', 'Howard', 'Jonathan', 'Kyle', 'Lewis', 'Michael', 'Neil',
  'Owen', 'Paul', 'Randall', 'Scott', 'Travis', 'Vernon', 'Wayne', 'Albert', 'Barry', 'Calvin',
  'Dennis', 'Eugene', 'Floyd', 'Gordon', 'Hugh', 'Jack', 'Keith', 'Lloyd', 'Morris', 'Norman',
  // Adding more variety
  'Alaric', 'Brandis', 'Corwin', 'Darius', 'Eldric', 'Fendrel', 'Gareth', 'Hadrian', 'Isen', 'Jareth',
  'Kaden', 'Lysander', 'Magnus', 'Nolan', 'Orion', 'Phelan', 'Quinn', 'Ronan', 'Sterling', 'Tristan',
  'Uther', 'Valdric', 'Wren', 'Xander', 'York', 'Zephyr', 'Ashford', 'Beckett', 'Callum', 'Drake',
  'Emeric', 'Flynn', 'Griffin', 'Hayes', 'Ingram', 'Jensen', 'Kane', 'Lachlan', 'Merrick', 'Nash',
]

const HUMAN_FEMALE_NAMES = [
  'Adelaide', 'Beatrice', 'Catherine', 'Diana', 'Eleanor', 'Fiona', 'Gwendolyn', 'Helena', 'Isabelle', 'Josephine',
  'Katherine', 'Lydia', 'Margaret', 'Natalie', 'Ophelia', 'Penelope', 'Quintessa', 'Rosalind', 'Sophia', 'Theodora',
  'Ursula', 'Victoria', 'Winifred', 'Xenia', 'Yvonne', 'Zelda', 'Amelia', 'Bridget', 'Cordelia', 'Dorothea',
  'Emmeline', 'Florence', 'Genevieve', 'Harriet', 'Imogen', 'Juliet', 'Katrina', 'Lillian', 'Miriam', 'Nora',
  'Octavia', 'Priscilla', 'Rowena', 'Sabrina', 'Tabitha', 'Vivienne', 'Willa', 'Aurora', 'Briana', 'Celeste',
  'Daphne', 'Elena', 'Freya', 'Gloria', 'Hannah', 'Iris', 'Jasmine', 'Kira', 'Luna', 'Maya',
  'Nina', 'Olivia', 'Petra', 'Rachel', 'Sarah', 'Tessa', 'Vera', 'Willow', 'Aria', 'Bianca',
  'Clara', 'Dahlia', 'Eva', 'Faith', 'Grace', 'Hope', 'Ivy', 'Joy', 'Lily', 'Mira',
  'Nadia', 'Opal', 'Pearl', 'Ruby', 'Stella', 'Terra', 'Violet', 'Alina', 'Brynn', 'Cora',
  'Elara', 'Gemma', 'Hazel', 'Isla', 'Jade', 'Kyla', 'Lena', 'Mila', 'Nova', 'Piper',
  // Adding more variety
  'Alarice', 'Branwen', 'Coraline', 'Delphine', 'Elspeth', 'Fern', 'Giselle', 'Hollis', 'Isolde', 'Juniper',
  'Kestrel', 'Lorelei', 'Meadow', 'Nimue', 'Ondine', 'Phaedra', 'Quincy', 'Rhiannon', 'Seraphina', 'Tamsin',
  'Una', 'Vesper', 'Winona', 'Xiomara', 'Yseult', 'Zinnia', 'Astrid', 'Brielle', 'Cassandra', 'Deirdre',
]

const ELF_NAMES = [
  'Aelindor', 'Caelynn', 'Erevan', 'Faelar', 'Galinndan', 'Hadarai', 'Immeral', 'Laucian', 'Mindartis', 'Nelaeryn',
  'Paelias', 'Quarion', 'Riardon', 'Soveliss', 'Tharivol', 'Valanthe', 'Adran', 'Berrian', 'Carric', 'Dayereth',
  'Enialis', 'Fivin', 'Gennal', 'Heian', 'Ivelios', 'Korfel', 'Lamlis', 'Mialee', 'Naivara', 'Olaurae',
  'Peren', 'Quelenna', 'Rolim', 'Sariel', 'Thia', 'Ulara', 'Valeris', 'Windra', 'Xanaphia', 'Yalanue',
  'Zephira', 'Althaea', 'Birel', 'Celaena', 'Darain', 'Enna', 'Felosial', 'Gaelira', 'Halara', 'Ivellios',
  'Jelenneth', 'Keyleth', 'Liadon', 'Meriele', 'Naeris', 'Ondine', 'Prestin', 'Quellia', 'Ravenia', 'Sylas',
  'Thamior', 'Urimenor', 'Virelith', 'Wendelith', 'Yasheria', 'Arannis', 'Baeris', 'Cymbiir', 'Daeris', 'Eladrin',
  'Faelyn', 'Galadel', 'Halamar', 'Ilyana', 'Jhaeros', 'Kerym', 'Lorelei', 'Maiele', 'Naesala', 'Orophin',
  // More elven names
  'Aelith', 'Belinar', 'Caerwyn', 'Daelynn', 'Elowen', 'Finarel', 'Galadhon', 'Heledir', 'Istaria', 'Jhaelynna',
  'Khelben', 'Laeroth', 'Mirthal', 'Neshka', 'Orenlas', 'Pharaun', 'Quelaag', 'Rillifane', 'Sehanine', 'Tarathiel',
]

const DWARF_NAMES = [
  'Adrik', 'Baern', 'Brottor', 'Dain', 'Darrak', 'Delg', 'Eberk', 'Einkil', 'Fargrim', 'Gardain',
  'Harbek', 'Kildrak', 'Morgran', 'Orsik', 'Rangrim', 'Rurik', 'Taklinn', 'Thoradin', 'Thorin', 'Tordek',
  'Traubon', 'Ulfgar', 'Veit', 'Vondal', 'Amber', 'Artin', 'Audhild', 'Bardryn', 'Dagnal', 'Diesa',
  'Eldeth', 'Gunnloda', 'Gurdis', 'Helja', 'Hlin', 'Kathra', 'Kristryd', 'Ilde', 'Liftrasa', 'Mardred',
  'Riswynn', 'Sannl', 'Torbera', 'Torgga', 'Vistra', 'Bruenor', 'Durin', 'Gimli', 'Balin', 'Dwalin',
  'Gloin', 'Oin', 'Bifur', 'Bofur', 'Bombur', 'Fili', 'Kili', 'Nori', 'Dori', 'Ori',
  'Thrain', 'Thror', 'Nain', 'Dain', 'Fundin', 'Gror', 'Frar', 'Grim', 'Floi', 'Loni',
  'Balderk', 'Battlehammer', 'Brawnanvil', 'Dankil', 'Fireforge', 'Frostbeard', 'Gorunn', 'Holderhek', 'Ironfist', 'Loderr',
  'Lutgehr', 'Rumnaheim', 'Strakeln', 'Torunn', 'Ungart', 'Bronzebeard', 'Copperpot', 'Deepdelver', 'Goldvein', 'Hammerfall',
  'Ironfoot', 'Mithrilhelm', 'Orebender', 'Steelshaper', 'Thunderaxe', 'Anvil', 'Barrel', 'Forge', 'Stone', 'Vault',
]

const HALFLING_NAMES = [
  'Alton', 'Ander', 'Cade', 'Corrin', 'Eldon', 'Errich', 'Finnan', 'Garret', 'Lindal', 'Lyle',
  'Merric', 'Milo', 'Osborn', 'Perrin', 'Reed', 'Roscoe', 'Wellby', 'Andry', 'Bree', 'Callie',
  'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia',
  'Seraphina', 'Shaena', 'Trym', 'Vani', 'Verna', 'Bilbo', 'Frodo', 'Samwise', 'Pippin', 'Merry',
  'Rosie', 'Primula', 'Drogo', 'Bungo', 'Belladonna', 'Hamfast', 'Holman', 'Largo', 'Balbo', 'Bingo',
  'Polo', 'Posco', 'Prisca', 'Ruby', 'Saradoc', 'Esmeralda', 'Paladin', 'Eglantine', 'Pearl', 'Pimpernel',
  'Pervinca', 'Fatty', 'Folco', 'Fredegar', 'Lobelia', 'Lotho', 'Otho', 'Sancho', 'Tolman', 'Wilcome',
  // More halfling names
  'Bramwell', 'Clover', 'Dandelion', 'Ember', 'Fern', 'Gorse', 'Heather', 'Ivy', 'Jasper', 'Kernel',
  'Lavender', 'Marigold', 'Nettle', 'Olive', 'Pepper', 'Quill', 'Rhubarb', 'Sage', 'Thyme', 'Yarrow',
]

const ORC_GOBLIN_NAMES = [
  'Gorbag', 'Shagrat', 'Grishnakh', 'Ugluk', 'Azog', 'Bolg', 'Gothmog', 'Muzgash', 'Radbug', 'Snaga',
  'Gashnak', 'Burzum', 'Lagduf', 'Ufthak', 'Mauhur', 'Thrak', 'Dushgoi', 'Lugbag', 'Golfimbul', 'Narzug',
  'Gorzan', 'Krusk', 'Muzgak', 'Dench', 'Feng', 'Henk', 'Holg', 'Imsh', 'Kramp', 'Mogu',
  'Ront', 'Shump', 'Thokk', 'Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak',
  'Ownka', 'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda', 'Gruk', 'Skrag', 'Zog', 'Murg',
  'Narg', 'Grok', 'Thug', 'Krag', 'Zug', 'Blarg', 'Snik', 'Grak', 'Brug', 'Drak',
  'Glark', 'Klarg', 'Grol', 'Yeemik', 'Lhupo', 'Ripper', 'Boss', 'Chief', 'Warchief', 'Overlord',
  'Grimskull', 'Bloodaxe', 'Bonecruncher', 'Deathbringer', 'Fleshripper', 'Goreblade', 'Hellscream', 'Ironjaw', 'Skullcrusher', 'Warbringer',
]

const TIEFLING_NAMES = [
  'Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis', 'Melech', 'Mordai',
  'Morthos', 'Pelaios', 'Skamos', 'Therai', 'Akta', 'Anakis', 'Bryseis', 'Criella', 'Damaia', 'Ea',
  'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Rieta', 'Art', 'Carrion', 'Chant',
  'Creed', 'Despair', 'Excellence', 'Fear', 'Glory', 'Hope', 'Ideal', 'Music', 'Nowhere', 'Open',
  'Poetry', 'Quest', 'Random', 'Reverence', 'Sorrow', 'Torment', 'Weary', 'Ash', 'Blight', 'Cinder',
  'Dusk', 'Ember', 'Flame', 'Gloom', 'Haze', 'Ink', 'Jet', 'Kindle', 'Lament', 'Mist',
  'Night', 'Obsidian', 'Pyre', 'Raven', 'Shadow', 'Thorn', 'Umbra', 'Vex', 'Woe', 'Zephyr',
  'Malice', 'Spite', 'Venom', 'Hex', 'Curse', 'Bane', 'Doom', 'Dread', 'Havoc', 'Ruin',
]

// =====================================================
// TAVERN/INN NAMES - 100+ entries
// =====================================================

const TAVERN_NAMES = [
  'The Rusty Nail', 'The Gilded Goose', 'The Broken Barrel', 'The Prancing Pony', 'The Green Dragon',
  'The Dancing Mare', 'The Silver Stag', 'The Golden Griffin', 'The Copper Kettle', 'The Iron Flask',
  'The Laughing Bard', 'The Weary Traveler', 'The Drunken Dragon', 'The Salty Sailor', 'The Blind Basilisk',
  'The Tipsy Troll', 'The Merry Mermaid', 'The Howling Wolf', 'The Sleeping Giant', 'The Wandering Wizard',
  'The Noble Knight', 'The Crafty Crow', 'The Burning Brand', 'The Frozen Flame', 'The Silent Storm',
  'The Crimson Crown', 'The Azure Anchor', 'The Emerald Eagle', 'The Obsidian Owl', 'The Jade Jester',
  'The Ruby Rose', 'The Sapphire Swan', 'The Topaz Tiger', 'The Amber Antler', 'The Ivory Imp',
  'The Oaken Oak', 'The Stony Steed', 'The Feathered Flagon', 'The Bearded Barrel', 'The Foaming Mug',
  'The Hearty Hog', 'The Lusty Leopard', 'The Mirthful Maiden', 'The Pious Pilgrim', 'The Rustic Rooster',
  'The Thirsty Thespian', 'The Winking Wench', 'The Yawning Portal', 'The Leaky Cauldron', 'The Hogshead',
  'The Crossroads Inn', 'The Wayside Rest', 'The Milestone Tavern', 'The Bridge End', 'The Market Square',
  'The Dockside Den', 'The Harbor Haven', 'The Riverside Retreat', 'The Cliffside Comfort', 'The Valley View',
  'The Mountain Mug', 'The Forest Flagon', 'The Desert Oasis', 'The Swamp Shack', 'The Tundra Tap',
  'The Dungeon Dive', 'The Dragon\'s Den', 'The Goblin\'s Grog', 'The Orc\'s Armpit', 'The Troll\'s Toll',
  'The Witch\'s Brew', 'The Wizard\'s Staff', 'The Cleric\'s Cup', 'The Rogue\'s Reward', 'The Fighter\'s Fist',
  'The Paladin\'s Pledge', 'The Ranger\'s Rest', 'The Barbarian\'s Brawl', 'The Monk\'s Meditation', 'The Druid\'s Grove',
  'The Bard\'s Ballad', 'The Warlock\'s Wager', 'The Sorcerer\'s Spark', 'The Artificer\'s Anvil', 'The Blood Hunter\'s Blade',
  'The Elven Embassy', 'The Dwarven Depths', 'The Halfling Hearth', 'The Orcish Outpost', 'The Gnomish Gadget',
  'The Tiefling\'s Tale', 'The Dragonborn\'s Domain', 'The Goliath\'s Grasp', 'The Kenku\'s Call', 'The Tabaxi\'s Trail',
]

// =====================================================
// RANDOM ENCOUNTER ELEMENTS
// =====================================================

const WEATHER_CONDITIONS = [
  'Clear skies with gentle breeze', 'Overcast with threatening clouds', 'Light drizzle beginning',
  'Heavy rain and wind', 'Thick fog limiting visibility', 'Snow flurries starting',
  'Blizzard conditions', 'Thunderstorm approaching', 'Unseasonably warm', 'Bitter cold snap',
  'Heatwave with scorching sun', 'Dust storm brewing', 'Rainbow after light rain',
  'Eclipse darkening the sky', 'Aurora lights dancing overhead', 'Meteor shower visible',
  'Sudden temperature drop', 'Hail beginning to fall', 'Mist rising from the ground',
  'Perfect traveling weather', 'Oppressively humid', 'Dry and windy', 'Calm before the storm',
  'Partly cloudy', 'Sunset casting long shadows', 'Dawn breaking', 'Full moon night',
  'New moon - very dark', 'Stars unusually bright', 'Strange colored sky',
]

const ROAD_ENCOUNTERS = [
  'Merchant caravan seeking protection', 'Band of pilgrims on a holy journey', 'Patrol of local guards',
  'Wandering minstrel offering news', 'Lost child looking for parents', 'Injured traveler needing aid',
  'Suspicious hooded figures', 'Noble\'s coach broken down', 'Funeral procession passing by',
  'Wedding party celebrating', 'Refugees fleeing danger', 'Tax collectors demanding payment',
  'Bounty hunters tracking a mark', 'Circus troupe on tour', 'Monks in silent meditation',
  'Dueling nobles at dawn', 'Escaped prisoner seeking help', 'Fortune teller offering readings',
  'Snake oil salesman with wares', 'Retired adventurer sharing tales', 'Hermit with a warning',
  'Lost livestock blocking the road', 'Overturned cart with scattered goods', 'Bridge toll demanded',
  'Checkpoint searching travelers', 'Roadside shrine with offering bowl', 'Corpse hanging from a tree',
  'Fresh graves by the roadside', 'Campfire smoke in the distance', 'Tracks of a large creature',
  'Distant screams or battle sounds', 'Unusual flora growing nearby', 'Ancient milestone with inscription',
  'Crossroads with no signs', 'Fork in the road with decision', 'Washed out bridge section',
]

const DUNGEON_FEATURES = [
  'Collapsed ceiling blocking path', 'Flooded corridor waist-deep', 'Pit trap with spikes',
  'Pressure plate mechanism', 'Swinging blade trap', 'Poisoned needle lock',
  'Illusory wall concealing passage', 'Mimic disguised as chest', 'Gelatinous cube filling corridor',
  'Ancient skeleton still in armor', 'Glowing mushrooms providing light', 'Underground stream cutting across',
  'Abandoned campsite with remains', 'Scratched tally marks on wall', 'Warning carved in stone',
  'Magical darkness spell lingering', 'Anti-magic zone detected', 'Wild magic surge area',
  'Echo chamber amplifying sounds', 'Whispering walls with secrets', 'Portraits with watching eyes',
  'Shifting walls changing layout', 'Elevating platform mechanism', 'Rotating room puzzle',
  'Mirror that shows different reality', 'Altar with recent blood offerings', 'Empty pedestals with dust circles',
  'Cage with mysterious bones', 'Torture chamber with rusty tools', 'Library with forbidden tomes',
]

const LOOT_DESCRIPTORS = [
  'Slightly tarnished but valuable', 'Clearly ancient and ornate', 'Of unusual foreign design',
  'Magical aura visible', 'Cursed - radiates wrongness', 'Blessed by a deity',
  'Made from unusual material', 'Bearing noble family crest', 'Inscribed with arcane runes',
  'Set with precious gemstones', 'Finely crafted by masters', 'Crude but effective',
  'Obviously stolen goods', 'Wedding gift never delivered', 'War trophy with history',
  'Collector\'s rare piece', 'Counterfeited poorly', 'Authentic historical artifact',
  'Newly forged and gleaming', 'Well-worn but maintained', 'Neglected and damaged',
  'Sentient and communicating', 'Indestructible it seems', 'Fragile - handle carefully',
  'Transforming when touched', 'Growing or shrinking', 'Invisble until held',
  'Only works for specific person', 'Requires attunement ritual', 'One use only',
]

// =====================================================
// RUMORS AND PLOT HOOKS
// =====================================================

const RUMORS = [
  'They say the old mill is haunted by its former owner',
  'The mayor has been acting strange since returning from the capital',
  'Children have been disappearing from the eastern farms',
  'A dragon was spotted flying over the mountains last week',
  'The new temple priest is actually a cultist in disguise',
  'There\'s treasure hidden in the abandoned mine shaft',
  'The blacksmith forges weapons for the resistance at night',
  'Werewolves have been seen in the forest on full moons',
  'The king is secretly ill and his advisors rule in his stead',
  'A secret society meets in the tavern basement monthly',
  'The harvest will fail unless the old rituals are performed',
  'Sailors speak of a ghost ship appearing in the fog',
  'The merchant guild is smuggling forbidden goods',
  'An entrance to the Underdark lies beneath the cemetery',
  'The local wizard is conducting forbidden experiments',
  'Bandits are being organized by a mysterious masked figure',
  'The well water has healing properties on certain nights',
  'A powerful artifact was recently unearthed nearby',
  'The noble\'s son was replaced by a changeling at birth',
  'War is coming from the east within the year',
  'The bard knows the true location of the lost prince',
  'Ancient burial grounds were disturbed by construction',
  'The innkeeper poisoned his brother for the inheritance',
  'Fey creatures have been seen dancing in the meadow',
  'The old prophecy is about to come true',
  'Someone has been leaving offerings at the standing stones',
  'The guard captain takes bribes to ignore certain crimes',
  'A portal to another realm opens at midnight on the solstice',
  'The herbalist sells more than just medicine',
  'Giants have been seen marching along the mountain ridge',
]

// =====================================================
// BUILD TEMPLATE CATEGORIES
// =====================================================

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
    ],
  },
  {
    id: 'encounters',
    name: 'Encounters',
    description: 'Random events and encounters',
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
    ],
  },
  {
    id: 'atmosphere',
    name: 'Atmosphere',
    description: 'Weather, rumors, and world details',
    icon: 'Cloud',
    templates: [
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
        id: 'rumors',
        name: 'Tavern Rumors',
        description: 'Plot hooks and rumors heard in taverns',
        category: 'rumor',
        roll_type: 'custom',
        custom_die_size: RUMORS.length,
        entries: RUMORS,
        tags: ['rumor', 'plot', 'hook'],
      },
    ],
  },
  {
    id: 'loot',
    name: 'Loot',
    description: 'Treasure descriptors and item details',
    icon: 'Gem',
    templates: [
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
