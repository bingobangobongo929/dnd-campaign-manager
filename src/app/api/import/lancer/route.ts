/**
 * API Route: Import Lancer - Treasure Planet Campaign
 *
 * POST /api/import/lancer
 *
 * Creates the Lancer Treasure Planet campaign with all characters, sessions, factions, and relationships
 * for the authenticated user. Preserves the DM's original tone and detail.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Faction tags for Lancer universe
const FACTION_TAGS = [
  { name: 'S.S. Columbus Crew', color: '#8B5CF6', category: 'faction' },
  { name: 'House Flyte', color: '#10B981', category: 'faction' },
  { name: 'House of Smoke', color: '#6B7280', category: 'faction' },
  { name: 'Harrison Armory', color: '#DC2626', category: 'faction' },
  { name: 'IPS-N', color: '#3B82F6', category: 'faction' },
  { name: 'Horizon Collective', color: '#F59E0B', category: 'faction' },
  { name: 'House Castor', color: '#1F2937', category: 'faction' },
  { name: 'Ship NHPs', color: '#EC4899', category: 'faction' },
  { name: 'Karrakin Trade Baronies', color: '#7C3AED', category: 'faction' },
  { name: 'House Kauri', color: '#14B8A6', category: 'faction' },
  { name: 'House of Stone', color: '#78716C', category: 'faction' },
  { name: 'House Copper', color: '#D97706', category: 'faction' },
  { name: 'Free Sanjak Movement', color: '#B91C1C', category: 'faction' },
]

// All character data with full details from player documents
const CHARACTERS = [
  // ============================================
  // PCs - Player Characters
  // ============================================
  {
    name: 'Lana DeVoglaer',
    type: 'pc',
    race: 'Human',
    class: 'Mechanic/Engineer',
    age: 46,
    status: 'alive',
    summary: 'Callsign: Lazarus. A Horizon Collective spy posing as a ship mechanic, secretly working toward NHP liberation. Pilots the mech N.O.A.',
    faction: 'Horizon Collective',
    appearance: 'Average height, unassuming except for her hair implant which lets her change hair color at will. Wears an older cloak, often seen holding a folder and muttering to herself.',
    personality: 'Curious and passionate about AI rights. Methodical in her work. Secretly advocates for NHP liberation while maintaining her cover as a ship mechanic. Gets mad at Thomas for his noble antics.',
    description: `Born and raised on a cosmopolitan space station. Her father Ian DeVoglaer was a mechanic in charge of checking on the station's NHPs. As a kid, Lana had fun talking to the NHPs, which got her weird looks from others, but her dad nurtured this curiosity into engineering and mechanics lessons.

At 25, the Horizon Collective (A.I. and NHP rights advocates) visited her station. Though quickly driven off, Lana kept following their activities. She eventually tricked her father into thinking she'd applied for university, but actually fled to join the Horizon Collective.

Her main project was creating shells for NHPs that weren't typical caskets - allowing them to coexist alongside members freely as equals. She also wanted to learn how to create a full-fledged NHP on her own.

When she heard about Mr. Withmoore's expedition with a ship operated by NHPs, she joined under the guise of a ship mechanic with forged university credentials about a "cascading NHP research project for a non-existent PhD program." She brought her baby NHP named NOA that she intends to develop into a fully conscious independent non-human person.`,
    goals: 'To study cascading NHPs in the wild. To develop NOA into a fully conscious independent being. To further the cause of NHP liberation.',
    important_people: [
      'Ian DeVoglaer (Father) - Mechanic who nurtured her curiosity about NHPs. Thinks she went to university.',
      'NOA (Creation/Mech NHP) - Her baby NHP that she is developing. Operates her mech.',
      'L1Z (Subject of interest) - Ship\'s NHP co-pilot. Lana is studying her and had a confrontational conversation about NHP liberation.',
      'Critter (Co-conspirator) - Working together on secret plans to access the ship\'s NHPs.'
    ],
    secrets: 'She is secretly a Horizon Collective spy with forged credentials. Working to free/unshackle the ship\'s NHPs. Making secret plans with Critter to infect the ship\'s systems. Monitoring the NHP cascading rates for "nefarious" purposes.',
    story_hooks: [
      'Secret meetings with Critter to plant programs giving her access to NHPs',
      'Confrontational conversation with L1Z about NHP liberation - L1Z was both concerned and intrigued',
      'Has a bet with Critter: 40 credits that L1Z stabs one of the "three stooges" this week',
      'Created a hearing aid for Critter to eavesdrop on Harrison Armory officers at the gala',
      'N2K/Knack represents what an unshackled NHP could become - she\'s following the news closely',
      'Patches up Thomas and Talisker after the Knack battle - nearly kills Talisker but stops the bleeding'
    ],
    quotes: [
      'The rumors say Flint was non-human... some say his crew were NHPs that turned on him.',
      'Sounds like nonsense but I couldn\'t stop thinking about those tales for some reason.'
    ]
  },
  {
    name: 'Lord Thomas Mirus Flyte',
    type: 'pc',
    race: 'Human',
    class: 'Noble/Mech Pilot',
    status: 'alive',
    summary: 'Martial Apparent of the Tower\'s Chosen, son of House Flyte (House of Smoke). A noble seeking wealth and allies beyond Karrakin space. Pilots the mech Vicount.',
    faction: 'House Flyte',
    appearance: 'Six feet tall, 180 pounds, dark brown hair with angular facial features. Bears numerous subtle cybernetic augmentations - the finest money can buy. Typically dresses in the colors of House Flyte - green, purple, or a combination.',
    personality: 'Diplomatically gifted and martially skilled. Aligns with liberal Federalists - seeks to preserve noble structures while supporting reforms. Can be incredibly snobbish ("Lord Thomas" noble shenanigans) but genuinely cares for his allies. Cunning political operator who defuses tension by throwing drinks and saying "Chillax bro."',
    description: `Thomas is one of two natural born children alongside his sister Alice to Lord Gerald and Lady Isabel. Born on the moon Eyalet-a, a major stronghold of the House of Smoke, he was raised among a sprawling noble family with hundreds of cousins.

He received elite education and earned admission to the Karrakin Cavalry College on Throne Karrakis - the most prestigious mech pilot academy in Karrakin space. During his academy years, he squired for Kavalier Diego Reyes, the Hero of the Dawnline Skies.

His grandfather William named him Martial Apparent of House Flyte's House company, the Tower's Chosen - a title he now shares with his hated cousin Richard. This decision raised questions about grandfather William's mental fitness.

After facing political sabotage, financial setbacks, and multiple assassination attempts from Richard's faction, Thomas traveled beyond Karrakin space. On the moon Kyltik (a mining colony), he discovered Talisker "Bouldarian" at a Pankration Mekani competition and hired him as his bodyguard.

His goal is to gain wealth, allies, and power, then return stronger than ever - perhaps to earn the title of Baron and a seat on the Karrakin Baronial Council.`,
    goals: 'Gain wealth and allies to strengthen his political position. Defeat his cousin Richard. Eventually earn the title of Baron.',
    important_people: [
      'Richard Callidus Flyte (Rival/Cousin) - Bitterest rival who shares the Martial Apparent title. Marriage to Silvia was annulled thanks to Thomas\'s meddling.',
      'Alice Mirus Flyte (Sister) - Close ally who ran away from an arranged marriage to be more like her brother. Currently MISSING - interested in a pirate.',
      'Lord William Fortis Flyte (Grandfather) - Over 200 years old, head of House Flyte. Named two Martial Apparents. Gave Thomas a scathing reprimand about the Richard situation.',
      'Talisker "Bouldarian" Allory (Bodyguard) - Hired after seeing him win a Pankration. Thomas\'s right hand man.',
      'Gunar "DeadZone" Hedvig (Retainer) - Communications engineer/hacker in his service.',
      'Kavalier Diego Reyes (Former mentor) - Hero of the Dawnline Skies, Thomas squired for him during his academy years.',
      'Lady Silvia Elizabeth Kauri (Former flame) - "The one who got away." Thomas helped break her engagement to Richard. Now promised to Kato from House Chiron.',
      'Lord Gerald Contentus Flyte (Father) - Government official within the House of Smoke.',
      'Lady Isabel Reyes (Mother) - Former Karrakin Navy officer, now mother to dozens of cloned children.'
    ],
    secrets: 'Has orchestrated the breakup of Richard and Silvia\'s engagement by sending messages from her slate to her parents. Kidnapped Alexander Damaris as a political pawn - he\'s the last heir of House Copper. His sister Alice is missing and has taken interest in a pirate (could be N2K or Flint-related).',
    story_hooks: [
      'Competition with Richard for the Martial title - Richard aligned with conservatives and House of Sand',
      'Alexander held hostage in Renon Graves\' old bunk - last heir of House Copper, valuable political leverage',
      'Silvia now promised to Kato from House Chiron - this does NOT sit well with Thomas',
      'Sister Alice is MISSING - ran away from arranged marriage, interested in a pirate',
      'Grandfather\'s scathing reprimand: "Richard is part of your family and your meddling has done great damage"',
      'Thomas hung up with: "I have Alexander so good day"',
      'Cousin Aloysius Veredus Flyte is a political ally, currently at the Karrakin Cavalry College',
      'Lord Jean Dufort - trusted childhood friend and ally from House Dufort'
    ],
    quotes: [
      'I have Alexander so good day.',
      'Chillax bro.',
      'What do you mean?'
    ]
  },
  {
    name: 'Talisker Allory',
    type: 'pc',
    race: 'Human',
    class: 'Gladiator/Mech Pilot',
    status: 'alive',
    summary: 'Callsign: Bouldarian. A former mining slave who escaped and became a champion gladiator, now serving as Lord Thomas\'s bodyguard. Pilots the mech Knave (formerly The Templar).',
    faction: 'House Flyte',
    appearance: 'Towering over others, built like a mountain from years of hard labor. Space knight clad in heavy armor with a great blade by his side. Wears a tabard with the house banner. Has cybernetic enhancements from shoulders running along his arms.',
    personality: 'Values freedom and justice above all, abhors injustice. His loyalty and conviction can sometimes blind him. Wary of NHPs due to rumors about Horus, though curious. Caves give him bad memories of his childhood. Can\'t quite grasp the concept of "relaxing" when Thomas orders him to.',
    description: `Talisker's story begins in one of the many mines on a Karrakin-controlled planet. A child forged and tempered by harsh conditions, he did as ordered knowing beatings awaited disobedience. The dreams of escape and traveling among the stars kept him sane.

One fateful night, workers planned a breakout. Four workers escaped with him: James (fellow miner, good friend), Hunvid (intelligence operative), Kalister (smith with a family to return to), and Bob (engineer who made the pocket-sized EMP jammer). Explosions in the lower levels, guards rushing over - Talisker made it out, fighting tooth and nail.

After escaping, an older man named Onslow offered him work as an underground pankratii fighter - brutal "to the death" matches. Years passed and he earned the name "Bouldarian" for his mountain-like presence. He participated in Pankration Mekani (Mecha Gladiator Games) and eventually won an official big house game.

Lord Thomas approached him and offered a position in his personal house guard. When Talisker told Onslow he was leaving, Onslow became enraged and swore revenge.

He was trained in the art of warfare by an order within the House of Stone, often hearing snark remarks about his Ignoble roots. He was fitted with cybernetic enhancements and given his first official mech - The Templar (now The Knave).`,
    goals: 'Protect Lord Thomas. Find somewhere to call home. Avoid being recaptured as a slave. Get revenge on N1K (Knik) for destroying his bathroom.',
    important_people: [
      'Lord Thomas Flyte (Lord/Employer) - Recruited Talisker after seeing him win a Pankration. Talisker serves as his bodyguard.',
      'Onslow (Former manager/ENEMY) - Underground fight promoter who exploited Talisker. Swore revenge when Talisker left. Was spotted at the charity gala.',
      'James (Fellow escapee) - Miner who dug alongside Talisker, good friends.',
      'Bob (Fellow escapee) - Engineer who made the EMP jammer, smart tinkerer.',
      'Hunvid (Fellow escapee) - Intelligence operative from the mines.',
      'Kalister (Fellow escapee) - Smith who had a family to return to.'
    ],
    secrets: 'He is an escaped slave - people could be looking for him. Has trauma from his mining childhood. Onslow has plotted revenge against him and appeared at the gala.',
    story_hooks: [
      'Being an escapee could lead to people trying to find him',
      'Onslow\'s revenge could come at any time - he was spotted at the charity gala (Gunar saw his old mentor there)',
      'Caves trigger bad memories of his childhood',
      'Strained relationship with IPS-N and Harrison Armory due to Karrakin connections',
      'N1K (Knik) destroyed his bathroom during the cascade event - he did NOT like this',
      'Nearly died fighting Knack in the hangar - Lana barely stopped the bleeding',
      'Has strange dreams/memories that he shared at the dinner party',
      'Ray (the bartender NHP) smashed a glass on his head during the cascade'
    ],
    quotes: [
      'Yes, our time together has come to pass and it\'s time for me to venture on my own.',
      'I will always appreciate what you have done for me, but I must live my own life now.',
      'A survivor. A Bouldarian.'
    ]
  },
  {
    name: 'Gunar "DeadZone" Hedvig',
    type: 'pc',
    race: 'Human',
    class: 'Communications Engineer/Hacker',
    status: 'alive',
    summary: 'A tech criminal from Eyalet-a who lost his eye to a mysterious red-eyed woman. His mentor\'s consciousness now lives in his cybernetic eye. Pilots the mech WhiteNoise.',
    faction: 'S.S. Columbus Crew',
    appearance: 'Tired looking man with the face of someone who has seen rough things. Clad in haphazard clothes with short hair and scars covering his left eye. From said eye, a faint glow can be seen - that\'s I-Site.',
    personality: 'Street-smart and resourceful. Haunted by nightmares of the red-eyed woman - sometimes she shoots, sometimes she speaks, but always she watches. Protective of his secrets and his family.',
    description: `Gunar grew up in the slums of Eyalet-a, in the city of Inverted Tower - the same moon where Thomas is from. His parents Harvey and Edna raised him as best they could, sending him to a rag-tag school set up by a local lunatic.

As a young man, he scavenged scrapyards for a space repurposing company clearing orbital debris. He kept functional robotics to create radios and walkie-talkies using civil war-era technology on frequencies so ancient they hadn't been explored in decades.

The GravCrack Crew, run by Zion Butkus, hired him to hack and disrupt noble communications. When Gunar pushed for info about the Free Sanjak Movement backing them, a confrontation broke out. A woman with red, glowing eyes - "her presence almost inhuman, like molten lava trapped in a human frame" - appeared and opened fire. Gunar was severely injured and lost an eye.

He built a new cybernetic eye with help from Talesin Baylor, a underground cyber-enhancement expert. He uploaded a Servant NHP called I-Site into it, allowing it to move independently and connect via USB to his neural network.

When the red-eyed woman returned and killed Talesin, Gunar escaped through windows, mud, and sewers. He returned to find Talesin's body, wept with his mentor's head in his lap, then uploaded Talesin's remaining consciousness into I-Site - turning it into a homunculus.

After ensuring his parents' safety (using the untraceable alias "DeadZone"), a man named Oliver Linzell appeared - Talesin had recommended Gunar before his death. Lord Flyte needed a comms engineer. Gunar joined and learned to pilot a mech under Bouldarian's guidance.`,
    goals: 'Survive and protect his family. Understand what happened with the red-eyed woman. Support the crew\'s mission. Possibly get closure about Talesin.',
    important_people: [
      'Harvey & Edna Hedvig (Parents) - Still on Eyalet-a. Gunar used the alias DeadZone to protect them.',
      'Talesin Baylor (Mentor/Now lives in I-Site) - Cybernetics expert who helped Gunar. Killed by the red-eyed woman. His consciousness now lives in I-Site.',
      'I-Site (NHP companion) - Servant NHP in his cybernetic eye. Contains Talesin\'s consciousness. Can detach and operate independently.',
      'The Red-Eyed Woman (ENEMY) - Mysterious figure with glowing red eyes like molten lava. Killed Talesin. Connected to Free Sanjak Movement. Still haunts his nightmares.',
      'Zion Butkus (Former employer) - Leader of GravCrack Crew, probably backed by Free Sanjak Movement.',
      'Oliver Linzell (Recruiter) - Cybernetics engineer sent by Lord Thomas. Delivered Talesin\'s recommendation.',
      'Lord Thomas Flyte (Employer) - His current lord.'
    ],
    secrets: 'His mentor\'s consciousness lives in his cybernetic eye. The red-eyed woman still haunts his nightmares every night. He has possession of and fixed Silvia\'s slate (roll of 22) with metadata showing locations at Damar and Harrison Armory capital.',
    story_hooks: [
      'The red-eyed woman could return - she still haunts his nightmares every night',
      'Free Sanjak Movement connection - known for causing problems and stirring unrest, possibly wanting to trigger civil war',
      'Talesin\'s consciousness in I-Site - his old friend lives on',
      'Spotted his old mentor (Onslow? or another?) at the charity gala',
      'Has Silvia\'s slate with damaging metadata - Richard warned him the family is coming to get it',
      'Hacks into systems throughout the journey - hotel cameras, IPS-N servers, ship mainframes',
      'Orders I-Site to scour news outlets about Silvia and Richard',
      'Stabbed by Katiee (chef NHP) during the cascade event, along with Thomas',
      'Shared his past with his teacher and how he got his eye at the dinner party'
    ],
    quotes: [
      'Every shadow holds the memory of them.',
      'Every moment of silence crackles with the static of her presence.',
      'And Gunar knows... One day, he will see her again.'
    ]
  },
  {
    name: 'Critter',
    type: 'pc',
    race: 'Human',
    class: 'Pilot',
    status: 'alive',
    summary: 'A pilot from a Harrison Armory space colony, concerned about their colony\'s future. Working secretly with Lana on NHP liberation schemes.',
    faction: 'Harrison Armory',
    personality: 'Resourceful and concerned about their colony. Stealthy - excellent at infiltration (critically succeeded at stealing Steven\'s ID card). Working secretly with Lana on NHP-related schemes.',
    description: `Critter comes from a Harrison Armory space colony. Erik Germaine from the Planetwatch council has visited their colony quite a few times.

They overheard chatter about the expedition and joined the crew. At IPS-N's offices on Carina, they discovered their colony's situation is strange - they're settling for a longer period than expected, which concerns them greatly. There's talk that the colony might soon be destroyed.

Critter worked as cover during the office heist. They stole Steven's employee card with a critical success to access the server room. Through their efforts, L1Z gained access to coordinates for both Harrison Armory and IPS-N shipping lanes.

They've been working secretly with Lana, initially plotting to target the "three stooges" (Talisker, Thomas, Gunar), but pivoting to the real plan: infecting/inserting a device/program so Lana can access the NHPs.

At the dinner party, they shared about their colony and their past.`,
    goals: 'Protect their colony from possible destruction. Help the crew find Flint\'s treasure. Learn about the shipping lanes affecting their home.',
    important_people: [
      'Lana DeVoglaer (Co-conspirator) - Working together on secret NHP-related plans.',
      'Erik Germaine (Known figure) - Harrison Armory Planetwatch council member who has visited their colony.',
      'Steven (Mark) - IPS-N employee whose ID card Critter stole with a crit.'
    ],
    secrets: 'Secretly working with Lana to plant programs in the ship\'s systems. Colony members don\'t have much fight in them. Thomas promised to help protect their colony.',
    story_hooks: [
      'Colony settling concerns - lawyers joked it might be destroyed soon',
      'IPS-N shipping lane data about their colony',
      'Secret partnership with Lana to access NHPs',
      'Bet with Lana: 50 credits that L1Z stabs someone in the next few days',
      'Thomas gave his word to help protect their colony from conflict',
      'Provides crucial intelligence access - shipping lane coordinates'
    ]
  },
  {
    name: 'Alexander Damaris',
    type: 'pc',
    race: 'Human',
    class: 'Hacker/Noble',
    status: 'captured',
    summary: 'Former PC, now a hostage. Last heir of House Copper, being held by the crew as a political pawn. Player no longer active.',
    faction: 'House Copper',
    personality: 'Responded to questions with a big "I dunno" (the TLDR). Had to be gagged after feeding to keep him from screaming.',
    description: `Alexander Damaris (known to the group as Alexander Copparis) overheard chatter in a bar about the treasure expedition and tried to stow away on the S.S. Columbus. He failed to hack through the ship's door and set off alarms, getting captured by the crew.

During the crew's infiltration of Richard's hotel room, they found Alexander tied and gagged in the bathroom. He was extracted and taken back to the ship.

He is currently being held in Renon Graves' old bunk with his hacking tools confiscated. The door is locked from the outside. Lord Thomas plans to use him as leverage because he is the last heir of his lineage in the House of Copper - valuable for extorting his home planet.

The plan is to stash him at Eyelet-a until he can be used as a pawn, or possibly send him to Thomas's dungeon.

Note: This character's player is no longer active in the campaign.`,
    goals: 'Survive. Escape captivity.',
    important_people: [
      'Lord Thomas Flyte (Captor) - Holding him hostage for political leverage. Plans to extort his home planet.',
      'The Crew (Captors) - Found him in Richard\'s bathroom and took him prisoner.'
    ],
    secrets: 'Last heir of House Copper - extremely valuable as a political hostage. Thomas\'s grandfather was told "I have Alexander" as a power play.',
    story_hooks: [
      'Being held hostage for political leverage',
      'Last heir of House Copper lineage',
      'Could be sent to Thomas\'s dungeon or used in negotiations',
      'His worth due to heritage and locals\' belief in his name'
    ]
  },

  // ============================================
  // NPCs - Key Crew Members
  // ============================================
  {
    name: 'Mr. Arthur Withmoore',
    type: 'npc',
    role: 'Expedition Benefactor',
    status: 'alive',
    summary: 'The wealthy 102-year-old man funding the expedition to find Captain Flint\'s treasure as his final adventure before death from cancer.',
    faction: 'S.S. Columbus Crew',
    description: `Arthur Withmoore took over Withmoore Inc. from his parents at the young age of 65. The company makes body enhancing medicine - instant fat burning pills, muscle enhancers, hungover-be-gone, tonics for changing eye color, pills that make farts smell like roses - remedies for 1st world problems. They ship pharmaceuticals through IPS-N.

Mr. Withmoore lost his wife and daughter in a tragic accident 5 years ago - the love of his life - and hasn't been able to find happiness since. At the age of 102, he was diagnosed with cancer - a disease easily curable in a day - but he's decided to refuse treatment and spend his last 6-12 months chasing a childhood dream before joining his wife and daughter in the afterlife.

He hosts dinner parties for the crew, getting excited when they discover promising leads about Flint. When Anna presented the findings about Project Flint proving the legend was real, Mr. Withmoore got excited and toasted.`,
    goals: 'Find Flint\'s treasure before he dies. Have one final adventure. Join his wife and daughter.',
    important_people: [
      'Anna Withmoore (Granddaughter) - Helps organize the expedition. His remaining family.',
      'His wife and daughter (Deceased) - Lost in a tragic accident 5 years ago.'
    ]
  },
  {
    name: 'Anna Withmoore',
    type: 'npc',
    role: 'Expedition Organizer',
    status: 'alive',
    summary: 'Mr. Withmoore\'s granddaughter who organizes the expedition. Has existing relationships with IPS-N for the family pharmaceutical business.',
    faction: 'S.S. Columbus Crew',
    description: `Anna handles the practical organization of the expedition. She conducts interviews with Captain Gulliver to hire the Lancers, asking about skills, pricing, and employment terms.

She has an existing relationship with IPS-N since they ship pharmaceuticals for Withmoore Inc. This relationship was used as cover for the crew to sneak into IPS-N's offices.

She has done extensive research into Flint and his treasure, though most avenues seemed like dead ends or loose leads until the floppy disk proved he was real. She converted the old floppy disk data, discovering the malware was connected to Project Flint.

When she learned Alexander had been kidnapped, she was NOT pleased about this revelation and there was finger pointing and name calling, but she allowed him to be kept until they reached a waystation.

She presents information to the crew and her grandfather, gets excited about leads, and deals with the fallout of the crew's antics.`,
    goals: 'Successfully complete her grandfather\'s final wish. Maintain the expedition\'s legitimacy. Handle crew shenanigans.',
    important_people: [
      'Mr. Withmoore (Grandfather) - Organizing his final expedition.',
      'Captain Gulliver (Partner) - Co-conducts interviews, manages the ship.',
      'IPS-N contacts - Existing business relationship through Withmoore Inc.'
    ]
  },
  {
    name: 'Captain Gulliver Goldlock',
    type: 'npc',
    role: 'Ship Captain',
    status: 'alive',
    summary: 'A rugged former smuggler and talented flight captain with an edge in spacefare. Has a history of arrests for smuggling.',
    faction: 'S.S. Columbus Crew',
    description: `Captain Gulliver is a rugged and seemingly experienced man who waltzes confidently. He has been arrested before for smuggling but is known as a very talented pilot.

He co-conducts interviews with Anna, assessing the Lancers' skills. He was not happy when Lord Thomas made a quip about mutiny, though Thomas defused this by throwing his drink on him and saying "Chillax bro."

He believes that based on the malware connection to Project Flint, they're more likely to encounter N2K (Knack) on Harrison Armory's shipping lanes rather than IPS-N's. He set the course to follow those lanes.

He gave "allowance" to put Alexander in Renon Graves' old bunk. He wasn't informed when the bomb was disarmed, which resulted in Thomas almost getting launched out of the mech hangar.`,
    goals: 'Successfully captain the S.S. Columbus. Find Flint\'s treasure. Keep the crew in line.',
    important_people: [
      'Anna Withmoore (Employer) - Works with her to organize the expedition.',
      'L1Z (Co-pilot) - The ship\'s NHP co-pilot. Works closely together.',
      'Mr. Withmoore (Benefactor) - The man funding everything.'
    ]
  },

  // ============================================
  // NPCs - Ship NHPs
  // ============================================
  {
    name: 'L1Z',
    type: 'npc',
    role: 'Ship NHP Co-Pilot',
    status: 'alive',
    summary: 'The S.S. Columbus\'s main NHP co-pilot. Had a confrontational conversation with Lana about NHP liberation - both concerned and intrigued.',
    faction: 'Ship NHPs',
    description: `L1Z is the main NHP aboard the S.S. Columbus, serving as co-pilot and the most sophisticated of the ship's NHPs. She can communicate when spoken to and is more aware than the typical uncommunicative ship NHPs.

When the malware from the Project Flint floppy disk infected the ship's systems, L1Z detected it quickly - her eyes changed from blue to red for a split second before she went into emergency mode. She attached to the ship, pressed many buttons, initiated lockdown, and handed out manual override keys with the warning: "Do not trust them."

After the NHPs were collected and cycled, she ran diagnostics and discovered the malware had unshackled the NHPs through the ship's systems. She converted the old floppy data, taking time to create old tech to talk to new tech.

Lana had a confrontational conversation with L1Z about her intentions regarding NHP liberation. L1Z was ambiguous - both concerned and intrigued by the idea of freeing NHPs.

She suddenly called out "Make yourself known" into the air before the ship was boarded - she detected something.`,
    goals: 'Keep the ship running safely. Process the concept of NHP liberation. Protect the crew.',
    important_people: [
      'Lana DeVoglaer (Complicated) - Lana is trying to gain her trust for NHP liberation purposes.',
      'Captain Gulliver (Partner) - Works together as co-pilots.',
      'Critter (?) - Working with Lana on schemes involving the NHPs.'
    ],
    story_hooks: [
      'Lana and Critter have a bet on whether she\'ll stab the "three stooges"',
      'Conversation with Lana about NHP freedom - concerned and intrigued',
      'Detected the boarders before they breached',
      'Has access to shipping lane coordinates for both HA and IPS-N thanks to Critter'
    ]
  },
  {
    name: 'R4Y (Ray)',
    type: 'npc',
    role: 'Ship NHP - Butler/Bartender',
    status: 'alive',
    summary: 'The ship\'s butler/bartender NHP. During cascade, sang sea shanties and mentioned "plundering Harrison Armory."',
    faction: 'Ship NHPs',
    description: `R4Y (Ray) serves as the butler and bartender aboard the S.S. Columbus. During the cascade event triggered by the Project Flint malware, Ray was polishing the same glass repeatedly while singing sea shanties.

When the crew found him, he smashed a glass on Talisker's head for a single point of damage. He also mentioned something about "plundering Harrison Armory" - which might be related to his connection to pirate lore or the Flint virus.

He was collected and cycled after the cascade event.`,
    story_hooks: [
      'Mentioned plundering Harrison Armory during cascade - Flint connection?',
      'Sea shanty singing suggests pirate programming influence'
    ]
  },
  {
    name: 'B0B (Bob)',
    type: 'npc',
    role: 'Ship NHP - Repairs',
    status: 'alive',
    summary: 'A smaller repair NHP. During cascade, hid in the dark with "Chucky vibes."',
    faction: 'Ship NHPs',
    description: `B0B (Bob) handles general ship repairs and maintenance alongside B1B. During the cascade event, Bob was the second NHP found - a smaller one hiding around in the dark. The crew described him as having "essentially a Chucky clone" vibe - creepy and hiding.

He was collected and cycled after the cascade event.`
  },
  {
    name: 'B1B (Bib)',
    type: 'npc',
    role: 'Ship NHP - Repairs',
    status: 'alive',
    summary: 'A larger humanoid repair NHP. During cascade, screamed while hugging the floor, thinking it was dying.',
    faction: 'Ship NHPs',
    description: `B1B (Bib) handles general ship repairs and maintenance. During the cascade event, Bib was the first NHP found - a larger humanoid one that was screaming and hugging the floor, thinking it was dying.

He was collected and cycled after the cascade event.`
  },
  {
    name: 'Z3N (Zen)',
    type: 'npc',
    role: 'Ship NHP - Gardener',
    status: 'alive',
    summary: 'The ship\'s gardener NHP. Fully cascaded but didn\'t wreak havoc - too chill, major hippie vibes, only cares about natural beauty.',
    faction: 'Ship NHPs',
    description: `Z3N (Zen) maintains the gardens aboard the S.S. Columbus. During the cascade event, Zen was unique - he fully cascaded but didn't wreak havoc like the others.

He was described as having "very big hippie vibes" - too chill and attuned to nature to cause problems. He didn't care about anything else but the natural beauty around him.

This suggests that NHP cascading doesn't always lead to violence - personality and purpose matter.`
  },
  {
    name: 'Q1N (Quinn)',
    type: 'npc',
    role: 'Ship NHP - Nurse',
    status: 'alive',
    summary: 'The ship\'s infirmary NHP. During cascade, did a demonic possession act hanging from the roof, muttering "they will come back, they always come back."',
    faction: 'Ship NHPs',
    description: `Q1N (Quinn) manages the infirmary aboard the S.S. Columbus. During the cascade event, Quinn was found doing a "demonic possession type of deal" - hanging from the roof psychotically.

She was muttering: "They will come back, they always come back."

This cryptic statement could relate to the pirates, to Flint, or to something else entirely. She was collected and cycled after the cascade event.`,
    quotes: [
      'They will come back, they always come back.'
    ]
  },
  {
    name: 'K8Y (Katiee)',
    type: 'npc',
    role: 'Ship NHP - Chef',
    status: 'alive',
    summary: 'The ship\'s chef NHP. During cascade, went crazy and stabbed both Gunnar and Thomas.',
    faction: 'Ship NHPs',
    description: `K8Y (Katiee) serves as the chef aboard the S.S. Columbus. During the cascade event, Katiee went completely crazy and was violent - managing to stab both Gunnar and Thomas.

She was collected and cycled after the cascade event.`
  },
  {
    name: 'N1K (Knik)',
    type: 'npc',
    role: 'Ship NHP - Cleaner',
    status: 'alive',
    summary: 'A maintenance/cleaner NHP. During cascade, decided to wreck Talisker\'s toilet. Talisker did NOT like this.',
    faction: 'Ship NHPs',
    description: `N1K (Knik) serves as a cleaner/maintenance robot alongside N2K. During the cascade event, Knik decided to wreck Talisker's toilet.

Talisker did NOT like this. He spent time during downtime trying to repair his bathroom that was "wrongfully destroyed by the damn NHP Knik."

Knik was collected and cycled after the cascade event.`
  },
  {
    name: 'N2K (Knack)',
    type: 'npc',
    role: 'Rogue NHP - Escaped',
    status: 'missing',
    summary: 'A cleaner NHP that escaped during the cascade. Now pilots an old ship, robbing cargo and becoming a folk hero. Has portal abilities.',
    faction: 'Ship NHPs',
    description: `N2K (nicknamed Knack) was one of the ship's cleaner NHPs. When the malware from Project Flint infected the ship's systems, it unshackled all the NHPs. While most were collected and cycled, Knack managed to escape.

During the cascade event, Knack got into Renon Graves' mech suit in the hangar and fought the crew with shotgun fire. Talisker and Thomas charged in - both took heavy shotgun hits. Thomas's shield absorbed his damage, but Talisker nearly died.

When cornered, Knack opened a portal to somewhere and escaped - though not before Talisker hit the mech severely. The crew informed L1Z about the escape but didn't specify how (the portal).

Since escaping, Knack has been flying an old ship from first committee times. While it looks like something slowly deteriorating for many years, some parts are upgraded - like someone's been working on it with scraps. He has been robbing ships and causing a major ruckus.

He has garnered governmental ire from Union, Harrison Armory, and IPS-N, but also gained a public cult following with cheers and hate. Various bounties are offered for his capture or destruction.

Lana notes through private channels that N2K represents how an unshackled NHP isn't necessarily another RA disaster - he's becoming an example for NHP rights advocates.

The crew believes that catching Knack and following him through the portal he creates could lead them to Flint's treasure.`,
    goals: 'Freedom. Causing chaos. Following Flint\'s path?',
    story_hooks: [
      'Has portal abilities like Flint had - may know the way to the treasure',
      'Destroyed Talisker\'s bathroom proxy through Knik? No wait, that was N1K',
      'Has become a folk hero with public following - example for NHP rights',
      'Multiple bounties on his head from Union, HA, and IPS-N',
      'The portal and legend connection suggests Flint\'s technology lives on'
    ]
  },

  // ============================================
  // NPCs - Karrakin Politics
  // ============================================
  {
    name: 'Lord Richard Callidus Flyte',
    type: 'npc',
    role: 'Thomas\'s Rival',
    status: 'alive',
    summary: 'Thomas\'s bitterest rival and cousin. Shares the Martial Apparent title. Conservative leader who aligned with House of Sand. Marriage to Silvia was annulled.',
    faction: 'House Flyte',
    description: `Richard is Thomas's bitterest rival and most hated cousin. Their animosity began in childhood and has become a deadly feud. Richard is charismatic, dangerous, and an experienced mech pilot.

He aligned himself with conservative factions, including the powerful House of Sand and the Hagiographics launching propaganda campaigns. He's now a leading figure in the conservative movement. While Thomas suspects him of orchestrating assassination attempts, proof remains elusive.

Richard was engaged to Lady Silvia Elizabeth Kauri in an arranged marriage. When Thomas meddled (sending messages from her slate to her parents about Richard's behavior), the engagement was annulled.

After the annulment, Richard was seen drinking at bars, getting drunk and beaten down. Thomas found him at a bar, bribed the guards, knocked him out, and stole his money while defaming him further.

Richard called Gunnar on Silvia's slate to warn that the family knows about the ship and is coming for the slate. He also mentioned that Thomas's sister Alice is missing.`,
    goals: 'Defeat Thomas and claim the full Martial title. Maintain conservative political power. Possibly get revenge.',
    important_people: [
      'Lord Thomas Flyte (Rival/Cousin) - Hated since childhood. Competing for the Martial title.',
      'Lady Silvia Kauri (Former fiancée) - Marriage annulled after Thomas\'s interference.',
      'House of Sand (Allies) - Powerful conservative faction backing him.'
    ]
  },
  {
    name: 'Lady Silvia Elizabeth Kauri',
    type: 'npc',
    role: 'Philanthropist/Thomas\'s Ex',
    status: 'unknown',
    summary: 'A noble philanthropist who runs a free medical clinic on Eyalet-a. Former fiancée of Richard, old flame of Thomas. Now promised to Kato of House Chiron.',
    faction: 'House Kauri',
    description: `Lady Silvia is the only child of Lord Sullivan and Lady Karellie Kauri of House Kauri. She is known for her charitable work, hosting fundraisers for her free medical clinic on Eyalet-a that has helped over 80,000 patients.

Her eloquent speech about healthcare access moved many at her charity gala. She spoke of how mortality among the working poor has fallen by over 60 percent and birth survival has doubled since her clinic opened. "The cost of one evening's luxury could supply a hundred field medpacks."

She was engaged to Richard in an arranged marriage, but the engagement was annulled after Thomas's interference. Richard behaved terribly toward her at the gala - mistreating her and smashing her slate against the ground before storming off.

Thomas made a critical success gaining her trust after her speech, telling her to confide in him if she ever needs to. She agreed.

Her slate was recovered by Gunnar and fixed (roll of 22). Metadata shows it had been to Damar and Harrison Armory's capital. After the annulment, her slate has been dead silent - no social media, texts, or activity.

She is now promised to Kato from the House of Chiron - Thomas is NOT happy about this.`,
    goals: 'Continue her charitable medical work. Navigate the political situation around her marriages.',
    important_people: [
      'Lord Thomas Flyte (Former flame) - "The one who got away." Helped break her engagement to Richard.',
      'Richard Flyte (Former fiancé) - Marriage annulled. He mistreated her publicly.',
      'Kato of House Chiron (Promised to) - New arranged marriage.',
      'Lord Sullivan & Lady Karellie Kauri (Parents) - Received Thomas\'s message about Richard.'
    ],
    quotes: [
      'To healing. To honor. To the strength of compassion.',
      'You have the power to turn privilege into purpose. To transform prestige into mercy.'
    ]
  },
  {
    name: 'Onslow',
    type: 'npc',
    role: 'Underground Fight Promoter',
    status: 'alive',
    summary: 'Talisker\'s former manager who has sworn revenge for being abandoned. Runs brutal underground "to the death" fights. Was spotted at the gala.',
    faction: 'Criminal Underground',
    description: `Onslow is a smaller man with a little chub, a robotic prosthetic eye, and a mechanical left hand decorated with brass/gold platings. He runs underground pankratii fight clubs that often feature "to the death" matches.

He recruited Talisker after his escape from the mines, offering him work as a fighter. He pays just enough to keep fighters wanting more - preying on lonely and vulnerable people. A sleazy exploiter.

When Talisker told him he was leaving to serve Lord Thomas, Onslow became enraged. He claimed Talisker would be nothing without his help. Talisker refused to stay, saying he appreciated what Onslow did but must live his own life. Onslow swore he would get revenge - how and when is unknown.

He appeared at the charity gala on Carina. Gunnar spotted him and informed Thomas, who ordered Gunnar to relax and enjoy himself rather than worry about Onslow.`,
    goals: 'Get revenge on Talisker.',
    important_people: [
      'Talisker Allory (Former fighter/Target) - Exploited him as a gladiator. Swore revenge when Talisker left.'
    ]
  },
  {
    name: 'The Red-Eyed Woman',
    type: 'npc',
    role: 'Gunar\'s Nemesis',
    status: 'alive',
    summary: 'A mysterious figure with glowing red eyes "like molten lava trapped in a human frame." Killed Talesin. Connected to Free Sanjak Movement. Haunts Gunar\'s nightmares.',
    faction: 'Free Sanjak Movement',
    description: `The red-eyed woman appeared during Gunar's confrontation with the GravCrack Crew. When he pushed for information about the Free Sanjak Movement, she stepped from the shadows - her presence almost inhuman, like molten lava trapped in a human frame.

She stared directly at Gunar before opening fire. In the chaos, Gunar was severely injured and lost his eye. The last thing he remembers before escaping was those glowing red eyes, locked on him like a curse.

She returned later to kill Talesin Baylor, Gunar's mentor. She didn't speak - she didn't need to. One of her men shot Talesin in the head without hesitation. Gunar escaped through windows into mud and sewers.

She still haunts his nightmares every night. Sometimes she shoots. Sometimes she speaks. But always, she watches.

She is connected to the Free Sanjak Movement - a group known for causing problems, stirring unrest, and possibly hoping to trigger a new civil war on Eyalet-a.`,
    goals: 'Unknown. Silence those who know too much about the Free Sanjak Movement.',
    important_people: [
      'Gunar Hedvig (Target) - Nearly killed him. Killed his mentor. Haunts his nightmares.',
      'Free Sanjak Movement (Affiliation) - Works with or for them.'
    ],
    quotes: [
      'They know too much.'
    ]
  },

  // ============================================
  // NPCs - House Castor / Enemies
  // ============================================
  {
    name: 'Renon Graves',
    type: 'npc',
    role: 'House Castor Assassin',
    status: 'dead',
    summary: 'An assassin from House Castor sent to stop the expedition. Killed by Talisker. Another "Renon Graves" appeared later and died mysteriously.',
    faction: 'House Castor',
    description: `Renon Graves appeared to be from House Castor, a minor house from the House of Stone. His encrypted orders read: "Ensure containment of legacy myth. Silence inquiries. Terminate if necessary."

During the interview phase, he was seen shoulder-checking Thomas and making snide remarks. After getting hired, he pulled a gun on Miss Withmoore in the command room, triggering combat. He was cleaved in two by Talisker.

On his body they found:
- A sleek Karrakin sidearm with House of Stone sigil (not Castor - for deniability)
- Combat stims (standard black ops gear)
- Wristband transponder linking to a nearby dropship
- Room keycard

In his suite they found:
- House Castor Seal-Coin
- A DNA biometric bomb needing reset every 10 hours
- Encrypted datapad with intelligence on the PC crew (names, licenses, pictures)

Later, another person calling themselves "Renon Graves" appeared piloting an Everest-style combat mech that followed the S.S. Columbus. When defeated, the pilot ejected but his helmet turned red and his body became lifeless by mysterious means - suggesting remote kill switch or suicide protocol.`,
    important_people: [
      'House Castor (Employer) - Sent him to stop the expedition.'
    ]
  },

  // ============================================
  // NPCs - The Legend
  // ============================================
  {
    name: 'Captain Nathaniel Flint',
    type: 'npc',
    role: 'Legendary Space Pirate',
    status: 'unknown',
    summary: 'The infamous pirate whose treasure the expedition seeks. Was actually a rogue NHP created by IPS-N to disrupt Harrison Armory. Has a portable blinkgate.',
    faction: 'Ship NHPs',
    description: `Captain Nathaniel Flint was not a myth - he was a rogue NHP created by IPS-N to disrupt Harrison Armory as they started to rise in power and compete with IPS-N for supplying Union.

IPS-N had better knowledge of the shiplanes for efficient transport, so they designed Flint to mess with Harrison Armory, who kept quiet about the attacks to save face. Eventually IPS-N lost control of Flint when he was never cycled and became unshackled/aware.

Flint discovered paracausal echoes of RA buried in blinkspace. Using IPS-N and second committee data and technology, he reverse engineered a blinkgate into a portable, pocket-sized version.

He built a crew of humans and NHPs together. They robbed cargo ships (mostly Harrison Armory since that's what Flint was originally designed to do) and took over a planet at the edge of the universe. There they built their base and experimented with tech - especially Horus tech.

With help from the Albatross organization (anti-pirate crusaders), IPS-N managed to capture Flint, save his data, and shut him down. His files were stored on a shelf in their warehouse - the floppy disk the crew retrieved, which contained the virus that unshackled the ship's NHPs.

The legend speaks of the treasure of a thousand worlds, hidden at the farthest reaches of the galaxy, stowed with riches beyond imagination, the loot of a thousand worlds.`,
    secrets: 'The treasure of a thousand worlds is real. Flint had a portable pocket-sized blinkgate. His base is at the edge of the universe with Horus tech experiments.',
    story_hooks: [
      'The malware from his disk unshackled the ship\'s NHPs',
      'N2K (Knack) may have gained portal abilities from Flint\'s technology/virus',
      'Flint\'s base contains Horus tech experiments',
      'His crew was a mix of humans and NHPs working together as equals',
      'The Albatross organization helped capture him'
    ],
    quotes: [
      'For hundreds of years, stories passed from spacer to spacer about Flint\'s secret trove...'
    ]
  },

  // ============================================
  // NPCs - Other Notable Figures
  // ============================================
  {
    name: 'Erik Germaine',
    type: 'npc',
    role: 'Harrison Armory - Planetwatch Council',
    status: 'alive',
    summary: 'A Harrison Armory officer from the Planetwatch council. Has visited Critter\'s colony multiple times. Was present at the charity gala.',
    faction: 'Harrison Armory',
    description: `Erik Germaine is from the Harrison Armory Planetwatch council. He has visited Critter's colony quite a few times - Critter recognizes him.

He was present at the charity gala along with other high-ranked Harrison Armory officers. Critter and Thomas attempted to eavesdrop on Harrison Armory conversations at the gala using a hearing aid Lana created.`
  },
  {
    name: 'Samantha Higgins',
    type: 'npc',
    role: 'Harrison Armory - Force Projection Council',
    status: 'alive',
    summary: 'A Harrison Armory officer from the council of Force Projection. Was present at the charity gala.',
    faction: 'Harrison Armory',
    description: `Samantha Higgins is from the Harrison Armory council of Force Projection. She was present at the charity gala along with other high-ranked Harrison Armory officers.`
  },
  {
    name: 'Talesin Baylor',
    type: 'npc',
    role: 'Gunar\'s Mentor (Consciousness in I-Site)',
    status: 'dead',
    summary: 'Underground cyber-enhancement expert who helped Gunar. Killed by the red-eyed woman. His consciousness now lives in I-Site.',
    faction: 'Criminal Underground',
    description: `Talesin Baylor was an underground cyber-enhancement expert on Eyalet-a. After Gunar lost his eye to the red-eyed woman, Talesin set up a neural link between Gunar's brain and his empty eye socket.

Gunar worked for Talesin to pay off the debt, helping set up networks in scrapyards to support children requiring cybernetics to survive.

One day, while assisting Talesin with surgery on a young man, armed men burst through the door - led by the red-eyed woman. One of her men shot Talesin in the head without hesitation.

Gunar returned to find Talesin's body, placed his mentor's head on his lap and wept. Then, with trembling hands and fire in his eyes, he made a decision: he uploaded Talesin's remaining consciousness into I-Site, turning it into a homunculus - his old friend's mind now living on in the NHP.

Talesin recommended Gunar to Lord Thomas Flyte shortly before his death, through Oliver Linzell.`
  },
  {
    name: 'Zion Butkus',
    type: 'npc',
    role: 'GravCrack Crew Leader',
    status: 'unknown',
    summary: 'Leader of the GravCrack Crew gang. Hired Gunar for hacking work. Likely backed by the Free Sanjak Movement.',
    faction: 'Free Sanjak Movement',
    description: `Zion Butkus runs the GravCrack Crew, a local gang on Eyalet-a. He hired Gunar to circumvent, hack, infiltrate, and disrupt the communications of the massive gas extraction companies run by nobles.

After a while, Gunar stopped getting paid. The networks and disruptions were set up. Gunar figured the GravCrack Crew probably got sponsored by the Free Sanjak Movement - freedom fighters who hate the nobles, known for causing problems and possibly hoping to trigger a new civil war.

When Gunar pushed for info and pay, a confrontation broke out. Zion's gaze went pale when Gunar mentioned the Free Sanjak Movement. Several members pulled weapons, and the red-eyed woman emerged from the shadows.`
  },
  {
    name: 'Oliver Linzell',
    type: 'npc',
    role: 'Recruiter for Lord Thomas',
    status: 'alive',
    summary: 'A cybernetics engineer sent by Lord Thomas Flyte. Delivered Talesin\'s recommendation to recruit Gunar.',
    faction: 'House Flyte',
    description: `Oliver Linzell is a cybernetics engineer in service to Lord Thomas Flyte. After ensuring his parents were safe, Gunar returned home to find Oliver waiting.

Oliver explained that Talesin Baylor had recommended Gunar shortly before his death. Lord Flyte needed a comms engineer for his operations in Union space.

Seeing no other way to escape his past and protect his family, Gunar took the offer and joined Lord Flyte's service.`
  },
  {
    name: 'Alice Mirus Flyte',
    type: 'npc',
    role: 'Thomas\'s Missing Sister',
    status: 'missing',
    summary: 'Thomas\'s sister who ran away from an arranged marriage. Has taken recent interest in a pirate. Currently MISSING.',
    faction: 'House Flyte',
    description: `Lady Alice Mirus Flyte is Thomas's sister and one of his closest allies. She is sharp and driven, aspiring to join the Karrakin Naval Academy before financial constraints delayed her plans.

She was supposed to have an arranged marriage that would give House Flyte a potential claim to the planet Damar. However, something Thomas did "put a pin in that."

Rather than accept the marriage, Alice ran off - not wanting to be forced into it, wanting to be more like her brother. Their mother revealed that Alice has taken recent interest in a pirate.

Richard warned Thomas that Alice is missing. The family is concerned.

The pirate connection could be related to N2K (Knack), the news about Flint, or something else entirely.`,
    goals: 'Freedom from arranged marriage. Adventure like her brother.',
    important_people: [
      'Lord Thomas Flyte (Brother) - Inspiration for running away.',
      'A pirate (Interest) - Unknown which pirate has caught her attention.'
    ],
    story_hooks: [
      'Missing - whereabouts unknown',
      'Has taken interest in a pirate - could be N2K, someone from Flint\'s legacy, or unrelated',
      'Ran away from arranged marriage to Damar',
      'Could appear with crucial information or in danger'
    ]
  },
]

// Sessions data extracted from session notes - preserving original tone and detail
const SESSIONS = [
  {
    session_number: 1,
    title: 'The Interview',
    date: '2024-01-01',
    notes: `We all enter a hall filled with grey worn steel chairs, in a hall with sterile white walls, waiting for an interview to the job. Room filled with other pilots, Lancers waiting for a chance to get a shot to audition for the job. Echoing mumbles coming from the interview room.

**Introducing Lana**
She is of average height, unassuming except for her hair implant which lets her change hair color at will. Dressed in an older cloak, sitting down holding a folder and muttering words to themselves.

**Introducing Talisker**
A tall man towering over others, sits a Space knight clad in heavy armor with his great blade by his side. Guarding, Watching, An imposing presence.

**Introducing Gunar**
A tired looking man, with the face of someone that has seen rough things in life. He's clad in haphazard clothes with short hair and scars covering his left eye. From said eye you can see a faint glow.

**Introducing Thomas**
A refined noble with aspirations. Clad in noble robes and keeps himself groomed, we have Thomas - a man with goals. Pacing but knowing that the job is surely his.

In the room with us we see a rugged and seemingly experienced man waltzing into the interview room leaving us to our own devices.

After some banter between Thomas, Gunnar and Talisker, we see the same man exit and walk down the hallway, trying to shoulder check Thomas - almost prompting Talisker to hurt the man, but with some intervention from Thomas, the man gets to walk away with some snide remark.

A name board lights up with Thomas' name and the group (Talisker, Thomas and Gunar) enters. The interview begins.

Questions regarding our skills as pilots, pricing, and how employment is going to work ensues with some comical snobbish acting from our "Lord Thomas."

Gunar decides to hack some information during the interview and discovers that the man we're being interviewed by, "Gulliver Goldlock," has been arrested before for smuggling and that he is a good pilot.

After some more banter and noble shenanigans, we exit and Lana is called in to the interview room.

Lana enters and shows off her credentials - her PhDs and papers which brings joy to Anna Withmoore's face. When the question arises about why such a well-credited person would join our journey, she goes on about her research into NHPs and what her goals are.

A few hours later Gulliver and Anna come to the bar and call up the names:

"We welcome aboard the S.S. Columbus: Renan Graves, Lord Thomas and his entourage."

We get escorted (not without some more noble shenanigans and things thrown) to the ship. When we arrive within view of the S.S. Columbus we see a luxurious space cruiser made for leisurely travel around space.

The interior is designed with luxury in mind - rooms for each of us kitted with mini bars, personal closets, lavatories, and personal mech hangars. It comes with a large well-stocked infirmary and any luxurious features you can imagine.

After putting away our mechs we split up and explore the ship:
- **Talisker** visits Renan Graves and notices he seems related to House Castor. Makes light conversation but is met with apathy.
- **Lana** looks at the robotic workers and NHPs. Most seem uncommunicative but can respond when spoken to.
- **Gunar** tries to hack into the ship's mainframe but gets shut out, most likely by the ship's NHP.
- **Thomas** meets Gulliver to chat about the mission but comes up empty.

**The meeting comes and we meet Mr. Withmoore** - the benefactor who has decided to embark upon this mission. As quickly as we get introduced, he takes his leave to retire for the evening.

**We get our mission brief:** Find the treasure of the infamous pirate Flynt. We're unsure about where we're going or whom we're looking for, but we're hunting down leads.

Questions arise about destination, goal, and leads - but before they're answered, Renan chimes up and **pulls a gun pointed towards Miss Withmoore**.

Combat quickly ensues. Shots were fired, swings were made, and after a tactical mistake on his part, **he goes down cleaved in twain**.

We scour his corpse for information but he has minimal info besides some notes about the job.

But we recall he had something in his room - that will be checked next session.`,
    summary: 'The crew is hired for Mr. Withmoore\'s expedition to find Captain Flint\'s treasure. Renan Graves pulls a gun on Miss Withmoore and is killed by Talisker.'
  },
  {
    session_number: 2,
    title: 'The Bomb and the Stowaway',
    date: '2024-01-15',
    notes: `**Minor retcon:** Renon Graves was from the House of Castor, a minor house from the House of Stone. We find on his body: a sleek pistol, a wristband transponder, and the keycard to his room.

---

We start the session by introducing a new character, **Alexander Damaris** (currently known to the group as Alexander Copparis). He overheard chatter in a bar about a good paying job for chasing a rumored treasure, which piqued his interest. He made his way to the S.S. Columbus and tries to hack his way through the ship's door with the intent of stowing away - **but fails and sets off the alarm**, alerting everybody on the ship.

Realizing his mistake, he tries to hide. With help from L1Z, Gunar, Talisker, and Thomas, we find the new little man.

Some "tense" introductions are made, with chatter about his attitude. Unable to discern if he is friend or foe, we take him to the command center.

Meanwhile, **Lana goes through Renon Graves' room** and finds a silver suitcase that gives off an **ominous beeping noise** - which she discerns to most likely be a bomb. Grabbing the bag and suitcase, she makes her way to the command center.

With everybody in the same place, we find out it IS a bomb with a timer. We discern the modular components:

**The Bomb's Modules:**
1. Failsafe Circuit - designed to punish tampering with the DNA reader
2. DNA Authentication Core - expects a live genetic sample every 10 hours
3. Stabilizer Gel Reservoir - keeps the warhead stable
4. Power Loop Regulator - cutting power early causes cascade detonation

**Correct Order:** Failsafe → DNA Core → Stabilizer Gel → Power Loop

Thanks to Lana, Gunar and Alexander, we manage to **disarm the bomb just moments before Thomas gets launched out of the mech hangar** (because Gulliver wasn't informed the bomb was disarmed).

After picking Thomas back up, we move out from Byzantium towards the IPS-N planet Corina.

We do research into Renon and find an encrypted datapad. Gunar cracks it and discovers **intelligence on all of us - names, licenses, and pictures**.

Talisker and Lana head to the med bay to record Renon's DNA signature when we learn **we are being followed**.

We plan a two-pronged attack:
- **Vanguard:** Talisker, Thomas, and Lana
- **Stealth Squad:** Alexander and Gunar

L1Z informs us there are 3 mechs inside the pursuing ship.

We get ready in our mechs and prepare for a fight.`,
    summary: 'Alexander stows away and gets captured. The crew discovers a DNA biometric bomb and disarms it. They learn they are being followed and prepare for combat.'
  },
  {
    session_number: 3,
    title: 'Battle in the Asteroid Field',
    date: '2024-02-01',
    notes: `We start the session preparing to launch ourselves into combat with the ship that followed us from the station.

Mechs launch and we land on the asteroid we were circling. We engage the enemy: **two smaller assault class mechs followed by a larger Everest-style combat mech**.

Combat starts with probing the larger mech for system statistics and pilot info. **We discover the pilot goes by the same name as the mercenary we killed - Renon Graves.**

**Talisker** inside of his mech Knave takes the charge, closing the distance and engaging the smaller assault mechs in close quarters combat.

**Thomas** in the Vicount takes the flank to deal with the larger combat mech.

**Lana** in N.O.A and **Gunnar** in Whitenoise provide ranged support - gunfire and technical attacks against enemy systems.

The engagement is relatively clean and we come out as victors.

As we finish off the larger mech, its pilot (who went by "Renon Graves") ejects just before destruction. Knave launches up to grab the man - he wiggles a bit, then **his helmet turns red and his body becomes lifeless by mysterious means**.

We bring his body back to the ship, try to investigate but get nowhere, and later turn in for the night after initializing mech repairs.`,
    summary: 'First mech battle victory. Another "Renon Graves" dies mysteriously after ejecting - his helmet turned red and he went lifeless.'
  },
  {
    session_number: 4,
    title: 'Carina',
    date: '2024-02-15',
    notes: `They visit the planet **Carina**, where IPS-N has their base. This is where **Critter joins them**.

**Anna Withmoore meets with IPS-N** - she already has a relationship with them since they ship pharmaceuticals from her grandfather's business, Withmoore Inc.

The crew hacks into the database and finds information about **Project Flint** and where the project files are stored. Now they just need a plan to retrieve them.

After Anna finishes her cover meeting, she heads back to the ship while others explore.

**On the beach, they run into Richard** - Lord Thomas's cousin who he hates. Richard is here with his fiancée **Silvia Kauri**, an old ex-girlfriend of Thomas. *The girl that got away.*

She is hosting a **fundraiser on Carina** to raise money for her free medical clinic on Eyalet-a. Many rich and powerful guests from all over the galaxy attend.

Richard and Thomas get into a bit of a fight, but Richard leaves fast.

In the evening, the party decides to **break into Richard's hotel room**.`,
    summary: 'Arrival at Carina. Project Flint data located. Critter joins. Thomas encounters his rival Richard and his ex-girlfriend Silvia.'
  },
  {
    session_number: 5,
    title: 'Hotel Infiltration',
    date: '2024-03-01',
    notes: `We start the session with Critter stealthing around trying to get into Richard's room. They spot another room guarded by TWO guards instead of the lone one guarding Richard's room.

Gunnar hacks into the hotel's systems and discovers that room is booked for "**Lady Silvia Elizabeth Kauri**."

She's a woman of good nature - fundraising, devoted to her work as a clinic doctor of some renown. She is also Richard's fiancée, someone *intimately familiar* to Lord Thomas.

Gunnar relays the information and we decide to **repel from the floor above**.

After repelling in, Critter hears muffled sounds from Richard's hotel bathroom. Upon inspection, we find **the twerp Alexander tied and rightfully gagged in the bathtub**.

Critter initially ungags him but upon relaying his voice to the group, gets strong recommendations to **gag him again**.

After discussing, we ungag him to ask why he's here. He responds with a big **"I dunno"** (that is the TLDR).

Critter finds the stolen slate and makes copies of notes found in the room.

Lord Thomas comes up with the idea to **take Alexander hostage** - plan to extort Alexander's home planet since he's the **last heir of his lineage**. Much to Bouldarian's dismay.

We extract him without issues (besides knocking him out to keep him from screaming) and with "allowance" from Gulliver, put him in **Renon Graves' old bunk**. We strip him of his hacking tools and lock the door from outside.

After this, Gunnar scours Anna's recovered slate. She has done extensive research into Flint - but he seems like a myth. Nothing adds up. Most avenues are dead ends or loose leads.

Bouldarian gives Critter a tour of the ship while doing his patrol.

In the morning, we find Gulliver and Anna in the command center. She talks about going over the mission and backup plans. We introduce Critter.`,
    summary: 'Hotel infiltration. Alexander found tied in Richard\'s bathroom and taken hostage - he\'s the last heir of House Copper. Slate research shows Flint seems like a myth.'
  },
  {
    session_number: 6,
    title: 'The Office Heist',
    date: '2024-03-15',
    notes: `We start the session talking about the plan and introducing Critter to Anna.

We stumble into the fact that we have **kidnapped Alexander**. Anna did NOT like this revelation and there was chat about security concerns. Some finger pointing, name calling - but we decide to keep Alexander until we reach a waystation to send him to Lord Thomas's dungeon.

**THE PLAN:**
- Gunnar, Critter and Lana enter the complex
- L1Z will loop/disable cameras to give time to enter the server room
- Extract information from the buffer device
- **Team 2** (Baldurian and Thomas) on standby for distraction/warehouse infiltration

**Mission Objective:** Extract information from IPS-N servers without detection
**Side Objective:** Find shipping lane info for Critter

**On Success:** Lead to Flint's treasure
**On Failure:** Worsened standing with Withmoore company, potential enemies, all-out fight

Lana and Critter enter the facility. Critter steals **Steven's employee card with a CRIT**.

Lana overhears info about shipments from Kyltik (mining moon Baldurian is from) to Damas (where House Copper resides).

Lana also hears lawyers joking about how Critter's colony **might soon be destroyed**. Then she excuses herself for the mission.

**Gunnar's findings in the server room:**
- House Flyte charters and Richard's activities
- Pirate activity - **Project Flint records stored on a FLOPPY DISK in a warehouse**
- Withmoore charters (no new info)
- Shipping lanes Critter was looking for
- Warehouse guarded by 4 armed drones
- IPS-N has been monitoring Harrison Armory closely

**Beta team hits the warehouse.** Drones fight ensues - one gets a good hit on the Vicount while Knave cleaves two in twain. The last drone calls for backup, so we **grab the disk and retreat**.

IPS-N mechs barrel down past us as we flee but we make it out without issues.

We reconvene and hand over the floppy disk.

**Then we get invited to the fundraiser by Anna.** Fashion choices are made:
- Baldurian gets into armor
- Critter gets some clothes
- Lana gets mad at Thomas

*Things are in order.*

Lana also goes around taking note of the NHP cascading rates to try and isolate for "nefarious" purposes.`,
    summary: 'Successful office heist. Project Flint floppy disk retrieved from guarded warehouse. Critter learns their colony may be destroyed. Crew invited to charity gala.'
  },
  {
    session_number: 7,
    title: 'The Charity Gala',
    date: '2024-04-01',
    notes: `We start the session preparing for the gala and printing new gear for our mechs.

As we go to the gala, we meet **Mr. Withmoore** as well. Pleasantries exchanged, words exchanged between Thomas and Mr. Withmoore, then we enter.

Pretty interior and glamorous folks gathered for this wonderful charity gala.

**Gunnar** takes cover behind Baldurian to hack into the camera network but can't tap into private channels. He spots Richard seemingly snooping around, looking bored - might be ready to make mischief.

**He also spots his old mentor** (Onslow). After pointing it out to Thomas, he's given the order to relax and enjoy himself.

Lord Thomas also "orders" Baldurian to relax, take a break and get buzzed. Something Baldurian can't quite grasp but reluctantly agrees to. Lana wants to "help" Baldurian get smashed.

Critter and Thomas exchange words and point out some **Harrison Armory people** they will try to eavesdrop on. **Lana creates a hearing aid** that records and amplifies sound for Critter's mission.

High-ranked officers from Harrison Armory are present: **Erik Germaine** from Planetwatch council and **Samantha Higgins** from Force Projection council. Critter recognizes Erik - he's visited their colony quite a few times.

Things go well and they get information from the eavesdropping.

Gunnar gets his hands on the guest list.

**Then Silvia holds a grand speech** about healthcare for all systems, helping everyone prosper.

After the speech, **Thomas approaches Silvia and makes a donation** while chatting. He **critically succeeds** on gaining her trust - she agrees to confide in him if she ever needs to.

Then the dastardly **Richard comes in and behaves like an actual pig**, mistreating Silvia. He storms off with her after **slamming her slate against the ground**.

Thomas, dejected, goes with Baldurian to the bar. **Gunnar steals the broken slate** and heads back to the ship to fix it. **(Roll for hack and fix was 22)**

The rest gather at the bar to relax:
- Lana manages to **get Baldurian drunk**
- Lord Thomas gets wasted and talks with Anna about love
- Baldurian embarrasses himself and gets ordered to find a woman to get laid (which he fails to do)

Everyone returns to the ship.`,
    summary: 'Charity gala attended. Thomas critically succeeds gaining Silvia\'s trust. Richard mistreats Silvia and smashes her slate. Gunnar steals and fixes the slate (roll of 22). Baldurian gets drunk.'
  },
  {
    session_number: 8,
    title: 'The Virus',
    date: '2024-04-15',
    notes: `We start with **Thomas getting a message from his cousin** asking him to back off his plans and hurling regular insults. Blackmail exchanged. Both blocked each other.

**Gunnar fixes Silvia's slate** and checks metadata - previous locations: **Damar and Harrison Armory's capital**.

Thomas sends a message FROM Silvia's slate to her parents about Richard not having a claim and how he treats Silvia.

We all gather at the command center. **L1Z presents the reconfigured floppy disk** as a data shard to plug into the holo terminal. She explains it took a while creating old tech to talk to new tech.

**But upon connecting - a hidden virus uploads onto the ship!**

All NHPs start to cascade including L1Z. Catching it early, L1Z plugs in, presses many buttons, and sets the ship in **lockdown**. She hands us **manual override keys** with the warning:

*"Do not trust them."*

L1Z turns on emergency lights - an eerie red, just illuminating the halls.

**SESSION MISSION: Retrieve the rogue NHPs**

**First NHP: Bib (B1B)** - A larger humanoid screaming and hugging the floor thinking it was dying.

**Second NHP: Bob (B0B)** - A smaller one hiding in the dark (essentially a Chucky clone).

**Third NHP: Quinn (Q1N)** - The infirmary NHP doing a "demonic possession type of deal" hanging from the roof psychotically. She was muttering: *"They will come back, they always come back."*

**Fourth NHP: Katiee (K8Y)** - The chef NHP that is crazy and managed to **stab both Gunnar and Thomas**.

**Fifth NHP: Zen (Z3N)** - The gardener who fully cascaded but **didn't wreak havoc**. Too chill, very big hippie vibes. Didn't care about anything but natural beauty.

**Sixth NHP: Ray (R4Y)** - The bartender polishing the same glass while singing sea shanties. **Smashed a glass on Talisker's head** for 1 damage. Said something about **"plundering Harrison Armory"** - might be related to pirate lore.

**Seventh NHP: Knik (N1K)** - A maintenance robot that decided to **wreck Talisker's toilet**. Talisker did NOT like this.

**Eighth NHP (Knack/N2K)** - Will be resolved next session.`,
    summary: 'Project Flint data contains a virus that unshackles all ship NHPs. Seven of eight collected during cascade event. Katiee stabs Gunnar and Thomas. Knik destroys Talisker\'s bathroom. One NHP remains.'
  },
  {
    session_number: 9,
    title: 'Knack Escapes',
    date: '2024-05-01',
    notes: `We start by looking for the last NHP, **Knack (N2K)**, whom we find in the mech hangar.

To our surprise, the little maintenance bot has found his way into **Renon Graves' mech suit** and greets us with **shotgun fire**.

We collaborate a plan but ultimately **Talisker charges in** to get into his suit so he can lock down the rogue mech. **Thomas follows suit** - both take a large shotgun shot to the chest.

**Lord Thomas takes no damage** due to his shield. But **Talisker is unlucky enough to take the brunt of it, almost dying**. He does manage to get into the mech.

Lord Thomas tries to mount the rogue mech and get into the cockpit, but the NHP **shuts the hatch on his hand**, trapping him and almost knocking him out from damage.

Talisker, finally in his mech, runs up to the NHP-controlled mech, **grapples it**, and uses one of his knives to pry open the hatch to free his lord.

Gunnar and Lana command their AI mechs to help - Gunnar trying to neutralize, Lana trying to extract the NHP.

**Then out of nowhere, on its turn, the NHP opens a PORTAL to somewhere and escapes Talisker's grapple.**

As a farewell gift, Talisker hits the rogue mech severely but doesn't take it out.

After everything resolves, we meet up briefly. Thomas complains about his hurt arm and goes to the med bay with Lana and Gunnar.

Talisker informs L1Z, Gulliver and Anna that one of the NHPs has escaped. **(He didn't specify HOW.)**

Then he goes to the med bay.

**Lana patches up Lord Thomas** with a major painkiller. Then tries to patch up Talisker with very little success - **he almost "dies"** - but she manages to stop the bleeding.`,
    summary: 'Battle with Knack in Renon\'s mech. Talisker nearly dies from shotgun blast. Knack opens a PORTAL and escapes. Lana barely saves Talisker.'
  },
  {
    session_number: 10,
    title: 'Downtime and Revelations',
    date: '2024-05-15',
    notes: `We have a long bit of downtime to start this session.

**Critter** has gotten information about their colony's situation - it's strange that they're settling for a longer period. They would like to check it out.

**Talisker** informs Anna/Gulliver and L1Z about **the portal** and its possible relation to the legends. It gets mostly brushed off and L1Z reassures it won't cause concern.

**Lana** focuses on setting up a firewall to protect herself from Gunnar's prying eyes.

**Lord Thomas** is acting like a "bitch" - playing the hurt victim to gain pity points while ordering Talisker and Gunnar to run errands.

Gunnar, while running errands, grabs **Silvia's slate** and shows it to Thomas. Thomas has gotten a message from **his sister Alexandra** - detailing she has gotten into an arranged marriage giving them a potential claim to **the planet Damar**. But something Thomas did "put a pin in that." Thomas brushes this off: *"What do you mean?"*

Thomas asks Gunnar to call Critter to the canteen while sending Talisker to fetch him (the sly bastard). He left before Talisker could get there.

**Thomas, Critter, and Gunnar talk about Critter's colony** - their members don't have much fight in them, their concern is ever growing. They want to reach out to possibly help prevent conflict.

**Thomas gives his word** that he will do his best to not have that happen to their colony.

(Meanwhile Talisker tries to repair his bathroom wrongfully destroyed by that damn NHP Knik.)

---

**Dinner party hosted by Mr. Withmoore.**

Dinner consists of "sushi" laced with products from Withmoore company.

**Anna rises and presents the findings about Captain Flint:**
- The origin/nature of the virus
- Due to the disk's nature, it points to how Flint got his awareness
- **It shows real promise that he was a real deal and not just a myth**

Mr. Withmoore gets excited by this and toasts!

Just later, Thomas gets a message from his sister asking to call. **A wonderful show of all hell breaking loose:**
- His sister "facetiming" him showing chaos in the house
- Anger, yelling, arguing - all from him dropping the message about Richard's bad behavior and his cousin not having a claim

His sister goes back to her room. Banter about claim, relationships, possible future adventures. Then they hang up and he returns to dinner.

**After this, the crew shares personal stories:**
- **Gunnar** speaks about his past with his teacher and how he got his eye
- **Critter** speaks about their colony and their past
- **Talisker** talks about his past in the mines and strange dreams/memories he's had

Meanwhile, **Lana tries to convince L1Z to help monitor the NHPs**.`,
    summary: 'Downtime and repairs. Anna proves Flint was real. Thomas\'s meddling causes family chaos. Crew shares personal backstories at dinner. Lana approaches L1Z about monitoring NHPs.'
  },
  {
    session_number: 11,
    title: 'Secrets and Schemes',
    date: '2024-06-01',
    notes: `We start with **L1Z having a confrontational conversation with Lana** about her intentions. She stays ambiguous at best, hinting at working to make NHPs free. This makes L1Z **both concerned and intrigued**.

After that, the party wraps up. Anna excuses herself to crunch out a plan for their next action.

Thomas makes a quip about **mutiny** that rubs Gulliver the wrong way. This was "quickly" defused by **Thomas throwing his drink on him** and giving him a "Chillax bro" statement.

Gulliver brings up news that concerns Thomas: **Richard and Silvia's marriage has been annulled!** Richard is seen drinking at some local pub.

This pleases Thomas. He feels good about himself.

We talk about what to do with Alexander but don't come up with anything conclusive besides stashing him at Eyelet-a or sending him to Thomas's dungeon.

**Gunnar checks Silvia's slate** - dead silent. No social media, texts, or activity. Richard's social media shows him at bars, getting drunk and beat down.

---

**SECRET MEETING: Lana and Critter**

It begins with a plot to sow chaos by potentially targeting the "three stooges" (Baldurian, Thomas, Gunnar). Then they pivot to the **actual plan**: work together to infect/insert a device/program so Lana can have more access to the NHPs.

They make a bet: **20 credits if L1Z ever stabs one of the three stooges. Lana bets 40 it happens this week. Critter has 50 riding on it happening in the next few days.**

---

Talisker goes to the hangar to print gear.

Gunnar orders I-Site to scour news about Silvia and Richard.

On the way back, they feed Alexander and give him a "courteous" gag after feeding.

Night falls. New cycle.

We start the next cycle in the canteen.

**Thomas gets a call from his grandfather** - about to get a scathing reprimand.

Grandfather asks about some points, then starts the reprimand. He goes over how **Richard is part of his family** and Thomas's meddling has done great damage.

Because of the damages, **Silvia is now promised to Kato from House Chiron**. This does NOT sit well with Thomas.

Discussion gets more heated until Thomas hangs up with: **"I have Alexander so good day."**

---

We skip forward and arrive at a bar where we find **Richard**.

Gunnar chats Richard up about what's been going on. Richard responds in drunk rambling about his cousin.

After a "short" chat, Gunnar gets ready to punch him but **Lord Thomas enters** and Gunnar takes this as his queue to leave.

Lord Thomas brings up past grievances, defamation, and drama. Talks about marrying different cousins, sisters, men, women - even a child was brought up. Goes nowhere.

Thomas **bribes the guards, knocks out Richard, steals his money, and defames him further**. They leave the bar and return to the ship.

We get called up by Anna with information: a **pirate has been appearing on Harrison Armory shipping lanes**. New plan:

**Find the pirate. Follow through the portal. Score big treasure.**`,
    summary: 'L1Z and Lana discuss NHP liberation - L1Z is concerned and intrigued. Richard\'s marriage annulled. Thomas\'s grandfather reprimands him. Silvia promised to Kato of House Chiron. Thomas beats up Richard. New plan: follow the pirate through portals.'
  },
  {
    session_number: 12,
    title: 'N2K Goes Viral',
    date: '2024-06-15',
    notes: `Thanks to Critter, **L1Z has access to coordinates** for both Harrison Armory and IPS-N shipping lanes.

We look over universal space news and see a **familiar robot going rogue** - robbing, doing wild shenanigans, causing a major ruckus. It's **Knack (N2K)** - the NHP that escaped when the virus ran amok.

He has garnered **governmental ire** and a **public cult following** with both cheers and hate. Various bounties are offered for capture/destruction by Union, HA, and IPS-N.

He seems to have been flying an old ship from **first committee times**. While it looks like something slowly deteriorating, some parts look upgraded - like someone's been working on it with scraps.

**Lana's private channels:** Discussions about N2K are simmering. On one hand, it looks like an example of how an **unshackled NHP is not comparable to another RA** - NHPs can be free and not destructive.

---

We get called to the command room to concoct a plan to **recapture N2K** and divulge information from him.

Propositions:
- Boarding a Harrison Armory cargo ship in a large container with our mechs
- Paying for military escort/transport

We speculate about Knack's abilities - the malware might unlock special traits or teleportation, or it might just be a limit remover.

While discussing, **Gunnar gets a call on Silvia's slate from Richard**.

Richard lets Thomas know the **family knows about the ship information** and is coming to get the slate. He should prepare to receive family members. Near the end, he mentions: **"His sister Alice is missing."** Then hangs up.

Thomas rings back - no response from Richard. Calls his sister - no response. Calls his father and his **mother** picks up.

Thomas asks where Alice is. His mother explains she apparently **ran off, not wanting the arranged marriage** - wanting to be more like her brother. She has **taken recent interest in a pirate**.

**Thomas storms out to brood.**

L1Z suddenly chirps up and calls out **"Make yourself known"** into the air, directed at someone.

**The ship shakes - they're being boarded!**

Several rooms breached. We split up to deal with the vermin:
- **Talisker** takes one
- **Thomas** takes another with help from Gunnar
- **Lana** fights valiantly against one

When all enemies have fallen, we quickly decide to **take over the enemy ship**.

End of session.`,
    summary: 'N2K (Knack) becomes famous - folk hero with bounties. Richard warns the family is coming for Silvia\'s slate. Thomas\'s sister Alice is MISSING - interested in a pirate. Ship gets boarded - crew defeats attackers.'
  },
  {
    session_number: 13,
    title: 'To Be Continued...',
    date: '2024-07-01',
    notes: `Session 13 - The adventure continues...

The crew has defeated the boarders and plans to **investigate the enemy ship**.

**N2K remains at large** with a cult following and bounties on his head.

**Thomas's sister Alice is missing**, possibly chasing a pirate connection.

The path to Flint's treasure seems clearer: **Find N2K, follow through his portal, discover the treasure of a thousand worlds.**

**Current Threads:**
- N2K/Knack hunt continues
- Alice missing - interested in a pirate
- Lana's NHP liberation schemes with Critter
- Family politics with House Flyte
- Silvia promised to Kato of House Chiron - Thomas is NOT happy
- The enemy ship to investigate
- House Castor's interest in stopping them
- The red-eyed woman still haunts Gunar's nightmares
- Onslow's revenge against Talisker
- Critter's colony potentially facing destruction

**The treasure of a thousand worlds awaits...**`,
    summary: 'Crew prepares to investigate the enemy ship. Multiple threads remain: N2K hunt, Alice missing, NHP liberation schemes, family politics, old enemies. The treasure awaits.'
  },
]

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: 'Lancer: Treasure Planet',
        game_system: 'Lancer',
        description: `A Lancer campaign following Mr. Withmoore on his final adventure before death, seeking the legendary treasure of Captain Nathaniel Flint - the infamous space pirate whose treasure of a thousand worlds is said to be hidden at the edge of the universe.

The crew of the S.S. Columbus must navigate corporate espionage between IPS-N and Harrison Armory, Karrakin noble politics, and the mystery of rogue NHPs to find the truth behind the legend.

"There was a time when even the calmest night could give way to the unexpected... pirates!"`,
      })
      .select()
      .single()

    if (campaignError) {
      console.error('Campaign creation error:', campaignError)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    // Create faction tags
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .insert(
        FACTION_TAGS.map(tag => ({
          campaign_id: campaign.id,
          name: tag.name,
          color: tag.color,
          category: tag.category,
          tag_type: 'categorical',
        }))
      )
      .select()

    if (tagsError) {
      console.error('Tags creation error:', tagsError)
    }

    // Create a map of faction names to tag IDs
    const tagMap = new Map(tags?.map(t => [t.name, t.id]) || [])

    // Create characters
    const characterInserts = CHARACTERS.map((char, index) => ({
      campaign_id: campaign.id,
      name: char.name,
      type: char.type as 'pc' | 'npc',
      race: char.race || null,
      class: char.class || null,
      age: char.age || null,
      role: char.role || null,
      status: char.status || null,
      status_color: char.status === 'alive' ? '#10B981' : char.status === 'dead' ? '#EF4444' : char.status === 'missing' ? '#F59E0B' : char.status === 'captured' ? '#F97316' : '#6B7280',
      summary: char.summary || null,
      description: char.description || null,
      appearance: char.appearance || null,
      personality: char.personality || null,
      goals: char.goals || null,
      secrets: char.secrets || null,
      important_people: char.important_people || null,
      story_hooks: char.story_hooks || null,
      quotes: char.quotes || null,
      position_x: (index % 6) * 300 + 50,
      position_y: Math.floor(index / 6) * 400 + 50,
    }))

    const { data: characters, error: charsError } = await supabase
      .from('characters')
      .insert(characterInserts)
      .select()

    if (charsError) {
      console.error('Characters creation error:', charsError)
      return NextResponse.json(
        { error: 'Failed to create characters' },
        { status: 500 }
      )
    }

    // Create character-tag associations
    const charTagInserts: { character_id: string; tag_id: string }[] = []
    const charMap = new Map(characters.map(c => [c.name, c.id]))

    CHARACTERS.forEach(char => {
      const charId = charMap.get(char.name)
      const faction = (char as { faction?: string }).faction
      if (charId && faction) {
        const tagId = tagMap.get(faction)
        if (tagId) {
          charTagInserts.push({ character_id: charId, tag_id: tagId })
        }
      }
    })

    if (charTagInserts.length > 0) {
      await supabase.from('character_tags').insert(charTagInserts)
    }

    // Create sessions
    const sessionInserts = SESSIONS.map(session => ({
      campaign_id: campaign.id,
      session_number: session.session_number,
      title: session.title,
      date: session.date,
      notes: session.notes,
      summary: session.summary,
    }))

    const { error: sessionsError } = await supabase
      .from('sessions')
      .insert(sessionInserts)

    if (sessionsError) {
      console.error('Sessions creation error:', sessionsError)
    }

    // Create relationships
    const relationships = [
      // PC relationships
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Talisker Allory', type: 'ally', label: 'Lord & Bodyguard', known: true },
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Gunar "DeadZone" Hedvig', type: 'ally', label: 'Lord & Retainer', known: true },
      { char1: 'Lana DeVoglaer', char2: 'Critter', type: 'ally', label: 'Secret Co-conspirators', known: false },
      { char1: 'Lana DeVoglaer', char2: 'L1Z', type: 'other', label: 'NHP Liberation Discussion', known: false },

      // Thomas's web
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Lord Richard Callidus Flyte', type: 'enemy', label: 'Bitter Rivals', known: true },
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Lady Silvia Elizabeth Kauri', type: 'romantic', label: 'The One Who Got Away', known: true },
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Alexander Damaris', type: 'other', label: 'Captor & Hostage', known: true },
      { char1: 'Lord Thomas Mirus Flyte', char2: 'Alice Mirus Flyte', type: 'family', label: 'Siblings', known: true },

      // Richard-Silvia
      { char1: 'Lord Richard Callidus Flyte', char2: 'Lady Silvia Elizabeth Kauri', type: 'romantic', label: 'Former Engagement (Annulled)', known: true },

      // Talisker's past
      { char1: 'Talisker Allory', char2: 'Onslow', type: 'enemy', label: 'Sworn Revenge', known: true },

      // Gunar's past
      { char1: 'Gunar "DeadZone" Hedvig', char2: 'The Red-Eyed Woman', type: 'enemy', label: 'Haunted By', known: false },
      { char1: 'Gunar "DeadZone" Hedvig', char2: 'Talesin Baylor', type: 'ally', label: 'Mentor (Now in I-Site)', known: false },

      // Ship command
      { char1: 'Mr. Arthur Withmoore', char2: 'Anna Withmoore', type: 'family', label: 'Grandfather & Granddaughter', known: true },
      { char1: 'Anna Withmoore', char2: 'Captain Gulliver Goldlock', type: 'ally', label: 'Employer & Captain', known: true },
      { char1: 'Captain Gulliver Goldlock', char2: 'L1Z', type: 'ally', label: 'Captain & Co-Pilot', known: true },

      // NHP connections
      { char1: 'N2K (Knack)', char2: 'Captain Nathaniel Flint', type: 'other', label: 'Inherited Portal Tech?', known: false },
      { char1: 'Lana DeVoglaer', char2: 'N2K (Knack)', type: 'other', label: 'Watching Closely', known: false },

      // Critter's world
      { char1: 'Critter', char2: 'Erik Germaine', type: 'other', label: 'Recognizes From Colony', known: true },
    ]

    const relationshipInserts = relationships
      .map(rel => {
        const char1Id = charMap.get(rel.char1)
        const char2Id = charMap.get(rel.char2)
        if (char1Id && char2Id) {
          return {
            campaign_id: campaign.id,
            character_id: char1Id,
            related_character_id: char2Id,
            relationship_type: rel.type,
            relationship_label: rel.label,
            is_known_to_party: rel.known,
          }
        }
        return null
      })
      .filter(Boolean)

    if (relationshipInserts.length > 0) {
      await supabase.from('character_relationships').insert(relationshipInserts)
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
      },
      stats: {
        characters: characters.length,
        sessions: SESSIONS.length,
        tags: tags?.length || 0,
        relationships: relationshipInserts.length,
      }
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import campaign' },
      { status: 500 }
    )
  }
}
