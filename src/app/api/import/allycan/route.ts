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

// All character data with full details from player documents
const CHARACTERS = [
  // Party - PCs with full backstories
  {
    name: 'Esther',
    type: 'pc',
    race: 'Human',
    class: 'Warlock',
    status: 'alive',
    summary: 'A medium who can hear the voices of the dead, raised by violent raiders.',
    faction: 'The Party',
    personality: 'Resourceful and street-smart, having survived a harsh upbringing with the Ivory Reavers. Can communicate with spirits and the dead.',
    goals: 'Seeking to understand her powers and break free from her past with the raiders.',
    important_people: [
      { name: 'Crystal', relationship: 'Adoptive mother', notes: 'Co-leader of the Ivory Reavers' },
      { name: 'Urza', relationship: 'Adoptive father', notes: 'Co-leader of the Ivory Reavers' },
      { name: 'Despater', relationship: 'Patron/Adoptive father', notes: 'Devil who wants her to rule the material plane as a 10th hell' }
    ],
    secrets: 'Despater, her devil patron, crafted the Crown of Command and wants Esther to take it and control the material plane in his name.'
  },
  {
    name: 'Faust Blackwood',
    type: 'pc',
    race: 'Human',
    class: 'Way of Mercy Monk',
    age: 25,
    status: 'alive',
    summary: 'The Revenant Doctor - a healer with a dark past, raised by Darketh after his family was killed.',
    faction: 'The Party',
    appearance: `Stands six foot three with an impressive physique. A shirt of black fabric lies partially open at the chest with long sleeves rolled up across forearms decorated with intricate tattoos and a plethora of wristlets and bands. Handsome visage with sharp features and vibrant, meadow green eyes that seem entirely too intense. His crimson hair falls sleek and smooth across his broad back to his waist, beneath a bandana of white and pale pinks. Carries an easy smile and wise eyes. Features are notably noble in shape though diminished by the constant smile and almost lazy warmth.`,
    personality: `At the heart of all things, Faust is a kind man who wants to make friends and keep as many people safe as he can. After living a youth of desperation and poverty and witnessing the poor and meek die and suffer whilst the powerful and rich turned a blind eye, Faust grew to operate on a karmic scale. He believes everyone deserves a chance to prove themselves worth respecting or aiding. However, beneath the surface lies a darker side - dangerously capable and willing to do what must be done.`,
    goals: 'To heal those in need while uncovering the truth about his noble heritage. Recently discovered he is the true king - the last living person with royal blood.',
    important_people: [
      { name: 'Darketh Rothwell', relationship: 'Adoptive father/Mentor', notes: 'Raised Faust as his own after his family was killed' },
      { name: 'Jayce Killigan', relationship: 'Complex', notes: 'Was supposed to kill Faust but let him go' },
      { name: 'Emily', relationship: 'Ally', notes: 'Runs a refugee camp in Chico, Faust now helps there' }
    ],
    secrets: 'Faust is the true king of Obeon - the last living person with royal blood. The Burlington family has always known and stood by his family through generations as the royal family\'s most trusted advisors.'
  },
  {
    name: 'Ilviana Gloam',
    type: 'pc',
    race: 'Undead/Revenant',
    class: 'Rogue/Spy',
    status: 'alive',
    summary: 'Former spy for the Cappera family who was killed and came back, seeking answers at Allycan.',
    faction: 'The Party',
    personality: 'Cautious and observant, shaped by years of espionage work. Struggles with her undead nature and the whispering voices she hears.',
    description: `Ilviana worked hard for her family as they struggled to keep money on the table. She grew up with good money and was always happy until her father rushed home one day and left with his bags packed. Her mother slipped into psychosis. As the oldest child, Ilviana took charge and was offered a job with the Cappera family - becoming a spy for 4 and a half years.

She was assigned to track down an enemy spy who told her "The Cappera family isn't who you think they are. Have you looked into their exports?" Following this lead, she snuck into their records room but was caught and brought before a powerful spellcaster. She awoke in a shallow grave, gasping for life, with no memory aside from the cold, the darkness and the need to find herself again.`,
    goals: 'To discover what the Cappera family is hiding and why her father was involved. To understand what happened to her and why she came back.',
    important_people: [
      { name: 'Valeric Gloam', relationship: 'Brother', notes: 'Now sells the family drugs after losing his hand as a blacksmith apprentice' },
      { name: 'Frederick', relationship: 'Former colleague/Betrayer', notes: 'Another spy, connected to Scooter\'s family' },
      { name: 'Ki-Ev Cappera', relationship: 'Former employer', notes: 'Head of the Cappera family' }
    ],
    secrets: 'Her family is connected to the drug trade - the Gloam family develops drugs from corpses. She was killed by the Cappera family when she got too close to the truth.'
  },
  {
    name: 'Torik Allycan',
    type: 'pc',
    race: 'Half-Human/Half-Orc',
    class: 'Barbarian',
    status: 'alive',
    summary: 'Son of Gerold Allycan, nephew of the wealthy Roderick Allycan, can grow massive when raging.',
    faction: 'The Party',
    personality: 'Strong and protective, deeply loyal to family. Has giant ancestry through his great-great-grandfather.',
    goals: 'To honor his family name and protect his remaining family after his village was attacked and his mother and youngest brother were killed.',
    important_people: [
      { name: 'Gerold Allycan', relationship: 'Father', notes: 'Lives with a northern tribe, has giant ancestry' },
      { name: 'Roderick Allycan', relationship: 'Uncle', notes: 'Richest man in Rovenia, runs the academies' },
      { name: 'Betar', relationship: 'Brother', notes: 'Was found being sold at the black market, now travels with the party' },
      { name: 'Arthur', relationship: 'Family friend/Protector', notes: 'Old adventuring companion of Gerold, sent to watch over Torik' }
    ],
    secrets: 'His village was specifically targeted by people in ivory white masks (Ivory Reavers) who went for his family first.'
  },
  {
    name: 'Wolfgang Runecarver',
    type: 'pc',
    race: 'Dwarf',
    class: 'Runecarver',
    status: 'alive',
    summary: 'A dwarven runecarver searching for Giants and his lost dwarven kin. His parents are enslaved by the Crown of Command.',
    faction: 'The Party',
    personality: 'Stoic and determined, deeply connected to dwarven traditions and rune magic. Fiercely protective of those he cares about.',
    goals: 'To find his lost dwarven kin and free his parents from the Crown of Command\'s control.',
    important_people: [
      { name: 'Wolfgang\'s Parents', relationship: 'Parents', notes: 'Enslaved by the Crown of Command, slip into coma when the eyedrops stop working' }
    ],
    secrets: 'The devil Disarray gestured that his parents were dead, though they are actually enslaved by the Crown of Command.'
  },
  {
    name: 'Ravyn Ha\'an-Vodusas',
    type: 'pc',
    race: 'Zariel-lineage Tiefling',
    class: 'Paladin (Crown Oath)',
    age: 21,
    status: 'alive',
    summary: 'Last survivor of a tyrannical house that descended from Zariel, raised by the paladin who helped overthrow her family.',
    faction: 'The Party',
    description: `The House Ha'an-Vodusas descended from Zariel. They were the lords of the region, at first promising protection from the hellspawns to lure the locals into submission. After 300 years of reign of terror, enslaving and killing thousands, the abused people rose against them. The battle was long and hard-fought, but eventually, they were defeated.

The paladin Landon, leader of the insurrection group, insisted on sparing the children - Ravyn and her younger brother Drago. While awaiting their execution, Ravyn and Drago were taken away. This was the last time Ravyn would ever see her brother. Landon decided to raise Ravyn as his own.`,
    personality: 'Kind-hearted and soft-mannered, with bright eyes and great hope for the future. Constantly battles the animosity she faces due to her heritage. Strives to protect the innocent and uphold justice.',
    goals: 'To find and destroy the Crown of Command - a demonic artifact linked to her family\'s past. To find her lost brother Drago.',
    important_people: [
      { name: 'Landon', relationship: 'Adoptive father', notes: 'Leader of the rebellion against Ha\'an-Vodusas, now on the council of Solaria' },
      { name: 'Drago', relationship: 'Lost brother', notes: 'Taken away during the insurrection, now rules Eggmond with the Crown of Command' },
      { name: 'Lord Caphar', relationship: 'Biological father', notes: 'Patriarch of Ha\'an-Vodusas, executed' },
      { name: 'Lady Imga', relationship: 'Biological mother', notes: 'Cold and cunning, executed' }
    ],
    secrets: 'Her brother Drago is alive and rules Eggmond using the Crown of Command. The Paladins from Solaria support destroying the Crown and will aid in this quest.'
  },
  {
    name: 'Lynndis "Lynn" Grace',
    type: 'pc',
    race: 'Half-Elf',
    class: 'Unknown',
    status: 'alive',
    summary: 'Also known as Amelia Miriam O\'Malley, daughter of the pirate queen. Connected to the sea goddess Umberlee who took her heart.',
    faction: 'The Party',
    appearance: 'Has a tattoo of her mother\'s symbol on her back (crossed muskets under a skull with a bullet between its teeth). Sleeve tattoo of the seafloor and fish on left arm. Compass rose tattoo on the back of her right hand.',
    personality: 'Resourceful and capable, shaped by a harsh upbringing under her pirate queen mother. Carries guilt about leaving her younger sister behind.',
    description: `Lynn was born as the eldest daughter to Miranda "Storm Queen" O'Malley and Gareth O'Malley. Miranda had been a minor noble who found her talents lay more in piracy. When Gareth's affair with her was discovered, his family disowned him and he joined her aboard "The Maelstrom". Lynn remembers a time when her mother was gentler, even loving.`,
    goals: 'To rescue her younger sister Sapphira from their mother. To find out what happened during her encounter with the creature that took her voice but gave her new powers and a black pearl in her chest. Ultimately, to stop her mother\'s reign of terror.',
    important_people: [
      { name: 'Miranda "Storm Queen" O\'Malley', relationship: 'Mother', notes: 'Pirate queen, alive and estranged' },
      { name: 'Gareth O\'Malley', relationship: 'Father', notes: 'High Elf, deceased' },
      { name: 'Sapphira O\'Malley', relationship: 'Younger sister (8 years younger)', notes: 'Half-elf, being married to Scooter Burlington' },
      { name: 'Emma Black', relationship: 'Crewmate/Lover', notes: 'Tiefling, complicated relationship' },
      { name: 'Alexander and Lara', relationship: 'Surrogate parents', notes: 'Elderly human couple who lost their son in a pirate raid' },
      { name: 'Umberlee', relationship: 'Connected deity', notes: 'Took Lynn\'s heart so she could walk the earth' }
    ],
    secrets: 'Her grandmother Liriel O\'Malley sits as head of the council of the Elven city Chico. Umberlee demands 10,000 gold to return her heart, and is hunting someone who has become more famous than her on the seas.'
  },
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

// Full session data with actual notes from the campaign document
const SESSIONS = [
  {
    number: 1,
    title: 'Welcome to Allycan Academy',
    summary: 'Each player gets an introduction to the school, how they get there and why.',
    notes: `Each player get an introduction to the school, how they get there and why.

Esther
Been travelling for the past few years, offering your services in the places you've visited
While some sort of safety can be found in the bigger cities, travelling between them and around smaller towns can be very dangerous, it's lawless and filled with monsters, raiders and anything in between, you've been lucky for a long time, but that stopped about 2 weeks ago
Got picked up by slave traders recently between cities

Scene
You had set up a fire in the woods not far from the coastal city Padmal, it'd been a bit chilly and you thought a nice fire would keep you warm on the fall evening, however the light from the fire must have attracted the attention of someone. The next thing you remember is an odd thumb sound and then everything went dark.

You'd woken up to the sound of birds singing, horses neighing and a moving feeling. You open your eyes, but the bright light from the sun has no mercy and reminded you of a terrible headache stemming from a bump in the back of your head. As you look around you see another person, a half-elf woman, sitting no far from you as you collect yourself you realize you're both in a larger cage in the bad of a carriage, drawn by two horses with what looks to be a greenish orc from their back.

There are other people.. 3 more, a human sitting next to the orc and two hooded figures on horses riding behind the carriage.

Looking down at your wrists you notice two gold bands (invest DC12) - fail, they look like odd accessories, Success it is enchanted bands that blocks you from using magic.

About a week passes, and you've come to know that the people who took you are slave traders, they are travelling north as far as you can tell, they've picked up stragglers and unprotected travellers along the way, there's about 7 of you now.

An evening the slave traders have set up camp and you listen in to their conversation which goes a little like: The two women and the slender man to the organ harvester in Onslow, the funny looking man who can't shut up to the brothel in Goset, the two big ones to Eggmont - The Lord Drago Vodusas is looking for more men for his Guard. What about the devil? Another one asks. They all look at you before a third says "She has magic, she stinks of it" - "Oi devil, what can you do?"
They will try get her to tell them about her abiblities, if she refuses they will threaten her with execution at the organ harvester.
They will then land on selling her to the academy
She's taken to the academy and exchanged for gold
She's then washed down and put in new boring clothes, she's branded with the school logo without any form of painredusing spells and then taken to the bedroom quarters

Faust
Back home with Darketh, who brushes off his clothes
He tell him he's mean for something more than just being here
He will tell him "The world is full of evil and it may not always look like what you'd expect. While hell has been bleeding into the material plane for many many years now, evil existed here before then" - He'll look down at the palm of his hands before saying "Somethings brewing Faust, i can feel it"
He hands Faust a sealed letter, i bag of coins and says. Before you go, another thing He leaves for a moment and returns with a wrapped jar-formed package. "It's a very special gift that i believe the school will find very interesting"
Darketh has arranged for a carriage for your travel. He shortly speaks with the driver of the carriage before fishing up a small pouch of powder, he blows the power at the carriage before it sets off and wave to you as the horses start moving
It's a few days travel and small breaks are held inbetween for the horses to drink and relax. You notice that while the carriage is on the move it's like people who passes you don't notice you at all.
You make it safely to Terron, the carriage stops at the village hall where a well dressed woman is awaiting you arrival "You must be Faust? I've received word that we should be expecting you, do you have anything for us?"

Kael
It's been a year of physical therapy and attepmting to wield magic as you family wished for you to learn, however you never really managed to connect with that.
You've been called into the deans office
She's spoken with his father, she looking through some documents at her table, but quickly put them away as he enters, down into a chest that she hastily close (perc DC12) - If succeed he'll notice it contains a larger sum of money and his family crest on the seals on the documents
We need to make something of you, your father has informed us that you're more skilled in the arts of fighting, he mentioned his staff had noticed you'd spend a little too much time at the local tavern and returning a little beat up.
You're starting over this year, no more magic. We've decided that you'll start fresh, but you're clearly ready for more responsibility (insight DC12). -She doesn't believe that he is and he can guess the prefix for the new 1st years would most likely have been Jayce. I believe you should be the prefix for the new 1st years, you'll show them around the school and answer their questions, help them through their time here at the school, while attending their classes with them
He's then asked to go back to his dorm, pack his things and move them into the prefix room in the dorm across the hall.
When he returns to his original dorm, he'll be faced with the rest of his own class and Jayce will chill on his bed with a cocky smirk on his face, he'll ask "Have they finally decided to boot your useless ass or do you get to stay as a janitor?"
If Kael tells him about him be coming prefix, Jayce will get ragely jealous and accuse him of buyin the spot "You rich ass loser, you know that spot belonged to me and you know you don't deserve it" - Maybe they fight?

Ravyn
Its a warm fall morning in Solaria, the city you have called home your whole life
Currently governed by a council of a mix between diplomats, monks and paladins
Solaria has been peacefull for many years and as a seacost city, it has the protection of the water around most of it, making it easier to protect
You're sitting at the dinner table with landon. He looks at you and says "I've taught you a lot, you've grown to be a strong and goodhearted woman. I'm proud to call you my daughter" - "We've been through a lot together, but the time as come for you to venture on to the next mission alone, this is one is something you have to do on your own, since I no longer can leave Solaria - They've offered me a pot on the council and my duties lies here now" - "It's very important you listen carefully now, your family owned a lot of magical items, they managed to collect a lot during their time of raign and one of these items were very crucial, it played a big role in holding control over Solaria for the 300 years. It's called the Crown of Command and it's very dangrous if it falls into the hands of the wrong person.
"Tomorrow we'll set sail for Obeon, I've secured you a spot in Allycans academy for heroes, besides extra training, the academy's library and contrant will be very valuable in your pursuit to find the Crown, I unfortunately don't know where it is and I have no leads, but this will be the best place to start - When you find it, you'll know it's the right crown, you'll be able to feel it."
The next day they set off for the academy located in Terron, it takes about two weeks of sailing and travelling by road, you get a little slowed down when running into hell creatures and bandits on the road, but eventually you make it to terron
She's taken to the village hall where she gets branded infron of a crowd of cheering people with the other rich kids`
  },
  {
    number: 2,
    title: 'First Classes and Introductions',
    summary: 'The students participate in their first lessons which grant them their 1st level feat.',
    notes: `Recap
Last time you all started your adventure getting admitted to Allycan, the school or heroes. On your way there - Esther and Ilviana, you were transported by slave traders who you overheard talking about an organ harvester in Onslow, a Lord Drago Vodusas in Eggmont who seems to be building an army of some sorts.

Kael received more responsibility by the dean, after she'd received a bribe from his dad. He found out his dad had changed his mind about Kaels future after his wife and kids all fell ill and his afraid he might be left with Kael as the only heir - You receive an inspiration point for noticing the money and deciding to return later to investigate.

The students will participate in their first lessons which will grant them their 1st lvl feat.

Fausts Healer feat - lesson
Visit the infirmary where Aelin is, she will go over basic woundcare
vampiregal will drop in and ask for a refill because she's going out later

Kaels Skill expert (Strength) - lesson

Esthers Magic Initiate (Sorcerer) - lesson

Ravyns War caster - lesson`
  },
  {
    number: 3,
    title: 'Teachers Return',
    summary: 'Teachers return from sending off the 3rd year. Val reports strange green lights at the graveyard.',
    notes: `Teachers will have returned from sending off the 3rd year.
At the morning prefix meeting, they'll mention that the slave traders that visited the town recently have been dealt with, as pr. The dean's request. They have also decided to follow one of the leads Ilviana and Esther picked up to Egmont on their own to figure out what The Lord Drago Vodusas is up to, they will report back when they know more.
Val will have returned from her night search and will have informed Aelin about some strange green light around/near the town's church, but it was too close to dawn for her to stop and look. If they look into this, they will find an empty grave at the graveyard and some strange burns around the grave - HOWEVER Mr. James will volunteer to personally have a look while running some errands in town

They will be participating in lessons today, potions with Mr. Finnick and survival with Alistair.

Potion Lesson
Potion of invisibility`
  },
  {
    number: 4,
    title: 'The Garden and Potions',
    summary: 'The team clears pixies from the school garden and attends their first potions lesson.',
    notes: `Recap: Two teachers have returned from sending off the 3rd year students, Mr. Finnick and Miss Leila. At the morning meeting, Kale was informed about the 3rd year's successful taking out the slave traders and their new mission to scout Eggmont. Aelin also mentioned that Val had spotted some suspicious green lights near the old church.

The team spend time taking out pixies to clear the school garden and afterwards went to their first potions lesson with mr. Finnic, Faust managed to make a good invisibility potions as the only one. Ravyn went to talk to the Dean about her brother and what's been going on, she was reassured that they were trying to figure it out and to stay put while they're doing it. The team is starting to come together to investigate Alice's death and the other Kales disappearance/possible death too? They were just seeking out Valerie for help.`
  },
  {
    number: 5,
    title: 'The Plague Spreader',
    summary: 'A sickness spreads in town. The gang discovers the plague spreader at the graveyard.',
    notes: `Recap: The party prepared for another night of interacting with Alice in the room. During the night they heard footsteps and movement outside their doors, but focused on the project ahead they staid put and at midnight Alice appeared outside Kales door again, Esther notified Kale about it and he opened the door for Alice. Unbeknownst to Kales, Alice gently touched his cheek and seemed happy to know he was okay. Ester asked Alice to use Kales's Ouiji board to tell them who was responsible for her death, the Ouiji board contained the names of all teachers and students, but she just shrugged and shook her head, it didn't seem to be as simple as that.

In the morning they noticed a lot of people were missing and Kale was told at the prefix meeting that there was a sickness spreading in town that was very contagious. The gang went down to check it out despite being told not to, but not before breaking into the dean's office a second time to have a look at everyone's files, it seems like the academy has started to collect information about the new student's backgrounds. Here Faust found out that is was the Dark Death that was spreading, a very infectious virus that had been chemically constructed and used as a weapon during wars 1000 of years ago. He knew it was being spread by a zombie-like creature called The Plague Spreader, this was later confirmed by Aelin and Jayce when they ran into them later, they were busy clearing houses and helping the sick. The gang went to help out with houses as well, but went to Ernie and his family's house, they were hit pretty badly, especially the kids, but Faust managed to get them each healthy again, unfortunately, Ernie has passed away due to the virus.

Following a lead, recalling a mention of some green light at the graveyard during yesterday's prefix meeting, they discover that Jonathan Pickles's grave is empty, following his footsteps from the grave, they find him at his and his late wifes house, he was the plague spreader that has been risen, they find him slow dancing with his wife Anne Pickle.

Session:
Combat has been initiated against the plague spreader
Track down the people that have been around Anne (Anne was the one spreading the disease (unknowingly) not the actual plague spreader, he was just staying home, and cure them
When returning back to the school Scooter has gone missing, the dog has been killed and Jayce's sword is left outside
Introduction to the in-between with Miss Leila Pence
When they go to sleep, Illviana will wake up in the middle of the night in the in-between, she will see a feminine-shaped shadow standing next to Fausts bed`
  },
  {
    number: 6,
    title: 'Moose Goes Missing',
    summary: 'The team defeats the plague spreader. Lord Biscuits is found dead and Moose is missing.',
    notes: `Recap: The team fought the plague spreader, sparing the old lady who didn't know what she'd done, they regrouped with the others back at the school. They found Lord Biscuits dead and Moose missing. An investigation was started and they attempted to speak with Alice through a ritual Esther had set up, just to find that Alice wasn't there anymore, but another spirit was, someone watching over Faust. The spirit helped them, she said Alice was with Moose, watching over him and they managed to hear her voice but far away. THe old lady had give a description of the man who had given her the potion to revive her late husband that became the plague spreader, they realised it was all just a play to distract them while the real enemy took moose. Illviana got stuck in the in-between during the ritual Ester had started to ask Alice for help, she was now fighting for her life as spirits were fighting for her body.`
  },
  {
    number: 7,
    title: 'The Wendigo Hunt',
    summary: 'The gang rescues Moose and discovers Mr. James is actually a wendigo.',
    notes: `Recap: Esther managed to end her ritual and free Illviana from the grasp of the spirits. Knowing moose was somewhere underground in the school, they started searching for him. They went from room to room to search for any hidden trapdoors. Jayce went to get moose's dog in an attempt to get it revived by the necromancy teacher Miss Leila. She raised the dead and with the help of Biscuits, Ester, Ravyn and Val managed to distract the teacher James in order to search his office, since Biscuit caught a familiar scent. They found the trapdoor and rescued moose while Faust started chasing down James, who'd attempted to escape while changing into what he really was, a wendingo. Due to Fausts and Illvianas incredible cardio, they managed to keep up with the Wendigo and when it stopped to rest, the rest of the gang caught up and together they took down the wendigo.

They returned to the school with the dead wendigo, went to check up on Moose who was doing a bit better. The gang decided that the next step would be to search the cellar that moose was kept, since they had noticed some belongings of Alive and the other Kale.`
  },
  {
    number: 8,
    title: 'Kale\'s Magic Jar',
    summary: 'They discover Kale used Magic Jar to preserve his soul. Time skip for training.',
    notes: `Recap: They searched the cellar and found items belonging to Kale and Alice. They discovered that Kale had used the spell Magic Jar to preserve his soul, so he wouldn't succumb to death by slowly being eaten by the wendigo. They also learned more about the wendigo and where it comes from, that its spirit resides in the mountain and it developed from humanoids eating other humanoids, though they are believed to be extinct, people still avoid a mountain pass between Agosa and Goset.

The gang then said farewell to the Kale that they've come to know during their short time at the school and will now leave the school for good to venture on by himself. During a conversation with Kale, wanted to follow his own path and perhaps figure out what had happened to his family and why they were sick, Faust had promised he'd help his sick family, but not follow him on his journey around the country. There will be a timeskip where the gang will be working on a skill/feat with a teacher.

Sessionplan: The gang is going to search the cellar where Moose was held. Here they will find items belonging to both Alice and Kale, though something will stand out a bit. Surrounding a jar containing an amulet on the table, there's a small circle around it written in runes (using an arcana check they'll be able to determine its a Magic Cirkle, but the magic seems to have fated at this time). If they open the jar and touch the amulet they'll have to succeed on a DC14 Charisma savingthrow or become possessed by Kale - He managed to protect his soul with the spell "Magic Jar" before being killed by the wendigo.

They can ask him questions, try figure out what to do with him, maybe bring him along or try find a new body for him. He will ask them for help to continue living.

The gang will be able to take a long rest, Aelin will be able to help regenerate Moose's arm and they'll get some time to calm down and relax.
They will lvl up to 3.

The dean will talk to them over dinner and apologise for the hectic start to their "education" and thank them for not only finding Moose, but reaching out to the teachers for help in a difficult situation - Asking for help can be difficult but working together makes us stronger.
Figure out a lesson plan with some lessons.`
  },
  {
    number: 9,
    title: 'The Ivory Reavers',
    summary: 'After months of training, three masked individuals from Esther\'s old clan appear looking for her.',
    notes: `Recap: There had been little to no trouble over the past few months, the team had spend the time training and practising new skills and gotten a better relationship with some of the Academy's residents. At the breakfast-table, it was announced that Jayce was going to take over the spot at prefix for the 1st years, moving in to the bedroom with them, this upset Moose because he didn't want Jayce the leave their sleeping quarters, so he blew up a stinkbomb inside the 2nd years sleeping quarters. It was mentioned at the table that 3 masked individuals were causing trouble at the local tavern. The gang went down to investigate and found it to be Esthers old clan, they were looking for her. The gang fought them, they were very strong. THe managed to kill two and capture one, attempting to interrogate him, but he was made of rougher material than they thought and didnt get anything out of him before Aelin ended his life, not liking what they were doing to him.

Sessionplan: We're skipping forward in time, every person get's to learn a new skill and get to know a teacher or student a little better.

Faust: Learning Fey Touched (Misty step) with Val and spending time with Al fighting monsters.

Alistairs speech:
"Listen closely you two. There's a big difference between fighting people and fighting monsters. Monsters are predictable. They hunt, they kill, but they're driven by instinct, hunger, or territory. People, though... they're driven by fear, ambition.desperation. They think, they plot, and they'll stab you in the back when you least expect it. Monsters may tear at your flesh, but people can tear at your soul. Never forget: the most dangerous creatures you'll face are those who wear a smile."

Val - Shared how she got to the school. As a young adult, she'd made a deal with Castiel the Vampire lord of Rovenia and he'd turned her. Years later, still merely a vampire-spawn she'd grown tired of the leash that came with her powers "condition". She got in contact with Mr. Allycan, the most influential and powerful man in Rovenia, in exchange for his help in killing Castiel, allowing her to deal the final blow, she'd serve him, do his bidding and he had agreed to the deal. Val was enrolled at the Academy where she'd stay whenever Allycan didn't need her.

Illviana: Learning Shadow Touched with Leila Pence
Leila will draw a magic tattoo on Illviana, infused with magic, when she casts invisibility on herself, she can extend the invisibility to ONE other creature as long as she touches them.
Spending time with Leila you learn that she was born with a gift, the gift to step into the inbetween, she'd done it subconsciously when she was sleeping as a child, it was a gift that went down through the women in her family, though she hadn't stepped a foot into the inbetween for many years, which Is why, when a position opened up here for someone who possessed skills within dark magic, she took it. She was from a prominent family in Chico, who'd been drafted into Allycans academy in the same city. She'd thrived and set out with a small team herself in their third year, where they'd visited an orpheage outside Automvale which was played by what the children called "The Boogeiman", it turned out to be a very powerful and vengeful spirit, killing the kids one by one. She'd stepped into the inbetween to get a better look at him, brining with her two of the others students. She was the only one who got back out.. Since that day, he seemed to have followed her, she'd hear him at night.. It took her a while but she managed to create an item that allowed her to be invisible to the lost souls of the inbetween, as long as she stayed out of it. She later moved up north to terron, to make sure he wouldn't just find her by accident.

Ravyn: Learning to better channel her devine sense, so she will always know if theres an undead within 20 ft. with Leila Pence and receiving The Slasher feat while working with Alistair

Esther: Learning the actor skill with the Dean.

Brea - The dean has taken a liking to Esther and was happy when she had asked for help working on her edcieving skills. Esther reminded her of herself, during their time together over the next few months, Esther learned that Brea (the dean) grew up in poverty and was caught stealing food for her younger siblings, which landed her in the Dark Warden program also established by Mr. Allycan. Here she spend years, serving as protector and rising in ranks over the years. She spend time getting into the politics of the place, later sitting in cousilmeeting with Mr. Allycan himself and established a good relationship with him. She mentions the male dominated environment and that raising up in rank as a female wasnt easy, what she never directly tell you, but you understand, is that sometimes when the odds are against you, you might need to create better odds for yourself. You get an understanding that Breas intentions are good, she had nothing and understand hoe that feels, she dreams of a better world for the family she was taken from when sendt to the Dark Wardens program, she want's a better world for the kid she once was.
She will receive an advanced forgery kit, it wil hold seals from powerful familys around these parts of the country, examples of leaders signatures, it holds information about the houses, the rich and powerful, when rolling checks related to information about powerful people, you can ask to roll with advantage

The people be it teacher or students, that you have worked with, you'll have gotten a better relationship with them during your time together, they will now be more likely to help you with favors or anything you might need in the future.`
  },
  {
    number: 10,
    title: 'Mr. Rodrick Allycan Visits',
    summary: 'The gang meets Roderick Allycan and learns about Kale\'s enslaved sibling.',
    notes: `Recap: The gang returns to the academy, where they start asking Jayce questions about his past in the raiders clan, where he tells them about how he got out of the clan. They were introduced to Mr. Rodrick Allycan and his entourage, he also brought with him Kales father and sister, whos mind has been enslaved by the crown of command and is now comatosed.

Kale's sibling will be delivered to the school by his father an mr. Allycan, they'll have a magical binding around the head, a light green magical headband of thorns. They're very thin and sickly, despite the eyes being open and occasionally blinking, they're unresponsive.`
  },
  {
    number: 11,
    title: 'Journey to Chico',
    summary: 'The gang prepares to travel to Chico\'s grand library. Torik joins the party.',
    notes: `Recap: Against the Deans better will, the gang prepares to leave the academy to retrieve a book of magical decies and curses, which is located in the grand library of Chico, the elven city.

Before setting of, a large human man, similar in looks to Rodrick Allycan and a young halforc man who bore simlair astetics to them appreaed outside the academy. They made a quick introduction and found out that the halforc Torik would be joining them on their trip and later enroll into the academy.

The party left the academy and decided to take the shorter route through the dark forrest and save a few days travel, even though it would be the more dangerous choice. When they reached the forest, a handful of unprofessional bandits were waiting for travellers to rob and the gang absolutly demolished them, though just before the fight started Faust mysteriously fell unconscious, luckly Jayce was there to make sure he was safe and got him back into the wagon.

Not concerned about what had just befell Faust, the gang continued their venture into the dark forest, where light never seem to be able to enter, here they started feeling the force of the dark things lurking around and everyone was effected by it. During the nightride Lynn was wokenup by something pulling her leg.

Sessionplan:

Fight breaks out against dark shadow
Tabaxi druid Aldred appears after the fight to`
  },
  {
    number: 12,
    title: 'The Shadow Druids',
    summary: 'The gang makes a deal with shadow druids and arrives at Chico.',
    notes: `Recap: Fought the shadows in the forest, Kavalan the tabaxi druid showed up and made it known the forest was the territory of shadow druids, though he was more generous than most shadowdruids, he offered them to turn around and get out of the forest without consequences or they could do him a favour and he'd open a portal to chico, the destination they're traveling, they'd just need to retrieve some shadowwolfs of his, that'd been trapped.

They agreed and arrived at Chico the elven city, where they quickly found out they were not exactly welcome. They rather quickly managed to find the human Emily, who was very cooperative in handing over the jar of shadowwolfs in exchange for a favour at a later date, nothing that was technically binding though. They learned that she takes a beating in exchange for money for a living.
They retreat to The Jolly Dwarf Inn, where they prepare for the evening's activities and relaxation.`
  },
  {
    number: 13,
    title: 'Night in Chico',
    summary: 'Everyone pursues their own agenda. Faust gets in trouble with guards.',
    notes: `Recap: Everyone has an agenda for the evening/night.
Esther goes to the market and steals money from one of the vendors.
Lynn and Torik had gotten a list of some of Emily's clients and in order to earn some gold, they visited one of the richer ones on the list and managed to earn 250g from getting Torik beaten up. They also discovered there were other drugs circulating the city besides Breeze which Emily introduced them to. The client took a green glowing liquid and went bananas.
Faust went out to rob another one of Emily's clients, unfortunately, it didn't go very well and he ended up in some trouble with some guards and beat up Jolene (the client) very badly.
After the night was over and everyone woke up in the morning, they met for breakfast and Emily paid them a visit, already drunk, she had a wanted poster of Faust. The team started arguing about what Faust had been up to during the night and it ended up with Faust walking out on the team. Jayce reminded the team why they were there and they had a job to do.

OBS. Faust will leave the party and Josh will make a new character.

What happens to Faust from here?
The sharp, unpleasant smell of blood and alcohol reaches Faust's nose before Emily's voice does.
"Faust, hold up a minute."
She's half-limping after him in what should probably be a jog, though it's more awkward than anything else, almost painful to watch. Her smile doesn't quite hide her struggle. She doesn't have far to go, but by the time she reaches him, a thin streak of blood is trickling from her nose and ear, and she's gasping for breath.
"You... should..." She grabs his arm to stop him, coughing a few times as she tries to catch her breath. Finally, she steadies herself and continues, "You should come to my lair."
Despite Faust's serious, mission-driven expression, her mild smile is disarming, as though there's no urgency at all. "Please, I think you'll like it. I promise," she adds, hooking her arm into his and gently leading him forward. The school, the team, the guards everything else can wait a minute. Intrigued by her offer, he follows.
After a while, they reach the outskirts of the city, not far from where they had arrived through the portal just the day before. Emily stops at the base of a cliff wall overgrown with ivy that cascades like a green waterfall. She releases Faust's arm and steps closer, brushing aside the leafy vines. Her fingers search the stone surface until "Aha!" she exclaims, finding what she was looking for.
Faust hears a faint click as a hidden section of the wall shifts aside, revealing a narrow entrance. Emily grabs his hand and pulls him through just as the wall slides shut behind them.
"We're almost there," Emily says, her voice tinged with excitement. Then, in a hushed tone, she adds, "But we need to be quiet now."
Still holding his hand, she pauses in the darkness. After a minute or two, the tunnel ahead begins to glow faintly as tiny, dim lights emerge all around them, dotting the walls like stars in the night sky. Emily glances at Faust and playfully wiggles her fingers, indicating that the lights are worms. She presses a finger to her lips, signaling him to stay silent, before letting go of his hand and moving forward.
It takes about ten minutes of quiet walking before the tunnel opens into a vast cavern. The scene that greets them is striking: a bustling refugee camp spread across the cave. People of all races, genders, and ages fill the space, with makeshift tents and small camps scattered throughout. Children dart between the tents, playing.
"Welcome to my lair," Emily says with a flourish, stretching her arms out in a triumphant "ta-da" motion.
"It's a refugee camp," she explains. "I started it when Chico began turning away refugees from the nearby towns and villages a few years ago. We're at capacity right now, but we're doing our best to integrate as many as we can into the city faking citizen cards, finding them jobs, places to live... you know, the basics."
She smiles, resting her hands on her hips. "You mentioned the other day you were a doctor. Over here, we've set up a small area for the sick and injured."
She gestures for him to follow her, and they make their way toward a corner of the cavern.
As they walk, Faust takes in the scale of the operation. There must be over a hundred people in the cave, if not more. Food and water stations are spaced out strategically, and scaffolding has been built to make use of the cavern's height, creating additional sleeping areas and storage.
When they reach the medical area, Faust sees a cluster of larger tents, each containing a handful of makeshift beds. 12 people occupy them now some injured, others clearly ill.
Emily turns to him, her expression softening. "I don't know if you've made any long-term plans now that you've stepped away from the school and your team, but... we could really use someone like you here, Faust."`
  },
  {
    number: 14,
    title: 'Gloam\'s Drugs',
    summary: 'Information about the Gloam family\'s drug operation.',
    notes: `Recap:


Gloam's Drugs

Breeze - Blue glowing fluid
Brute - Green glowing fluid`
  },
  {
    number: 15,
    title: 'The Moonflower',
    summary: 'The gang learns about the moonflower as a possible cure for the Crown of Command.',
    notes: `Recap:
Faust is safe
Delivered shadowwolfs in exchange for magic acorns
Learned that a possible cure to crown of command is the moonflower
Robbed Jolene's house after fighting her, they left her alive.
Planned to visit druids outside Seryl

Whats happening:`
  },
  {
    number: 16,
    title: 'Emily\'s Refugees',
    summary: 'The gang discovers Emily has been helping refugees. Ilviana\'s past is revealed.',
    notes: `Recap: The gang left Chico, they found a camp outside the city that was being attacked by some lowlife scum trying to take advantage of the weak. After saving the people they discovered that it seems like Emily and some of her companions have been helping refugees for a while, bringing them food and taking in the weak, wounded and very young. It's giving people hope that there might be a place for them there.

They leave for Seryl and everything goes fine while travelling on the bigger roads, they come by other travellers and Dark Wardens. As the sun sets they find a nice place to camp, Torik uses his great survival abilities to find a super good spot, which will help them not get found during the night.

Torik asks about Illvianas past when he discovers that she's some sort of undead, this turns into Esther peering into Illvianas deep thoughts and memories using "detect thoughts" and they basically go through most of illvianas life and discovers what had happened up until know, thought leaving with a lot of questions about her former employee the Cappera family, who Lynn has also had some interactions with. They discover a link between the popular drugs and Illvianas family, they also discover a link between another spy Frederick and Scooters family, leaving them with more questions than answers.

Session Plan:
Esther is looking into Lynns Dad's family the O'malleys (!!!)
Prepare encounter Imp's depending on how they roll during the night watches
It will rain (Or be a full moon) during the night and Lynn will feel a connection to another being, in her dream she will be seeing through the eyes of the creature that'll be coming up to kill and feed on innocent people
They will reach the druid settlement outside seryl

Information for Esther:
O'Malleys own a large distillery in Rovenia, earns money through sales of alcohol, mainly whisky
A picture of a group of young teenagers outside Aubourn school for young men in their school uniform (it's a library in Rovenia today). Some of them bares resembles to men she's seen before.
Behind that pictures is a more silly one of 5 of the young teens in their school uniform and on the backside it says: A.Illska, P. Burlington, R. Allycan, G. Allycan, G. O'malley. The pictures has a few spots of what looks to be very old blood on it.`
  },
  {
    number: 17,
    title: 'The Druid Camp',
    summary: 'The gang reaches the druid settlement and receives items to help with the Crown of Command.',
    notes: `Recap: At the campsite, Esther looks through her little chest of information about the rich and powerful houses. She finds out that O'malley is more known for their distillery and sales of alcohol, mainly whiskey. She also finds a picture of a group of young teenagers outside Aubourn school for young men in their school uniform (it's a library in Rovenia today). Some of them bares resembles to men she's seen before. And Behind that pictures is a more silly one of 5 of the young teens in their school uniform and on the backside it says: A.Illska, P. Burlington, R. Allycan, G. Allycan, G. O'malley. The pictures has a few spots of what looks to be very old blood on it.

The gang manages to reach the druid camp, but not without the interference of imps on the way. There a only very few people left there a small handful of old druids and a young water genasi woman called Amber Lee, more interested in living their best life. The druidcamp is underground and magically protected from the outside evil by the magical tree that's growing inside called the Nematon. The druids gives the gang a branch of their tree, which contains some baubles with liquid inside, if they drop a few drops in the eyes of the people with the crow of command, it'll keep away the evil for an hour or two, which will allow them to wake up and eat, perhaps exercise.

They asked Aelin to plant the moonflower that she has so at the next full moon, there'll be more of them.

Torik and Lynn decided to join the old druids in their sweat lodge and Lynn connected to a woman far away that eats the heart of sailors. Or was it just a dream?

Arthurs arrival:
When Arthur was in his late 40s to early 50s, he was offered a small sum of gold to deal with a haunted house on the edge of a village. The house had been disturbing the peace at night, filling the air with strange sounds that terrified the villagers and left them sleepless. Though the payment was meager just a few gold coins it was all the village could spare, and Arthur accepted the task.

Upon arriving at the house, Arthur was surprised to find a young man in his early to mid-20s wandering the property. The man, seemingly oblivious to Arthur's presence, was inspecting the area with a magnifying glass, collecting small samples of debris and muttering to himself. Arthur overheard snippets of his words: "Very interesting" The young man, wearing a leather glove with silver fingertips, bent down to pick up some reddish moss, examining it closely.

As Arthur approached, he noticed something unusual a small desk on the second floor of the house slowly being pushed out of a window, though no one appeared to be near it. The desk was directly above the unsuspecting man. Realizing the danger, Arthur sprinted forward and threw himself at the man, pushing him out of the way just before the desk crashed to the ground where they had stood moments before.

The young man, startled but unharmed, introduced himself as Gerold Allycan. He was well-dressed in practical but expensive clothing and explained that he had been traveling through the area when he heard stories about the haunted house. Upon investigating, he discovered an infestation of "hell-moss," a rare and dangerous plant that attracts and traps lost spirits, tormenting them endlessly. The trapped spirits, maddened by the moss's influence, caused the disturbances.

"The only way to stop this," Gerold explained, "is to torch it. Burn it all."

Arthur and Gerold worked together, setting fire to the house and ensuring every trace of the moss was destroyed. It took hours for the building to burn completely, and the screams of the trapped spirits were deafening. By the end, the two men sat near the smoldering remains, sharing a meal and some drink to steady their nerves.

They exchanged stories that night, and over the following year, they traveled together. Arthur taught Gerold how to fight with sword and bow, while Gerold shared his deep knowledge of nature and folklore. Gerold even revealed that he might have giant ancestry his great-great-grandfather, he claimed, was likely a half-giant. His towering height and broad build lent some credibility to the tale.

Their adventures eventually brought them near Goset, where they studied an ancient giant city and dealt with a wendigo or two. However, their partnership came to an end when Gerold fell in love with a half-orc woman and decided to settle down. It wasn't the kind of life Arthur could see for himself, so he bid Gerold farewell.

Arthur visited a few times over the years, meeting Gerold's first child, a baby boy named Torik. However, life kept him busy, and his visits became less frequent.

Years later, Arthur's journey brought him to Terron. While staying at an inn for the night, he recognized an old friend sitting at the bar Gerold. It was a sight for sore eyes, and they shared drinks, just as they had many years ago. Gerold told Arthur about his family: he now had two more sons, Garn and Betar, in addition to Torik, who had grown into a strong young man. Gerold also mentioned his brother, Rodrick, who had been urging him to return to Rovenia to take a seat on the council. However, Gerold had little interest in politics, preferring his life of study and adventure. He had come to Terron to help with a vampire problem, given his prior research into such creatures.

"Rodrick also convinced me to enroll Torik in his academy program," Gerold explained. "I wasn't sure at first, but Torik seemed to like the idea"

Then, Gerold leaned in with a request. "I've got a job for you well, more of a paid favor. Torik is traveling without me for the first time, and while I'm sure the other young people in his group are good-hearted, they're strangers to me. I'd sleep better at night knowing you escorted them home. They left a few days ago, so if they've stayed on track, they should be heading back about now."

Gerold provided Arthur with details of Torik's mission and what was at stake. He also gave Arthur a sending stone to stay in contact.

Arthur set off in pursuit, but after two days of travel, he received an update through the sending stone. Torik's group had been in contact with Aelin, a student at the academy, and had reached an old druid settlement near Seryl. Arthur had heard of the place before but had never visited. He took a long detour from the main road and arrived by morning.

When he reached the settlement, Arthur found himself standing before what looked like a doorway to an underground town. He sat down on the stone steps, preparing himself for what might come next.


Session Plan:
The party will get ready to leave the druid camp to return to the academy, here they will meet Arthur outside.
The Druids will ask them to clear out a storage closet, just to throw it outside the hut, there will be:
Bracers of Defense
Cloak of Elvenkind
Rod of the Pact Keeper +1
Headband of intellect
Broom of flying
OBS. Lynn won't wake up - Shorty write about Lynns experience watching through the eyes of umberlee
TRavelling back towards the academy they will encounter a pack of hellhounds`
  },
  {
    number: 18,
    title: 'Arthur Joins',
    summary: 'The party meets Arthur, sent by Gerold Allycan. They encounter hellhounds.',
    notes: `Recap: The party leaves the druid settlement, but as they step outside they meet Arthur. He introduces himself to the party and tells them that he was sent by Gerold Allycan, Toriks dad. He's now the new party babysitter and convinced the party that it was worth the danger to take shortcuts to get home quicker, so they did. They fought hellhounds during the day and had a strange visiter during the night.

During their travels they got to know Arthur a little better and he managed to restore some of Jayce's confidence, to everyone else's dismay.

Lynns slumber:
Feeling woozy after the sweat lodge and the strange out-of-body experience, you welcome the soft touch of the pillow against your cheek. It's a relief, like slipping into an embrace. Your eyes close, and before long, you're lost to the world of dream or so it should have been.

"Hey wake up, girl," a stern voice cuts through the haze.

Your eyes flutter open, and you find yourself seated in front of a mirror. Staring back at you are the piercing, now familiar eyes of the blond woman from before.

"I don't know how you managed to open the connection between us, girl" she says, her tone sharp and commanding. "But let me be very clear, this is no sending stone. You don't open this connection, only I do. Is that understood?" she looks almost angry.

She takes a deep breath, her expression softening into something more controlled. "Now that we've got that settled, let's chat."

Her lips curl into a sly smile as she continues, brushing a hand through her hair. "I saved your life, girl. And by the rules of the sea, that means you owe me a debt. That debt was claimed the moment I acted. You gave me your heart. Your life, in exchange for your heart."

The smile grows wider, shark-like, as her gaze shifts. You follow it and see the lifeless body of a man sprawled on the floor, a gaping hole where his heart once was.

"Walking on land has made hunting much easier," she says with casual amusement. Then, leaning in, her voice drops to something conspiratorial yet threatening. "I have a mission, you see. Someone's been making waves on the seas, getting more famous than me. And that, my little girl, is unacceptable."

She picks up a strand of her hair, twirling it absently as she continues. "Once I've eliminated her, I'll return to the sea. And if you're interested, I'd be willing to trade your heart back for the mere price of 10,000 gold pieces. After all, I'll have no use for it by then other than maybe as a nice snack."

Her grin sharpens, predatory. "The choice is yours, girl. But don't take too long. Time is ticking."

And just like that, the connection between you snaps shut.


Session Plan:
They'll reach the dark forrest
They'll meet Kavalan again, he'll express his impress with their job well done and offer them another task, always free passage through the dark forest and a Blackthorn Stave. He's looking for a special necklace, it's a rare black silver with a pendant of a half moon. This will ring a bell for Esther, Illviana and Jayce, it'll sound a lot like Aelin's necklace - It can do no harm, however it contains very powerful protective magic, if they say no, he'll ask if theres anything he can do to change their minds.
They'll return to the academy for all the chaos`
  },
  {
    number: 19,
    title: 'Valerie Captured',
    summary: 'The party returns to find Val is being held prisoner by the Ivory Reavers.',
    notes: `Recap: The party went through the dark forest where they met Kavalan again, they were offered a very unique staff and free passage through the dark forest in exchange for a special necklace, it's a rare black silver with a pendant of a half moon, which some of the party members recognized as being Aelins necklace.

The party then made it back to the academy, where they found out that Val is still hold prisoner by the Ivory Reevers. They have a heart to heart with Gerold who tells them that Roderick sees it a cheaper to let Val die and deal with the big amount of free vampires than paying 150k gold to the Ivory reevers to release her. Though Gerold and the party deems Val's life more valuable and starts to prepare for a rescue mission.

Introduction of Wolfgang:
Having spent a lot of time by himself, Wolfgang's trip outside his cave was a bit different this time. The forest was suspiciously quiet, no birds chirping, no sound of animals moving through the trees, it was just quiet.

Session prep:
Introducing new character in the forest surrounded by 4 vampires, he'll be hanging from a rod in mid air, holding a child in his other arm, kicking at the vampires as they try jump up to get them. The child will be attempting to hit them with his wooden sword, wanting to protect his home.
Black Claws, rival clan wants to bond with the Ivory Reevers`
  },
  {
    number: 20,
    title: 'Rescuing Valerie',
    summary: 'The party rescues Valerie from the Ivory Reavers without leaving a trace.',
    notes: `Recap: The party sets off from the academy to try save Valerie. On the way through Terron they notice a lot of footsteps including a set of small ones, belonging to a child. They follow the footsteps and arrive at a learning where a small individual is hanging from a stick in the air with a kid, surrounded by vampire spawn looking at them like their snacks.

The party manage to kill the vampire spawns and make their way to the Ivory Reevers camp where they located Valerie. When she asked for Faust, they lied and said he was back at the school in order to get her to go with them. They managed to get her out without any trouble and without getting seen. Even though the clan leaders knew that Leila was not Esther, they did not know who was pretending to be their daughter, the whole party managed to save Val without leaving any trace of them being from the academy.`
  },
  {
    number: 21,
    title: 'Diplomacy in Terron',
    summary: 'The gang helps refugees in Terron. Torik learns his village was attacked.',
    notes: `Recap: The gang went on a diplomacy mission in Terron, to get people together + More people have returned to Terron that left and there is now more people here than there is food. THe gave the refugees food and encouraged them not to steal from the locals, Wolfgang also taught the refugees to hunt and scavenge for food, they established a good rapport and made a good impact on the refugees. Except Esther who beefed with a drow.
Torik was later informed that his village had been attacked and burned down, his family had likely passed away. Then Leilas children appeared, one of them has regressed into a baby because she wished for youth in a cursed wishing well. Turned out that they were Arthur's kids.

Session Plan:
The gang will set off to try find the cursed wishing well
The wishing-well will be just outside onslow`
  },
  {
    number: 22,
    title: 'The Chimera',
    summary: 'The gang fights a Chimera while traveling to find the cursed wishing well.',
    notes: `Recap: The gang sets off to try turn Annika back to her normal self. They travel unbothered but Arthuer hears screaming from a small wooded area nearby. The gang leaves behind Leila, Annika, Atlas and Illviana, to try help the people in need. They face a Chamera and takes it down with ease, though not without losing one of the people in need. Torik tries to suggest that the mother of the decided man, put his ashes in a jar and bring him with them, this was very distressing for both his mother and son, though Esther managed to calm them down. Arthur lent them his horse, so they could continue to Terron.

The continued their travels and made camp around sunset. Torik and Altas got high on mushrooms, while the rest was trying to take turns keeping watch. Torik and Altas made a lot of noise while being high, the noise attracted some zombies, which the gang managed to take down as well, without casualties this time.

They slept free from disturbance after that and the next day managed to make it to the Black Market at the outskirts of Onslow, where Torik found his brother Betar in a cage, for sale at the market.

Session Plan:
Illviana will notice her brother standing at the side of a tent attempting to sell drugs to another person.
Betar will tell them about the attack on their tribe, but he'll tell them that it looked like they were out to kill Torik's family in particular, that they were the target. He will tell them that Toriks mom and little brother is dead and that his brother was sparing outside the house with a friend who was mistaken for him. That the only reason he is alive is because they didn't know who he was.

Later they will go to the local Inn to have something to eat and a place to sleep. Here, a hag will kidnap Annika while Leila is sleeping.`
  },
  {
    number: 23,
    title: 'The Black Market',
    summary: 'Torik finds his brother Betar being sold at the black market. They meet the devil Disarray.',
    notes: `Recap: At the Black Market, Torik spotted his brother in a cage for sale. With excellent slight of hand he managed to knock out the slave trader, release the captives including his brother. Batar told Torik that their villages had been attacked by people in ivory white masks, but they had specifically gone for their family first, he believes the only reason he survived was because his brother was killed right before his friend, who he was sparing with. Betar believed he was mistaken for him. He proceeded to tell Torik that most people from the village had been killed, some had been taken with the purpose of selling, just like he was.

Illviana also ran into family, she met her brother who was selling the family drugs a gig their father had roped him into after he'd lost his hand as a blacksmith apprentice. After Illviana didn't return one day, he left school and tried to get a job to keep food on the table for the rest of the family.

After leaving the market, the party headed to the wishing well and found out it was cursed by Disarray the devil. After saying her name, she appeared in front of them. They talked for a bit and realised they need to find the person who made the first wish. They headed to the tavern where they found a creepy looking dude being almost worshipped by two women. With her charm, Illviana managed to convince him to come outside with her, where they knocked him unconscious and took him to the wishing well. Wolfgang made a good speech and convinced the creep to give up his fake lovers and do the right thing. For some reason the team had called upon Disarray as well, so she attempted to kill the creep so he couldn't lift the curse and she rolled highest on the initiativ-order, so she did.`
  },
  {
    number: 24,
    title: 'Dealing with Disarray',
    summary: 'Arthur chats with the devil about Annika. The party learns about soul coins and hellgates.',
    notes: `Recap: The session starts with Arthur chatting with the devil, Exchanging words and suggesting that he will be back to make a deal regarding Anika

The devil antagonizes the party for a bit and mentions that it knows more than they know
It keeps referring to Esther as Pet.

Which Prompts Esther to Ask a few questions but gets no real answers
The devil then turns to Wolfgang, Whom is on edge and Itching to Rip this devils head of, And Gestures in a way that would indicate that his parents are dead.
Taking a lot of willpower He just leaves whilst maintaining Eye contact

The party then leaves the line of sight of the devil just to rest down hill.

Arthur and Esther walk up to the well just to move the coins around to just so that it would make the job for benny easier
Whilst Leila is doing the ritual to bring back benny to life
After moving the coins about Esther asks Arthur about what he knows about the devil thing and chatting about that Arthur accidentally summoned Desiree.
Quickly disregarding the devil they excuse themselves and just leaves.

---

Benny wakes up, Does the task that he was convinced to do, and picks up the coin. After coming up from the well the curse that Anika is under Vanishes, seemingly undone, and then gets greeted by Torik, Knocking him unconscious.
Some thinking and discussing goes about on how we would handle Benny we "Decided" to send him away and hand him over to some "Black guards?" but as they (Leila and benny) leaves, Esther Kills benny.

The party then leaves to the inn.

Ilviana finds her brother dancing with a girl on a bar, Ale in hand. Ilviana wanders over, Brings her brother along and introduces him to the party.
Wolfgang does not join this conversation (due to thoughts about his parents and possibly friend) instead has an Ale and then turns to bed.

Between embarrassing stories shared at the table, Anika asks Atlas about the soul coins and he slides them over. Question rose regarding why they have the coins and what they are for.
They told the Party* that they are for closing the hell portals/Gates and they are needed for that, Though they also tell us that we need a way to survive the ritual. Their plan was to use the wishing well to obtain immortality but as seen it did not go as planned.
They are working with someone called Emily that seems to be more knowledgeable when it comes to infernal matters.
Some exchange's happen

Anika and Atlas plans to travel to "Chico?" and meet up with this Emily. Atlas asks to look over their notes but Cannot read the notes due to it being Celestial. He marks somethings down on a paper and asks Anika to bring it to Leila.

The party* learns that Atlas charmed Anika into making the wish, This does not go well with Arthur.
Arthur had some dialogue with Leila about the family situation and then heads in.

Session Ends here
The party has Plans to look into the butcher (Most likely hunt and kill)

Session plan:
Leila will talk to Esther about the book in celestial, she'll receive a meditation that'll allow her to understand celestial and she'll tell her about the rituals which needs 3 souls, a demonic item and a strong caster
Illvianas brother will tell them about the butcher, how it's been several people over the years and right now the butcher is Jolene
They're going to try free the people from Torik's village
Jolene will have an amulet that'll turn her into a monster`
  },
  {
    number: 25,
    title: 'The Butcher',
    summary: 'Betar takes an oath. The party learns about hellgate rituals and defeats Jolene the Butcher.',
    notes: `Recap: The party wakes up at the Inn in Onslow. Betar wakes from a dream, where he met the god Chauntea, he took an oath to help close the gates to hell, to allow the world to heal from the hellish horror and aid the true king retake his rightful place on the throne, in exchange Chauntea granted him the powers to help aid in the quest.

Leila spoke with Esther and Illviana, the book in celestial that Annika and Atlas had been given by Emily last time they visited Chico, contained rituals, including how to open and close gates between planes.

To close the gates to hell, they would need to set up a ritual, offering 3 souls (this could be soul coins), an item with a connection to the plane (ie. hellish/devilish item) and a strong caster to site the ritual. Leila made a copy of the book and left it with Esther and Illviana along with her medallion of Celestial (that'll allow the wearer to read and speak celestial).
Leila also revealed that the Academy is a business and when the party is done with their training they will be send out the the higher bidder, with the thought that its an area that needs their help the most, all under the table business, hidden as nobel intentions.

Leila, Atlas and Arthur took off in the morning, to find Emily and begin to try close some of the hellgates around Obeon. Arthur had made a promise to Torik and Betars dad when he arrived at the Academy, to keep Torik safe and make sure he didn't end out in trouble, so when he wanted to follow Leila on the journey he made an agreement with Annika to stay and help them back to the academy safely (trusting Annika a bit more than Atlas).

At the morning table Valeric, Illvianas drugdealer brother, joined them and informed them about who the current Butcher was and how the whole factory worked, including fact that they supply ingredients for the familys drug production.

The gang decided to sneak around the factory and find a good way in to surprise the ghouls and Jolene working there - Jolene had acquired a medallion that could turn her into a monster and upon seeing the party enter, WITH HER JEWLS ON!!! The lost her shit and decided it was time to use her medaleon. Though fighting both ghouls and monster Jolene, they killed them all, almost without a scratch thanks to both Betar and Esthers support, Wolfgang took one for the team and got beat up quite badly, but nothing Esther and Betar couldn't heal.


Session Plan:
The party will be travelling back to the academy
They will run into trouble on the way back, they'll discover an area near terron has reverted back into winter, even though it's summer. They will be forced to fight to make sure the ice devil won't end up in terron

They will arrive at the Academy and find that Scooter is not his usual self, Esther and Ilviana will recognize the necklace Scooter is wearing and realise that he's being controlled by Kale, one of the previous students that fell victim to the wendigo.
Kale will explain Scooters worries and that he doesn't want to get married to someone he doesn't know - Kale will elaborate that he's informed Scooter about why things are like this, why this must go through and that he's agreed to help Scooter through this`
  },
  {
    number: 26,
    title: 'The Ice Devil',
    summary: 'The party defeats an Ice Devil and returns to find Kale has taken over Scooter\'s body.',
    notes: `Recap: After slaying the butcher and closing down the organ harvesting plant, they start travelling back towards Terron with the dozen survivors they have freed, mostly consisting of people from Torik and Betars villages.

When they close in on Terron, they notice that though its summer, the mountain pass is cold and snowy, walking longer into the pass, you could think it's winter. They notice tracks from a big monster and scouts ahead, finding a large Ice Devil and two barbed devils who looks like they're making a home out of the mountain pass, they also seems to be responsible for the winter.

The party takes them down and escorts the survivors safely back to Terron where they help them set up camp amongst the other newcomers to Terron.

They return to the academy and finds out that Kale, one of the Wendigo victims has taken over Scooters body - Scooter found out that he was to be married to a girl of his parents choosing, so he went to Kale for help to get him through it.

The party also found out that some of them has an estimated value in regards to where they'll be "sold off too" when you are done at the academy. Ester had a low est. value, however The Lord of Dis had sent an offer for her to the Academy of 250.000 Gold, the academy hadn't responded.

Session Plan:
They will go to the ball/engagement party
They will discover that Lyndis grandmother is on the council in Chico and that this match will make an incredibly powerful alliance.


They will then portal to Rovenia, where the Burlington manor is, here they'll participate in Scooters engagement party to Lyndis little sister
Here Kale will point out that it's interesting that the party is so small and that the Allycans are not here, he will speculate that they probably haven't been invited`
  },
  {
    number: 27,
    title: 'The Engagement Party',
    summary: 'The party attends Scooter\'s engagement party at the Burlington mansion.',
    notes: `Recap: After getting ready for the engagement party at the academy, they get ready to leave for the Burlington mansion.

The teleport event Fails and we get teleported to 3 bone devils little hang out corner, and we get faced with the choices of fighting, Distracting, hiding. Wolfgang steps up to distract the Fiends while the portal get's fixed. After getting through the portal we arrive at the Burlington Estate. The party enters and gets Acquainted with the people in the ball Toriks does his best to talk up his game, Getting the value up on his estimate Ilviana checks out the dean and some High Elven womans conversation about gaining some additional aid to Chico (the elven city) to which the dean mentions that they don't seem to need more aid from the Allycan's (this is the beginning of a "Power play") Scooter talks a lot of lore to us about the High elven woman and how strange it is that the party is not as "Filled" as we would expected, with many of the allycan's not attending (according to his words) and that it seems like they are doing a power play (they being the Burlington's) to gain more outside power. Betar goes to chat up with the burlington "Duke" and asks to be introduced to the "party", but rather just gestures to the different parties. Then goes to talk about the marriage and that it will do good for everyone especially for a future to come. (got esther checked and man "produced: Good vibes") Betar "prods" the duke for some information and with some assistance of esther we find out the the duke is potentially in on a Coup on the allycans The Duke being "Caught" Tries to mediate and mend relations by talking about people connected to the allycan's (or specifically Torik/Betar) and possible If's and buts Though it doesn't seem like he is actively plotting against the family (Allycan's). After Betar's Convo, with the duke, Said duke goes over to speak with an woman- Ilviana eavesdrops in their conversation to which he essentially confesses to having plans against the allycans and that they need to close the festivities early.

Session Plan:
They will be sneaking around the Burlington estate and listen in to a conversation between Mrs. O'malley and Duke Pete Burlington, they will talk about their plans of uniting the largest cities, overthrow the Allycans and reinstate the true king, so Obeon can return to being the kingdom it used to be - The strong alliance between the families will ensure the elves and commonfolk of Rovenia will be more acceptable of each other.
The Paladins from Solaria stand with the council of Chico and are ready to support the true king, if they will aid them in destroying the crown of command once and for all, putting an end to the last black sheep of the Haan Vonduses family.`
  },
  {
    number: 28,
    title: 'The Conspiracy',
    summary: 'The party discovers plans to restore the kingdom and learns Faust is the true king.',
    notes: `Recap: Our heroes managed to sneak inside and have a look around the mansion after the engagement party had ended, here they found a box with a lot of confidential papers and pictures - They also listened in on a conversation between Mrs. O'malley and Duke Burlington, where he voiced his concern about the Allycan kids perhaps being influenced by their uncle, though he claimed to have a good relationship with Gerold, their dad, he seemed to have a more tense relationship with Rodrick, he also mentioned that they were already working with Leila, Arthur and the kids in closing down hellgates, which is one part of their plan in returning Obeon to the kingdom it once was, another part of that would be placing the true king, the last living person with royal blood. The plan already in works, it was furthermore revealed that they also had gained the support of the Paladins from Solaria.

These particular paladins were the ones that previously had free'd Solaria from enslavement by the crown of command, when Ravyn and Drago were little kids. Ravyn was raised and trained as one of them and later became a Paladin herself, while supporters of the Haan'vondusas family has managed to get Drago and flee with not only him, but also the crown of command.

The party was surprised by some hencement connected to the Drago and his followers, along with them a handful of commoners including Wolfgangs parents. Here they wanted to find the true king, hoping he was there and take anyone who supported him with them, though they didn't get far before the party had put a stop to whatever plan the hencemen had.

Illviana also got a glimpse of an old "friend" from the past, Frederic, who still seemed to be working for the Burlingtons, still unknowing of Frederics betrayal.

The party made a safe return home and brought along the innocent commonfolk, including wolfgangs parents. Wolfgang was reunited with his parents during the wake time, still bound to the crown of command, they'd slip back into a coma when the eyedrops stopped working their magic.

The party also discovered that the true king and last of his family was Faust, that the Burlingtons have always known and seem to have stood by them through generations as the royal family's most trusted advisors. Knowing Faust, the party was skeptic about the whole idea of returning Obeon to the kingdom it once was, unsure if Faust was really fit for the throne.

Session Plan:
3rd years will return, Iroh, Analyse, Filbo`
  },
  {
    number: 29,
    title: 'Roderick\'s Visit',
    summary: 'Roderick visits looking for Gerold. Esther summons her adoptive father Despater.',
    notes: `Recap: Roderick pays a visit to the academy, where he checks in on the Allycan boys, wanting to find out if they know the whereabouts of their dad Gerold, after he'd escaped his prison cell in Rovenin, lading ther due to his irrational actions, outburst and drinking as a result of his declining metal health following the death of his wife and youngest son.

Roderick later reveals to the Dean in a privater conversation, that he'd become aware of a rise of interest in reuniting Obeon as a kingdom, the way it used to be before the gates of hell opened on the material plane over 1000 years ago.

Having build his own little "kingdom", the big city of Rovenia he has no interest in losing his power an status to a king, he was even willing to try strike a deal with Drago who's rouling Eggmond and it's surrounding arrears with the Crown of Command.

After finding out that there is still a blood relative to the royal family alive, it's been uniting people from different larger settlements and races, building bridges between people that hated each other and initially had created their own little countries rule/governed in different ways all over Obeon.
Recently the party had participated in an engagement party between Sapphira O'malley and Scooter Burlington, a match set up by their parents the Pete Burlington, who's family though many generations had served as the right hand of the royal family, currently receding in Rovenia and the grandmother of Sapphira, Liriel O'malley who sits as head of the council of the Elven city Chico in southern Obeon.

Behind the scenes in Chico Emily, Faust, Arthur, Leila and their two kids Annika and Atlas are already working hard trying to locate and close the gates to hell around Obeon.

Esther summoned her estranged adoptive father Despater, who wished for her to rule the material plane as a 10th hell. The Crown of Command was his crafting and he wished for her to take it from the Haan Vondus family and use it to control the material plane in his name.

The very same Crown the party had decided they'd set out to destroy in order to release it's slaves, including several of Kales relatives and Wolfgangs parents.

Session plan:
They are going to set off towards Eggmond`
  },
  {
    number: 30,
    title: 'Journey to Eggmond',
    summary: 'The party heads to Eggmond to confront Drago about the Crown of Command.',
    notes: `You listen in to the meeting from outside the building. The plans on who gets to control what land within Obeon, so on and so forth. Make a perception or investigation check.

You notice that neither Drago or his right hand man seems particularly interested in the meeting, like it doesn't really matter

Then Dragos right hand man interrupts the talk and asks directly "Did you bring what we asked? The girl or a connection to her?"`
  },
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
        description: `The academy for heroes

It's been almost a 1000 years since hell started to bleed into the material plane. It's tough to pinpoint how it all started because when it did it spread like wildfire. Monsters, hells creatures, devils and anything from your worst nightmares started roaming around causing chaos. Death and horror quickly became the new norm, what before was a world flourishing with life was now getting quiet.

The majority of people in the world saw an early end and it was looking very dark for the humanoids inhabiting the world of Aspin, but with time they started to adapt and fight back, building safer settlements around the world and a big contribution to this was Mr.Rodrick Allycan a very rich and powerful human man from the city Rovenia. With his fortune and influence, he created a handful of academies that were designed to train the heroes of the new world, heroes that went on to protect regions of the world that were still somewhat thriving. The heroes from Allycan bring hope to Aspin, hope that maybe someday things could change.

The academy Allycan operates under strict rules and regulations, not much is known about it from the outside. They only take in young adults, it's often well-connected families who get to send their own there, it's people who has made a name for themselves in smaller towns or settlements as fierce or innovative protectors, but sometimes heroes come out from there who can't be pinpointed to an influential family.

Your adventure starts with admission to Allycan - The academy for heroes.`,
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
      const c = char as any
      const { data: charData } = await supabase
        .from('characters')
        .insert({
          campaign_id: campaign.id,
          name: char.name,
          type: char.type,
          race: c.race || null,
          class: c.class || null,
          role: c.role || null,
          age: c.age || null,
          status: c.status || 'alive',
          summary: c.summary || null,
          description: c.description || null,
          appearance: c.appearance || null,
          personality: c.personality || null,
          goals: c.goals || null,
          secrets: c.secrets || null,
          important_people: c.important_people || [],
          position_x: posX,
          position_y: posY,
        })
        .select()
        .single()

      if (charData) {
        characterMap.set(char.name, charData.id)

        // Add faction tag
        const faction = c.faction
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

    // 4. Create sessions with full notes
    const startDate = new Date('2025-03-02')
    for (const session of SESSIONS) {
      const sessionDate = new Date(startDate)
      sessionDate.setDate(startDate.getDate() + ((session.number - 1) * 7))
      // Add some gaps for breaks
      if (session.number >= 6) sessionDate.setDate(sessionDate.getDate() + 7)
      if (session.number >= 13) sessionDate.setDate(sessionDate.getDate() + 7)
      if (session.number >= 21) sessionDate.setDate(sessionDate.getDate() + 14)

      await supabase.from('sessions').insert({
        campaign_id: campaign.id,
        session_number: session.number,
        title: session.title,
        date: sessionDate.toISOString().split('T')[0],
        summary: session.summary,
        notes: session.notes,
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
        sessions: SESSIONS.length,
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
