/**
 * Allycan Campaign Import Script
 *
 * Run with: npx ts-node scripts/import-allycan.ts
 *
 * This script imports the Allycan D&D campaign data including:
 * - All PCs (7 party members)
 * - All Teachers (5)
 * - All Students (6)
 * - Key NPCs (7+)
 * - Faction tags
 * - Character relationships
 * - ~30 session notes (starting March 2nd, 2025)
 */

import { createClient } from '@supabase/supabase-js'

// Configuration - update these values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID = process.env.IMPORT_USER_ID! // The user who will own this campaign

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ============================================================================
// FACTION TAGS
// ============================================================================
const FACTION_TAGS = [
  { name: 'Allycan Academy', color: '#8B5CF6', category: 'faction' as const },
  { name: 'House Ha\'an-Vodusas', color: '#DC2626', category: 'faction' as const },
  { name: 'Ivory Reavers', color: '#F5F5DC', category: 'faction' as const },
  { name: 'Cappera Family', color: '#059669', category: 'faction' as const },
  { name: 'The Party', color: '#3B82F6', category: 'faction' as const },
  { name: 'Teachers', color: '#F59E0B', category: 'faction' as const },
  { name: 'Students', color: '#10B981', category: 'faction' as const },
]

// ============================================================================
// PARTY CHARACTERS (PCs)
// ============================================================================
const PARTY_CHARACTERS = [
  {
    name: 'Esther',
    type: 'pc' as const,
    race: 'Human',
    class: 'Warlock',
    status: 'alive',
    summary: 'A medium who can hear the voices of the dead, raised by violent raiders.',
    backstory: `Mom Lilith, warlock, dead. Mom made a deal with the devil (Iron Duke) in order to keep their village safe, even though it ends in plague death, she begged for him to spare her daughter who now "belongs to him".

Violent raider adoptive parents Crystal and Urza, ran away from them when she got older. Jayce Killigan is from the same group of raiders (they wear masks of ivory and gold, using strange curved sickles as weapons). He will recognize her but she'll probably never have noticed him.

She's a medium and can hear the voices of the dead.`,
    personality: 'Haunted by the voices of the dead, cautious about her devil connection.',
    secrets: 'She will have a run-in with Dispater/Iron Duke before lvl 10, where he shows off some of his power. She "belongs" to him through her mother\'s deal.',
    important_people: [
      { name: 'Lilith', relationship: 'Mother (deceased)', notes: 'Made deal with Iron Duke' },
      { name: 'Crystal', relationship: 'Adoptive Mother', notes: 'Ivory Reavers clan leader' },
      { name: 'Urza', relationship: 'Adoptive Father', notes: 'Ivory Reavers clan leader' },
      { name: 'Dispater/Iron Duke', relationship: 'Devil patron', notes: 'She belongs to him through her mother\'s deal' },
    ],
    story_hooks: [
      { hook: 'Confrontation with the Iron Duke', notes: 'Will happen before level 10' },
      { hook: 'Recognition by Jayce', notes: 'He\'s from the same raider group' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Faust Blackwood',
    type: 'pc' as const,
    race: 'Human',
    class: 'Unknown',
    status: 'alive',
    summary: 'The Revenant Doctor - family killed by assassins but spared by Jayce, raised by Darketh.',
    backstory: `Family killed by "assassins" but he was spared. He was spared by Jayce who was a few years older than him at the time. Jayce cut himself to put blood on his blade to pretend he had killed Faust.

Darketh is an old man-doctor who took in Faust as an apprentice after his family's death. The old man knows that there's a moon-druid at the school. In order to buy Faust a spot in the school he sends him off with a moon-lily, a flower from another planet with extraordinary healing abilities. The flower can only be planted and bred by moon and star druids.

Mortissa Gloam is his nemesis, drug smuggler in Rovenia (DREAM PASTRIES from CoS).

Has a ghost that follows him around - this is the ghost of his mother. She is trapped here because her love for her son was so strong even in death she couldn't let anyone harm him.`,
    personality: 'Haunted, driven to understand death and healing.',
    secrets: 'His mother\'s ghost follows him and protects him. Jayce was the one who spared his life.',
    important_people: [
      { name: 'Darketh Rothwell', relationship: 'Mentor/Guardian', notes: 'Old doctor who took him in' },
      { name: 'Mortissa Gloam', relationship: 'Nemesis', notes: 'Drug smuggler, sells dream pastries' },
      { name: 'Jayce Killigan', relationship: 'Savior (unknown)', notes: 'Spared Faust during the bleeding ritual' },
      { name: 'Mother\'s Ghost', relationship: 'Ghostly protector', notes: 'Follows him constantly' },
    ],
    story_hooks: [
      { hook: 'Discovering who really killed his family', notes: 'The Ivory Reavers' },
      { hook: 'Confronting Mortissa Gloam', notes: 'Dream pastries drug operation' },
      { hook: 'Learning Jayce spared him', notes: 'Major reveal potential' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Ilviana Gloam',
    type: 'pc' as const,
    race: 'Unknown',
    class: 'Unknown',
    status: 'alive',
    summary: 'Former spy for the Cappera family who died and came back, seeking answers at Allycan.',
    backstory: `Grew up in a financially stable family, but life changed drastically when her father abruptly left, causing her mother to fall into a deep psychosis.

As the oldest child, Ilviana took charge to support her siblings and manage the household.

She was hired by the Cappera family and worked as a spy for 4.5 years, gathering intelligence on local nobles.

Assigned to find another spy allegedly betraying the Cappera family, she encounters the spy, who hints at secrets involving the Cappera family's exports.

Ilviana investigates further, sneaking into the noble family's records, but is caught by a powerful spellcaster.

After being attacked, she wakes up in a shallow grave with no memory, only a sense of something being wrong.

A kind old woman nurses her back to health, but Ilviana feels a disconnect and a lingering presence from her near-death experience.

On her deathbed, the old woman urges Ilviana to seek a school called Allycan for answers about her second chance at life.`,
    personality: 'Resourceful, determined, haunted by her near-death experience.',
    secrets: 'Something happened during her near-death experience. Her aunt Mortissa Gloam is a nemesis to another party member.',
    important_people: [
      { name: 'Mortissa Gloam', relationship: 'Aunt', notes: 'Ilviana\'s father\'s sister, develops drugs from corpses' },
      { name: 'Ki-Ev Cappera', relationship: 'Former Employer', notes: 'Head of Cappera family' },
    ],
    story_hooks: [
      { hook: 'Discovering what happened during her death', notes: 'The lingering presence' },
      { hook: 'Cappera family secrets', notes: 'What were they really exporting?' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Torik Allycan',
    type: 'pc' as const,
    race: 'Half-Human/Half-Orc',
    class: 'Barbarian',
    status: 'alive',
    summary: 'Son of Gerold Allycan, nephew of the wealthy Roderick Allycan, can grow massive when raging.',
    backstory: `Born in a tribe north of Goset, comprising humans, half-orcs, and goliaths.
Mother: Kura, a half-orc. Father: Gerold Allycan, a tall human with noble status in Rovenia.
Siblings: Two younger brothers, Garn and Betar.

Father was a "black sheep" in the family, pursuing a different lifestyle from other relatives.

Gerold was adventurous, traveling extensively in the northern regions of Obeon. Married Kura and chose to live with her in the tribe despite his noble heritage. Maintained sporadic contact with his brother Rodrick through letters and occasional visits to Rovenia.

Sedentary tribe living in a walled settlement at the base of a mountain. Settlement built atop the ruins of a giant city. Torik was fascinated by the ruins, learning to write and speak the giants' runic language.

Participated in hunts and battles, earning a reputation for ferocity and prowess as a barbarian. Known for a unique ability to grow to a massive size while raging, bringing him fame within his tribe.

Rodrick offered to secure a place for Torik in one of his academies. Torik is eager to travel south to learn more about his father's family and to explore his abilities further.`,
    personality: 'Fierce, curious about his heritage, eager to prove himself.',
    important_people: [
      { name: 'Gerold Allycan', relationship: 'Father', notes: 'Roderick\'s brother, lives with tribe' },
      { name: 'Roderick Allycan', relationship: 'Uncle', notes: 'Richest man in the world, owns the academy' },
      { name: 'Kura', relationship: 'Mother', notes: 'Half-orc from northern tribe' },
      { name: 'Garn', relationship: 'Brother', notes: 'Younger brother' },
      { name: 'Betar', relationship: 'Brother', notes: 'Younger brother' },
    ],
    story_hooks: [
      { hook: 'Discovering the source of his giant-growth ability', notes: 'Connected to the ruins?' },
      { hook: 'Meeting uncle Roderick properly', notes: 'Family politics' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Wolfgang Runecarver',
    type: 'pc' as const,
    race: 'Dwarf',
    class: 'Runecarver',
    status: 'alive',
    summary: 'A dwarven runecarver searching for Giants and his lost dwarven kin.',
    backstory: `Wolfgang is searching for any clues about the existence of other Giants or his lost dwarven kin.

His main goals at the academy are:

1. Finding Giants or Giant-Kin – He heard rumors that the wealthy family funding the academy might have Giant blood. If true, they could have knowledge of other Giants or ancient Giant history.

2. Discovering Lost Dwarven Tribes – Since his parents disappeared, Wolfgang has been searching for any sign of his people. The academy might hold historical records, maps, or legends that could lead him to lost dwarven settlements.

3. Expanding His Knowledge of Runes – As a runecarver, Wolfgang wants to deepen his understanding of Giant runes and their ancient magic, which could be documented in the academy's library.

4. Learning About the Surface World – Having spent much of his life underground or in the mountains, he studies books on languages, herbs, and geography to navigate the world better.

Though he remains cautious, the academy represents a potential source of the answers he has sought for decades.`,
    personality: 'Cautious, scholarly, determined to find his lost people.',
    important_people: [
      { name: 'Parents', relationship: 'Missing', notes: 'Disappeared, searching for them' },
    ],
    story_hooks: [
      { hook: 'The Allycan family\'s giant blood', notes: 'Rumors about their heritage' },
      { hook: 'Lost dwarven settlements', notes: 'Academy records might help' },
      { hook: 'Ancient rune knowledge', notes: 'Giant magic in the library' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Ravyn Ha\'an-Vodusas',
    type: 'pc' as const,
    race: 'Dark High-Elf',
    class: 'Paladin',
    status: 'alive',
    summary: 'Last survivor of a tyrannical house that descended from Zariel, raised by the paladin who helped overthrow her family.',
    backstory: `The House Ha'an-Vodusas descended from Zariel, ruled Solaria for 300 years, promised the region protection against hellspawn to lure locals into submission.

The family enslaved and killed thousands, until one day they retaliated against the family. The family was defeated and all were killed except the two children Ravyn and her little brother Drago.

Drago was taken away. Ravyn was taken in by a paladin called Lando who played a big part in freeing the people of Solaria from Ravyn's family.

Ravyn learned the ways of the paladin.

She is on a secret quest to uncover and destroy a demonic artifact linked to their family's past, which has the potential to unleash great evil. Landon revealed it to her some years before entering the Academy but she has no leads about it yet because everything that has to do with her family was destroyed during the insurrection.

The Crown of Command - A crown that can take control over people/enslave their minds, this was used by her family to take over Solaria.`,
    personality: 'Determined to atone for her family\'s sins, protective, conflicted about her heritage.',
    secrets: 'Searching for the Crown of Command. Her brother Drago is alive somewhere. Darketh saved her brother and delivered him to distant family.',
    important_people: [
      { name: 'Lando', relationship: 'Mentor/Adoptive Father', notes: 'Paladin who raised her' },
      { name: 'Drago', relationship: 'Brother', notes: 'Taken away during the fall of the house' },
      { name: 'Darketh Rothwell', relationship: 'Unknown savior', notes: 'Saved Drago and delivered him to family in Egmont' },
    ],
    story_hooks: [
      { hook: 'Finding the Crown of Command', notes: 'Demonic artifact that can enslave minds' },
      { hook: 'Reuniting with brother Drago', notes: 'He\'s alive in Egmont' },
      { hook: 'Descendants of Zariel', notes: 'Her demonic heritage' },
    ],
    faction: 'The Party',
  },
  {
    name: 'Lynndis "Lynn" Grace',
    type: 'pc' as const,
    race: 'Human',
    class: 'Unknown',
    status: 'alive',
    summary: 'Also known as Amelia Miriam O\'Malley, connected to the sea goddess Umberlee who took her heart.',
    backstory: `Connected to Umberlee, Goddess of the sea who took Lynn's heart so she could walk the earth.

Umberlee is viciously jealous of Lynn's mom's reputation on the sea and wants to destroy her reputation and take her down.`,
    personality: 'Lives with a goddess\'s heart, carries the burden of divine jealousy.',
    secrets: 'Umberlee took her heart. The goddess wants to destroy her mother.',
    important_people: [
      { name: 'Umberlee', relationship: 'Goddess (took her heart)', notes: 'Goddess of the sea, jealous of her mother' },
      { name: 'Mother', relationship: 'Mother', notes: 'Has a famous reputation on the sea' },
    ],
    story_hooks: [
      { hook: 'Umberlee\'s jealousy', notes: 'The goddess wants to destroy her mother' },
      { hook: 'Living without her heart', notes: 'What are the consequences?' },
    ],
    faction: 'The Party',
  },
]

// ============================================================================
// TEACHERS
// ============================================================================
const TEACHERS = [
  {
    name: 'Alistair "Cupcake" Killigan',
    type: 'npc' as const,
    race: 'Goliath',
    role: 'Teacher - Physical/Fighting',
    status: 'alive',
    summary: 'Teaches physical fighting, absolutely loves cupcakes. Hard on the outside but a big softy.',
    personality: 'Tough exterior, soft interior, obsessed with cupcakes.',
    important_people: [
      { name: 'Jayce Killigan', relationship: 'Son', notes: 'Student at the academy' },
    ],
    faction: 'Teachers',
  },
  {
    name: 'Hannibal James',
    type: 'npc' as const,
    race: 'Wendigo (disguised)',
    role: 'Teacher - Magic',
    status: 'alive',
    summary: 'Teaches magic. Is really a wendigo.',
    secrets: 'Is actually a wendigo.',
    faction: 'Teachers',
  },
  {
    name: 'Brea "Dean" Aman',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Dean - Politics',
    status: 'alive',
    summary: 'The dean of the academy. Teaches politics. Goodhearted, was a Dark Warden before becoming the dean.',
    personality: 'Goodhearted, experienced in dark matters.',
    secrets: 'Former Dark Warden.',
    faction: 'Teachers',
  },
  {
    name: 'Leila Pence',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Teacher - Necromancy',
    status: 'alive',
    summary: 'Teaches necromancy and anything beyond the living.',
    faction: 'Teachers',
  },
  {
    name: 'Nilas Finnick',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Teacher - Potions',
    status: 'alive',
    summary: 'Teaches potions.',
    faction: 'Teachers',
  },
]

// ============================================================================
// OTHER STUDENTS
// ============================================================================
const OTHER_STUDENTS = [
  {
    name: 'Jayce Killigan',
    type: 'npc' as const,
    race: 'Drow',
    class: 'Unknown',
    status: 'alive',
    summary: 'Son of Alistair. From the Ivory Reavers clan - was supposed to kill Faust but let him go.',
    backstory: `From the Ivory Reavers clan. Killed Faust's family during a "bleeding" ritual, where the young warriors of the clan are supposed to get their first kill.

They were interrupted during the killing of Faust's family, so Jayce was told to kill Faust as the rest of the clan started to leave the house in a hurry. Being left alone with Faust, Jayce couldn't do it - he dipped his sickle in the blood on the floor and ran.`,
    secrets: 'He spared Faust during the bleeding ritual. He will recognize Esther from the clan.',
    important_people: [
      { name: 'Alistair Killigan', relationship: 'Father', notes: 'Teacher at the academy' },
      { name: 'Faust', relationship: 'Victim he spared', notes: 'Let him live during bleeding ritual' },
    ],
    faction: 'Students',
  },
  {
    name: 'Valerie Novak',
    type: 'npc' as const,
    race: 'Vampire',
    class: 'Unknown',
    status: 'alive',
    summary: '2nd year vampire student. Made a deal with Mr. Allycan for her freedom from her enslaver.',
    backstory: `Kind of a bitch. Made a deal with Mr. Allycan - They took down and killed her enslaver/lord to give her freedom and she pledged her allegiance to the school.

Was turned by Castiel the vampire lord of Rovenia. 2nd year student.`,
    secrets: 'Owes her freedom to Roderick Allycan.',
    important_people: [
      { name: 'Castiel', relationship: 'Former lord', notes: 'Vampire lord of Rovenia who turned her' },
      { name: 'Roderick Allycan', relationship: 'Liberator', notes: 'Freed her from slavery' },
    ],
    faction: 'Students',
  },
  {
    name: 'Aelin Huxly',
    type: 'npc' as const,
    race: 'Half Elf',
    class: 'Moon Druid',
    status: 'alive',
    summary: '3rd year Moon Druid. Her and her dad found refuge with Shadow Druids but left when they discovered their alliance.',
    backstory: `Her dad and her had found refuge with Shadow Druids, but they stepped away when they found out the shadow druids had formed an alliance. 3rd year student.`,
    faction: 'Students',
  },
  {
    name: 'L.R. Scooter Burlington II "NightMoose"',
    type: 'npc' as const,
    race: 'Human',
    class: 'Ranger',
    status: 'alive',
    summary: '2nd year ranger from a rich family. Calls himself Night Moose. Goofy and nerdy but means well.',
    backstory: `Comes from a very rich family. Believes himself to be the next big hero. Goofy, nerdy and not much talent. Calls himself Night Moose. He means well. 2nd year student. Family sigil: Head of a boar, one whole fang and one half.`,
    personality: 'Goofy, nerdy, well-meaning, overconfident.',
    faction: 'Students',
  },
  {
    name: 'Kale Sthorm',
    type: 'npc' as const,
    race: 'Unknown',
    class: 'Warlock',
    status: 'missing',
    summary: 'The quiet type, always seemed nervous. Would stare at blank space. First student to go missing.',
    backstory: `The quiet type. Always seemed nervous. Would stare at blank space like he saw something others couldn't. Ran away / first one to go missing.`,
    secrets: 'First to go missing - something happened to him.',
    faction: 'Students',
  },
  {
    name: 'Alice Acorn',
    type: 'npc' as const,
    race: 'Elf',
    class: 'Sorcerer',
    status: 'missing',
    summary: 'Kind and intelligent elf sorcerer. Always took your side. Currently missing.',
    backstory: `Always took your side. Kind and very intelligent. Elf sorcerer. Missing.`,
    faction: 'Students',
  },
  {
    name: 'Peter Burlington',
    type: 'npc' as const,
    race: 'Half-Goliath',
    class: 'Barbarian',
    status: 'alive',
    summary: '2nd year barbarian with a tragic past. Sold to circus as a child, eventually sold to the academy.',
    backstory: `His father, a gentle goliath fell in love with a human woman. Their love was seen as a disgrace amongst everyone anywhere they went. At the age of 4 his family was killed and he was sold to the circus where he was used and abused.

Having anger issues often lead him into trouble. When he got older the circus wouldn't control him anymore and sold him to the academy. 2nd year student.

Knows Esther, though she might not know him - he was part of the same group of Raiders her adoptive parents are.`,
    personality: 'Anger issues, traumatized past.',
    secrets: 'Connected to the same Raider group as Esther\'s adoptive parents.',
    faction: 'Students',
  },
]

// ============================================================================
// KEY NPCs
// ============================================================================
const KEY_NPCS = [
  {
    name: 'Roderick Allycan',
    type: 'npc' as const,
    race: 'Human',
    role: 'Academy Patron',
    status: 'alive',
    summary: 'Father figure. Richest and most influential man in the world. Owns most of Rovenia where he resides.',
    important_people: [
      { name: 'Gerold Allycan', relationship: 'Brother', notes: 'Torik\'s father' },
      { name: 'Torik Allycan', relationship: 'Nephew', notes: 'Party member' },
    ],
    faction: 'Allycan Academy',
  },
  {
    name: 'Gerold Allycan',
    type: 'npc' as const,
    race: 'Human',
    role: 'Noble (estranged)',
    status: 'alive',
    summary: 'Roderick\'s brother. Torik\'s father. Lives with a northern tribe.',
    important_people: [
      { name: 'Roderick Allycan', relationship: 'Brother', notes: 'Academy patron' },
      { name: 'Torik Allycan', relationship: 'Son', notes: 'Party member' },
      { name: 'Kura', relationship: 'Wife', notes: 'Half-orc from the tribe' },
    ],
    faction: 'Allycan Academy',
  },
  {
    name: 'Darketh Rothwell',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Doctor/Mentor',
    status: 'alive',
    summary: 'Uncle figure. Raised Faust as his own. Saved Ravyn\'s brother and never agreed with the Ha\'an-Vodusas family.',
    backstory: `He raised Faust as his own. He saved Ravyn's brother when her house fell and delivered him to distant family in Egmont. Moved to Rovinia to stay under the radar. Never agreed with what the family were doing in Solaris.`,
    secrets: 'Knows more than he lets on about multiple party members. Saved Drago.',
    important_people: [
      { name: 'Faust', relationship: 'Apprentice/Ward', notes: 'Raised him after family death' },
      { name: 'Drago', relationship: 'Saved child', notes: 'Ravyn\'s brother, delivered to safety' },
    ],
  },
  {
    name: 'Mortissa Gloam',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Drug Smuggler',
    status: 'alive',
    summary: 'Ilviana\'s father\'s sister. Develops drugs from corpses with her brother. Faust\'s nemesis.',
    backstory: `Ilviana's father's sister. Develops a selection of drugs from corpses with brother (Ilviana's father). Drug smuggler in Rovenia - sells Dream Pastries.`,
    secrets: 'Connected to both Ilviana and Faust\'s storylines.',
    important_people: [
      { name: 'Ilviana Gloam', relationship: 'Niece', notes: 'Party member' },
      { name: 'Faust', relationship: 'Enemy', notes: 'His nemesis' },
    ],
  },
  {
    name: 'Ki-Ev Cappera',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Crime Boss',
    status: 'alive',
    summary: 'Head of Cappera family. Fishing empire is a cover for weapon smuggling.',
    backstory: `Head of family. Known for owning a smaller fishing empire and shipping low value goods. Transport and fishing business is a cover for weapon smuggling.`,
    secrets: 'Weapon smuggling operation.',
    important_people: [
      { name: 'Ilviana Gloam', relationship: 'Former Employee', notes: 'Was her spy for 4.5 years' },
    ],
    faction: 'Cappera Family',
  },
  {
    name: 'Crystal',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Ivory Reavers Leader',
    status: 'alive',
    summary: 'Co-leader of Ivory Reavers with Urza. Esther\'s adoptive mother.',
    backstory: `Crystal and Urza were the two people taking in Esther as a child. They tried raising her like the other kids in the clan, trying to teach her to fight, but they realised from an early age that she was more magically gifted and didn't thrive with weapons in hand.

Not being able to have kids of their own, they did love her like their own child and would go through fire for her. When she originally left the clan they searched far and wide for her, worrying she wouldn't be able to make it on her own in this world, viewing her as weak compared to the clan assassins and fighters.`,
    important_people: [
      { name: 'Urza', relationship: 'Partner', notes: 'Co-leader of clan' },
      { name: 'Esther', relationship: 'Adoptive daughter', notes: 'Party member who ran away' },
    ],
    faction: 'Ivory Reavers',
  },
  {
    name: 'Urza',
    type: 'npc' as const,
    race: 'Unknown',
    role: 'Ivory Reavers Leader',
    status: 'alive',
    summary: 'Co-leader of Ivory Reavers with Crystal. Esther\'s adoptive father.',
    important_people: [
      { name: 'Crystal', relationship: 'Partner', notes: 'Co-leader of clan' },
      { name: 'Esther', relationship: 'Adoptive daughter', notes: 'Party member who ran away' },
    ],
    faction: 'Ivory Reavers',
  },
  {
    name: 'Umberlee',
    type: 'npc' as const,
    race: 'Deity',
    role: 'Goddess of the Sea',
    status: 'alive',
    summary: 'Goddess of the sea. Took Lynn\'s heart so she could walk the earth. Jealous of Lynn\'s mother.',
    backstory: `Goddess of the sea. Took Lynn's heart so she could walk the earth. Is viciously jealous of Lynn's mom's reputation on the sea and wants to destroy her reputation and take her down.`,
    important_people: [
      { name: 'Lynn', relationship: 'Heart-taker', notes: 'Took her heart' },
    ],
  },
]

// ============================================================================
// SESSION DATA (30 sessions starting March 2nd 2025)
// ============================================================================
function generateSessions() {
  const sessions = []
  const startDate = new Date('2025-03-02')
  const sessionTitles = [
    'Welcome to Allycan Academy',
    'First Classes and Introductions',
    'The Library\'s Secrets',
    'Night Moose\'s Grand Plan',
    'Shadows in the Courtyard',
    'Cupcake\'s Training',
    'The Missing Student',
    'Investigating Kale\'s Disappearance',
    'Into the Catacombs',
    'Dark Discoveries',
    'The Wendigo\'s Hunger',
    'Confronting Hannibal',
    'Alice Goes Missing',
    'The Search Continues',
    'Dream Pastries',
    'Mortissa\'s Trail',
    'Family Secrets Revealed',
    'The Ivory Reavers Strike',
    'Recognition',
    'Jayce\'s Confession',
    'Blood Bonds',
    'The Crown\'s Trail',
    'Ravyn\'s Heritage',
    'Journey to Egmont',
    'Brother Found',
    'Wolfgang\'s Discovery',
    'Giant Ruins',
    'The Iron Duke\'s Visit',
    'Esther\'s Bargain',
    'The Battle Begins',
  ]

  for (let i = 0; i < 30; i++) {
    const sessionDate = new Date(startDate)
    sessionDate.setDate(startDate.getDate() + (i * 7)) // Weekly sessions

    // Add some gaps (skip week 5, 12, 20)
    if (i >= 5) sessionDate.setDate(sessionDate.getDate() + 7)
    if (i >= 12) sessionDate.setDate(sessionDate.getDate() + 7)
    if (i >= 20) sessionDate.setDate(sessionDate.getDate() + 14)

    sessions.push({
      session_number: i + 1,
      title: sessionTitles[i] || `Session ${i + 1}`,
      date: sessionDate.toISOString().split('T')[0],
      summary: `Session ${i + 1} of the Allycan campaign.`,
      notes: '',
    })
  }

  return sessions
}

// ============================================================================
// RELATIONSHIPS
// ============================================================================
const RELATIONSHIPS = [
  // Faust relationships
  { character: 'Faust Blackwood', related: 'Darketh Rothwell', type: 'mentor', label: 'raised by' },
  { character: 'Faust Blackwood', related: 'Mortissa Gloam', type: 'enemy', label: 'nemesis' },
  { character: 'Faust Blackwood', related: 'Jayce Killigan', type: 'other', label: 'spared by (unknown)' },

  // Esther relationships
  { character: 'Esther', related: 'Crystal', type: 'parent', label: 'adoptive mother' },
  { character: 'Esther', related: 'Urza', type: 'parent', label: 'adoptive father' },

  // Ravyn relationships
  { character: 'Ravyn Ha\'an-Vodusas', related: 'Darketh Rothwell', type: 'other', label: 'saved her brother' },

  // Torik relationships
  { character: 'Torik Allycan', related: 'Roderick Allycan', type: 'other', label: 'nephew' },
  { character: 'Torik Allycan', related: 'Gerold Allycan', type: 'parent', label: 'son' },

  // Ilviana relationships
  { character: 'Ilviana Gloam', related: 'Mortissa Gloam', type: 'other', label: 'aunt' },
  { character: 'Ilviana Gloam', related: 'Ki-Ev Cappera', type: 'employer', label: 'former employer' },

  // Lynn relationships
  { character: 'Lynndis "Lynn" Grace', related: 'Umberlee', type: 'other', label: 'took her heart' },

  // Jayce relationships
  { character: 'Jayce Killigan', related: 'Alistair "Cupcake" Killigan', type: 'parent', label: 'son' },

  // Valerie relationships
  { character: 'Valerie Novak', related: 'Roderick Allycan', type: 'ally', label: 'freed by' },

  // Academy relationships
  { character: 'Roderick Allycan', related: 'Gerold Allycan', type: 'sibling', label: 'brothers' },
]

// ============================================================================
// IMPORT FUNCTION
// ============================================================================
async function importAllycanCampaign() {
  console.log('Starting Allycan campaign import...')

  try {
    // 1. Create the campaign
    console.log('Creating campaign...')
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: USER_ID,
        name: 'Allycan Academy',
        game_system: 'D&D 5e',
        description: 'A dark fantasy campaign set in Allycan Academy, where students with troubled pasts learn magic and combat. Hidden secrets, missing students, and powerful enemies await.',
      })
      .select()
      .single()

    if (campaignError) throw campaignError
    console.log(`Campaign created: ${campaign.id}`)

    // 2. Create faction tags
    console.log('Creating faction tags...')
    const tagMap = new Map<string, string>()
    for (const tag of FACTION_TAGS) {
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .insert({
          campaign_id: campaign.id,
          name: tag.name,
          color: tag.color,
          category: tag.category,
        })
        .select()
        .single()

      if (tagError) {
        console.error(`Failed to create tag ${tag.name}:`, tagError)
      } else {
        tagMap.set(tag.name, tagData.id)
        console.log(`  Created tag: ${tag.name}`)
      }
    }

    // 3. Import all characters
    console.log('Importing characters...')
    const characterMap = new Map<string, string>()
    const allCharacters = [...PARTY_CHARACTERS, ...TEACHERS, ...OTHER_STUDENTS, ...KEY_NPCS]

    let posX = 100
    let posY = 100
    const COLS = 6
    let col = 0

    for (const char of allCharacters) {
      const { data: charData, error: charError } = await supabase
        .from('characters')
        .insert({
          campaign_id: campaign.id,
          name: char.name,
          type: char.type,
          race: (char as any).race || null,
          class: (char as any).class || null,
          role: (char as any).role || null,
          status: char.status || 'alive',
          summary: char.summary || null,
          backstory: char.backstory || null,
          personality: char.personality || null,
          secrets: char.secrets || null,
          important_people: char.important_people || [],
          story_hooks: char.story_hooks || [],
          position_x: posX,
          position_y: posY,
        })
        .select()
        .single()

      if (charError) {
        console.error(`Failed to create character ${char.name}:`, charError)
      } else {
        characterMap.set(char.name, charData.id)
        console.log(`  Created character: ${char.name}`)

        // Add faction tag if specified
        const faction = (char as any).faction
        if (faction && tagMap.has(faction)) {
          await supabase.from('character_tags').insert({
            character_id: charData.id,
            tag_id: tagMap.get(faction),
          })
        }
      }

      // Update position for next character
      col++
      if (col >= COLS) {
        col = 0
        posX = 100
        posY += 250
      } else {
        posX += 220
      }
    }

    // 4. Create relationships
    console.log('Creating relationships...')
    for (const rel of RELATIONSHIPS) {
      const charId = characterMap.get(rel.character)
      const relatedId = characterMap.get(rel.related)

      if (charId && relatedId) {
        const { error: relError } = await supabase
          .from('character_relationships')
          .insert({
            campaign_id: campaign.id,
            character_id: charId,
            related_character_id: relatedId,
            relationship_type: rel.type,
            relationship_label: rel.label,
          })

        if (relError) {
          console.error(`Failed to create relationship ${rel.character} -> ${rel.related}:`, relError)
        } else {
          console.log(`  Created relationship: ${rel.character} -> ${rel.related}`)
        }
      }
    }

    // 5. Create sessions
    console.log('Creating sessions...')
    const sessions = generateSessions()
    for (const session of sessions) {
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          campaign_id: campaign.id,
          session_number: session.session_number,
          title: session.title,
          date: session.date,
          summary: session.summary,
          notes: session.notes,
        })

      if (sessionError) {
        console.error(`Failed to create session ${session.session_number}:`, sessionError)
      } else {
        console.log(`  Created session: ${session.title}`)
      }
    }

    // 6. Create canvas groups
    console.log('Creating canvas groups...')
    const groups = [
      { name: 'The Party', color: '#3B82F6', icon: 'users', x: 50, y: 50, width: 1400, height: 300 },
      { name: 'Teachers', color: '#F59E0B', icon: 'graduation-cap', x: 50, y: 400, width: 1200, height: 280 },
      { name: 'Students', color: '#10B981', icon: 'book-open', x: 50, y: 730, width: 1600, height: 280 },
      { name: 'Key NPCs', color: '#8B5CF6', icon: 'crown', x: 50, y: 1060, width: 1600, height: 280 },
    ]

    for (const group of groups) {
      const { error: groupError } = await supabase
        .from('canvas_groups')
        .insert({
          campaign_id: campaign.id,
          name: group.name,
          color: group.color,
          icon: group.icon,
          position_x: group.x,
          position_y: group.y,
          width: group.width,
          height: group.height,
        })

      if (groupError) {
        console.error(`Failed to create group ${group.name}:`, groupError)
      } else {
        console.log(`  Created group: ${group.name}`)
      }
    }

    console.log('\n✅ Allycan campaign import complete!')
    console.log(`Campaign ID: ${campaign.id}`)
    console.log(`Characters: ${allCharacters.length}`)
    console.log(`Sessions: ${sessions.length}`)
    console.log(`Faction Tags: ${FACTION_TAGS.length}`)
    console.log(`Relationships: ${RELATIONSHIPS.length}`)

  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

// Run the import
importAllycanCampaign()
