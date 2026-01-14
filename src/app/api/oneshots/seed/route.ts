import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Pre-formatted one-shot data with cleaned up content
const ONESHOTS_DATA = [
  {
    title: "The Last of Us",
    tagline: "A zombie survival story about hope, sacrifice, and impossible choices",
    genre_tags: ["Survival", "Horror", "Dark Fantasy"],
    game_system: "D&D 5e",
    level: 5,
    player_count_min: 3,
    player_count_max: 5,
    estimated_duration: "4-5 hours",
    introduction: `A few hundred years ago, the nations of Earth were locked in relentless war. Alliances shifted like sand, and it became nearly impossible to tell who was fighting whom or why.

Amid the chaos, a brilliant but reckless scientist from the elven kingdom of Arastrial developed a weapon unlike any other: a chemical agent forged through a fusion of alchemy and forbidden dark magic. It was intended to turn enemy soldiers against one another. But the result was far more devastating.

The weapon transformed its victims into mindless, flesh-hungry creatures driven only by the instinct to feed on the living. Worse still, the affliction spread like wildfire… all it took was a single bite.

It wasn't long before the world was consumed. Civilizations crumbled. Kingdoms fell. The great war ended not with a victor, but with silence... and the dead rising.

Yet even in ruin, life found a way. Survivors adapted, built new communities from the wreckage of the old world. Some settlements grew strong behind barricades of wood, metal, and blood. Others disappeared without a trace.

You are part of one such settlement.

Fewer than a hundred people of different races, ages and genders have banded together over the years, carving out a fragile peace behind spiked walls and heavy gates. Everyone has a role. Everyone contributes. It's the only way to survive.

And today begins like any other: routine patrols, tending crops, repairing the barricades…

Except today something is different…`,
    setting_notes: `This is a post-apocalyptic fantasy setting where a magical plague has turned most of the world's population into zombies. The survivors live in fortified settlements and scavenge for supplies in the dangerous wilderness.`,
    character_creation: `• Level 5
• Official WoTC material only
• Cannot be undead
• Point buy for stats
• One 1st level feat

Think of one thing about your character the others will know about them, from living in the same settlement. This will be presented at the start of the game - could be a quirk, something they like/dislike, a personality trait, etc.`,
    session_plan: `ACT 1: THE ARRIVAL
• A stranger arrives at the settlement on horseback, near death - starving and dehydrated
• A small group of zombies following behind, the horse just fast enough to stay ahead
• He asks for help bringing his family here safely
• Reveals his son is immune to the disease

ACT 2: THE DILEMMA
• The settlement leader's wife wants the child to extract properties that could create a cure
• She's conducted similar experiments before - the immune subject died, but she learned from it
• She believes she could succeed this time
• The party is sent to retrieve the small family

ACT 3: THE JOURNEY
• Fighting zombies along the way
• Encountering other dangers in the wilderness
• Finding the family

ACT 4: THE DECISION
• They must decide if extracting the cure is ethical
• The child's life versus potential salvation for all`,
    twists: `PLAYER SECRETS:
• Two of the players are siblings and children of the settlement leaders
• One of them is immune, but has kept it a secret
• One of the players is related to some of the outsider survivors

These secrets should be assigned before the game and kept hidden from other players until dramatically appropriate moments.`,
    key_npcs: `THE STRANGER - A desperate father who will do anything to save his family. Near death when he arrives.

THE SETTLEMENT LEADER - An elected leader who tries to balance the needs of the community with compassion for individuals.

THE LEADER'S WIFE - A brilliant but ruthless scientist who sees the cure as more important than any single life.

THE IMMUNE CHILD - An innocent caught in the middle of an impossible situation.`,
    handouts: "",
    status: "ready",
  },
  {
    title: "Death Is An Angel",
    tagline: "Escape from a fallen sanctuary in a world overrun by the undead",
    genre_tags: ["Horror", "Survival", "Low Magic"],
    game_system: "D&D 5e",
    level: 5,
    player_count_min: 3,
    player_count_max: 5,
    estimated_duration: "4-5 hours",
    introduction: `You don't quite recall how it all began, but half a century ago, they appeared—quietly at first. It started with just one person falling ill, but nobody knew the cause, so everyone tried their best to provide assistance. One became two, two became four, and before anyone realized it, the situation had rapidly escalated. Zombies were everywhere.

People began turning against those with magical abilities, blaming them for this unnatural affliction. As if the world wasn't already in a dire state, individuals started uniting against magic users, resulting in a surge of lynchings, burnings at the stake, and merciless hunts.

Once upon a time, there existed a world with kings and queens, a diverse blend of races, people, and religions. Today, however, the concept of law holds little meaning. Royalty has lost its significance, while tyrants dominate and govern their own settlements, plunging the world into utter chaos. Magic users are only rumored to still exist.

Every imaginable method of healing has been attempted to cure this disease. Skilled healers, both in the realms of magic and alchemy, eventually realized that it was no ordinary ailment. Only someone possessing immense power could have crafted such a malevolent force. Yet, without understanding its nature or origins, discovering a means to halt its rapid spread proved exceedingly challenging.

Chipwick—a small settlement. Perhaps your birthplace, or a haven you stumbled upon. It was a place of virtue, where the inhabitants were kind-hearted and guided by the principles of former monks, devoted to mutual aid and compassion. It embodied an idyllic society.

But as with all things, nothing lasts forever.

One fateful night, the protective walls shielding the city from the encroaching zombies crumbled, and chaos consumed the once-thriving metropolis. You and a small group of survivors narrowly escaped the ruins of what some—maybe even you—once called home.

Now you're running for your lives.`,
    setting_notes: `LOW-MAGIC WORLD
Not many people are born with or learn magic. Alchemy is the dominant form of "science" in this world. Magic users are persecuted and hunted, blamed for the zombie plague.`,
    character_creation: `• Level 5
• Roll for stats OR use standard array (no rolling first to see if it's bad)
• If you want something nice, you can have one uncommon magic item

Please provide a few bullet points about your character:
• Were you born in Chipwick?
• Were you there when it all started 50 years ago?
• Is one of the people you fled with your family?
• Have you helped keep out the zombies before?
• Have you never seen a zombie?

If you can't think of something, let's chat about it.`,
    session_plan: `ACT 1: FLEEING
• Start with the party (including some NPCs) running from zombies
• Maybe they stop to fight, maybe they run
• Chop's dad (Elias) will have gotten bitten
• He asks Chop to take good care of Betty, his wife
• A random stranger (not from Chipwick) guides them toward "Heavenly"

ACT 2: HEAVENLY
• They arrive at Heavenly settlement and receive a warm welcome at the local tavern
• Nice clean rooms, fresh pajamas, extra blankets, hot meals offered
• The people at the Inn are VERY nice... maybe too nice
• Nimueh will be somewhere watching

ACT 3: THE TRUTH
• The settlement has a dark secret
• The party must uncover what's really happening
• Escape or confront the horror`,
    twists: `• The settlement of Heavenly is not what it seems
• Nimueh has connections to the party that will be revealed
• The "kindness" of the innkeepers masks something sinister
• One of the NPCs who escaped with them has already been infected`,
    key_npcs: `ELIAS (Chop's Dad) - Bitten during the escape, asks his son to care for his wife Betty.

BETTY - Elias's wife, grief-stricken and vulnerable.

THE STRANGER - Guides them to Heavenly, but has his own agenda.

NIMUEH - A mysterious figure watching from the shadows.

THE INNKEEPERS - Suspiciously kind and welcoming.`,
    handouts: "",
    status: "ready",
  },
  {
    title: "Firewatch",
    tagline: "A rules-based horror one-shot inspired by creepypasta",
    genre_tags: ["Horror", "Mystery", "Dark Fantasy"],
    game_system: "D&D 5e",
    level: 5,
    player_count_min: 3,
    player_count_max: 4,
    estimated_duration: "4-5 hours",
    introduction: `Times are tough and you find yourself needing money. Even better would be a longer occupation—however, that's hard to come by these days. For the last month, you've been wandering around and ended up in a rural part of the world. A few days here and there, but now you find yourself in a more gloomy town by the name of Autumnvale.

Glaring over the town noticeboard, you find posters about kittens for sale, a 2-for-1 offer on beer at the local inn, two hikers gone missing in the nearby forest, the town's harvest festival... and much more.

However, in the very top corner of the board is a job posting reading:

"Wanted: Firewatch squad for upcoming summer season. See local law enforcement chief Richard Bailes at his office next to the All The Way Inn."

For one reason or another, this seems like a great opportunity for you, and you find yourself heading straight down to see Chief Bailes…`,
    setting_notes: `This one-shot is inspired by the creepypasta "I Took A Job As A Fire Lookout In The Woods, I Found A Strange Set Of Rules To Follow."

The forest has been touched by shadow druid magic. The party will encounter supernatural elements tied to these dark druids throughout their watch.`,
    character_creation: `• Level 5
• Standard character creation
• Characters should have a reason to need this job
• Consider: Are you local to Autumnvale? Just passing through? Running from something?`,
    session_plan: `ACT 1: THE BRIEFING
• Chief Richard Bailes explains the job
• There's a handbook at the tower
• Allison and her team are in the nearest tower
• An enchanted radio allows communication with Allison's team
• Chief Bailes' son Kaleb will come by to restock food
• Duration: 2 months

THE HIKE
• Chief Bailes takes them to the beginning of the trail
• During the hike, they discover dark omens (Nature/History DC 14 reveals shadow druid connections)
• Passive Perception 14+ gives the feeling of being watched

ACT 2: THE TOWER
• Tower is about 100ft tall with a hut on top of 4 stilts
• Winding staircase leading up
• Outside: small outhouse with bath facilities and a storage unit for food
• Inside: two sets of bunk beds, bookcase with various books, table with a leather-covered handbook and lantern

PATROL TASKS:
• Trail A - Find an abandoned camp (recently set up, no people)
• Trail B - Find underground bunker with: photo of the firetower with 4 people, pot with blue ink, drawings of a woman smiling maniacally
• Trail C - Red fabric tied to bushes leading off-trail to a cave decorated with shadow druid letters spelling "Only in darkness are we strong" (DC 15). Inside: zombies of the previous firewatch team

ACT 3: THE RULES
• Hidden parchment falls from handbook
• Blue ink rules about "The Smiling Lady"
• Party must survive while following (or breaking) the rules`,
    twists: `• The previous firewatch team became zombies—their bodies are in the cave
• Allison's team may not be who they seem on the radio
• The shadow druids have corrupted this forest
• The Smiling Lady is real and hunting`,
    key_npcs: `CHIEF RICHARD BAILES - Local law enforcement, sends the party to the tower. His son Kaleb delivers supplies.

KALEB BAILES - The chief's son who restocks food. May know more than he lets on.

ALLISON - Voice on the enchanted radio. Leader of the team in the nearby tower.

THE SMILING LADY - The supernatural horror that hunts those who break the rules.`,
    handouts: `RULES TO AVOID THE SMILING LADY:

1. If you're wandering the forest after sundown or during a cloudy day and see a smiling lady, turn around and run back to the tower as fast as you can. DON'T LOOK BACK.

2. If you steal, she will find you.

3. If you hear a woman cry, ignore it. Don't go close to it.

4. If you hear scratching on the tower or the hut, turn on all lights and hide under your blanket. She will enter the hut. Hold your breath and she will leave.

5. If the smiling lady is outside the hut looking in through the window, hide under your bed. Don't look her in the eyes.`,
    status: "ready",
  },
  {
    title: "Argent's Rise",
    tagline: "Fallen mercenaries seek redemption in a world touched by dark druidic magic",
    genre_tags: ["Dark Fantasy", "Low Magic", "Mystery"],
    game_system: "D&D 5e",
    level: 5,
    player_count_min: 3,
    player_count_max: 5,
    estimated_duration: "4-5 hours",
    introduction: `Though it's tough to tell from the dark clouds and gentle rainfall, it's early morning. Another cold, quiet night has passed uneventfully.

You sit alone in the hayloft, watching the mist drift past the fields. Below, your friends sleep soundly on the cold barn floor. You've been through worse together. A lot worse.

A year ago, you all shared a successful mercenary business—Argent Mercenaries. Work was steady. The pay was good. You had a home in the nicer parts of the capital, excellent gear, a name people trusted. Jobs ranged from monster hunts to noble escorts, even a few missing persons cases. You were doing well.

Then came the job. The one that changed everything.

A private client offered more gold than you'd ever seen before. The job? Retrieve a family heirloom from the ruins of a monastery deep in the Emerald Mountains. It sounded simple—travel, retrieve, return. Easy money.

But your client had vastly undersold the danger and left out an important detail.

Once inside the ruins, one of you got ahead of yourselves—too fast, too loud. The noise echoed. You all froze.

That's when it appeared. The dragon.

One of you stood their ground and was struck down trying to cover the retreat. Another tried to buy time distracting the dragon, but their efforts faltered, and the ceiling collapsed. You barely made it out, dragging your friend's body behind you.

You got back to the capital, desperate to bring your friend back. You sold the house, the weapons, the good armor—anything to raise enough money for the priest to resurrect them.

And so he did. At the cost of everything you'd built. Even your reputation.

Word of your failure spread fast. Whispers turned to mockery, and soon the noble clients who once begged for your time began to avoid your name like a stain. The golden contracts dried up. The doors you once walked through with pride no longer opened.

And so now... here you are. The edge of nowhere. A rain-soaked village so far from the capital it might as well not exist. Hired to hunt a boar—a damned pig tearing through a farmer's fields—just to earn enough coin to eat.

From dragons to swine.
From silver to mud.`,
    setting_notes: `LOW-MAGIC SETTING
While magic and spellcasters exist, it's not common practice and is even outlawed in some parts of the world.

The world has been touched by shadow druid magic—a dark corruption that twists nature itself.`,
    character_creation: `• Level 5
• Standard array or point buy
• You were all part of Argent Mercenaries
• Consider your role in the group and your relationship with the others
• The dragon encounter should have personal stakes for your character`,
    session_plan: `ACT 1: THE BOAR
• Party is hunting a boar for a farmer—a humiliating job for former renowned mercenaries
• The boar appears at the outskirts of the farm
• Upon inspection: black bark fused into its body, rothbloom vines sprouting from what look like previously deadly wounds
• Nature/Arcana check reveals marks of dark druidic magic

ACT 2: THE SHADOW DRUIDS
• Investigating the corruption leads deeper into the mystery
• The shadow druids have been conducting experiments
• Something bigger is happening in this region

ACT 3: REDEMPTION
• The party discovers a threat that could devastate the area
• A chance to prove themselves again
• Confront the source of the corruption`,
    twists: `• The boar was killed before, but the shadow druid magic brought it back changed
• The private client from the dragon job may have connections to current events
• One of the party members may have a deeper connection to the shadow druids than they realize
• The monastery job wasn't random—the party was set up`,
    key_npcs: `THE FARMER - Hired the party for the embarrassingly simple boar job. May know more about strange happenings in the area.

THE PRIVATE CLIENT - Never seen again after the dragon job. Their true identity and motives remain a mystery.

SHADOW DRUID LEADERSHIP - The source of the dark magic corrupting the land.`,
    handouts: "",
    status: "ready",
  },
]

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // First, ensure genre tags exist
    const { data: existingTags } = await supabase
      .from('oneshot_genre_tags')
      .select('*')
      .eq('user_id', user.id)

    let genreTags = existingTags || []

    // If no tags exist, create defaults
    if (genreTags.length === 0) {
      const defaultTags = [
        { name: 'Horror', color: '#DC2626' },
        { name: 'Mystery', color: '#7C3AED' },
        { name: 'Survival', color: '#059669' },
        { name: 'Comedy', color: '#F59E0B' },
        { name: 'Dark Fantasy', color: '#4B5563' },
        { name: 'Low Magic', color: '#0891B2' },
        { name: 'High Fantasy', color: '#8B5CF6' },
        { name: 'Intrigue', color: '#EC4899' },
      ]

      const { data: newTags } = await supabase
        .from('oneshot_genre_tags')
        .insert(defaultTags.map((tag, index) => ({
          user_id: user.id,
          name: tag.name,
          color: tag.color,
          sort_order: index,
        })))
        .select()

      genreTags = newTags || []
    }

    // Create a map of tag names to IDs
    const tagMap: Record<string, string> = {}
    genreTags.forEach((tag: any) => {
      tagMap[tag.name] = tag.id
    })

    // Insert one-shots
    const insertedOneshots = []
    for (const oneshotData of ONESHOTS_DATA) {
      // Map genre tag names to IDs
      const genreTagIds = oneshotData.genre_tags
        .map(name => tagMap[name])
        .filter(Boolean)

      const { data: oneshot, error: insertError } = await supabase
        .from('oneshots')
        .insert({
          user_id: user.id,
          title: oneshotData.title,
          tagline: oneshotData.tagline,
          image_url: null, // No images for now
          genre_tag_ids: genreTagIds,
          game_system: oneshotData.game_system,
          level: oneshotData.level,
          player_count_min: oneshotData.player_count_min,
          player_count_max: oneshotData.player_count_max,
          estimated_duration: oneshotData.estimated_duration,
          introduction: oneshotData.introduction,
          setting_notes: oneshotData.setting_notes,
          character_creation: oneshotData.character_creation,
          session_plan: oneshotData.session_plan,
          twists: oneshotData.twists,
          key_npcs: oneshotData.key_npcs,
          handouts: oneshotData.handouts,
          status: oneshotData.status,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting oneshot:', oneshotData.title, insertError)
      } else {
        insertedOneshots.push(oneshot)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedOneshots.length} one-shots`,
      oneshots: insertedOneshots,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed one-shots' }, { status: 500 })
  }
}
