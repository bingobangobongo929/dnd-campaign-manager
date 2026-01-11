// Rich demo data showcasing a fully-realized campaign
// Uses real fantasy art and detailed content to demonstrate the app's potential

export const DEMO_CAMPAIGNS = [
  {
    id: 'demo-1',
    name: 'Curse of Strahd',
    game_system: 'D&D 5e',
    description: 'A gothic horror adventure in the mist-shrouded realm of Barovia, where the vampire lord Strahd von Zarovich holds dominion over the land. The party has been trapped in this demiplane of dread and must find a way to defeat the ancient evil that rules here.',
    image_url: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&h=600&fit=crop',
    updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_CHARACTERS = [
  // ═══════════════════════════════════════════════════════════════
  // PLAYER CHARACTERS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'char-1',
    campaign_id: 'demo-1',
    name: 'Ser Theron Brightheart',
    type: 'pc',
    summary: 'A noble paladin of Lathander seeking to free Barovia from darkness. Haunted by a family secret that connects him to the vampire lords of old.',
    notes: `<h2>Character Overview</h2>
<p><strong>Player:</strong> Marcus | <strong>Class:</strong> Paladin 9 (Oath of Devotion) | <strong>Race:</strong> Human (Variant)</p>

<h3>Appearance</h3>
<p>Tall and broad-shouldered with sun-kissed skin that seems out of place in Barovia's eternal gloom. His armor bears the rose symbol of Lathander, though it has grown tarnished in the sunless land. A jagged scar runs from his left temple to his jaw—a reminder of the Death House.</p>

<h3>Personality</h3>
<ul>
<li><strong>Ideal:</strong> "The light will always triumph over darkness, even in the darkest places."</li>
<li><strong>Bond:</strong> He carries his grandfather's holy symbol, not knowing it was once touched by Strahd himself.</li>
<li><strong>Flaw:</strong> His righteous certainty sometimes blinds him to moral complexity.</li>
</ul>

<h3>Backstory</h3>
<p>Born to House Brightheart, a noble family in Waterdeep known for their long line of paladins. What Theron doesn't know is that his great-great-grandmother was a Barovian noble who escaped through the mists centuries ago—and that she was once betrothed to Strahd von Zarovich before fleeing with another man.</p>

<p>When the mists took him, Strahd recognized the bloodline immediately. The vampire lord has been watching Theron with particular interest, seeing in him echoes of an old betrayal.</p>

<h3>Character Arc</h3>
<p>Theron must reconcile his black-and-white view of good and evil when he discovers his family's connection to Strahd. Will he remain devoted to his oath, or will the weight of ancestral guilt consume him?</p>

<h3>Key Relationships</h3>
<ul>
<li><strong>Ireena:</strong> Sworn to protect her. Struggles with growing romantic feelings that conflict with his duty.</li>
<li><strong>Lyra:</strong> Troubled by her pact but recognizes her good heart. Hopes to guide her to the light.</li>
<li><strong>Strahd:</strong> Pure hatred, though Strahd seems to view him with strange amusement.</li>
</ul>

<h3>Combat Notes</h3>
<p>Primary tank and healer. Uses <em>Compelled Duel</em> to protect allies. Save <em>Divine Smite</em> for undead and fiends. Has +1 Longsword from Death House.</p>`,
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    position_x: 120,
    position_y: 80,
  },
  {
    id: 'char-2',
    campaign_id: 'demo-1',
    name: 'Lyra Shadowmend',
    type: 'pc',
    summary: 'A half-elf warlock bound to the Archfey known as the Prince of Frost. She fled to Barovia seeking her missing sister, only to find herself trapped.',
    notes: `<h2>Character Overview</h2>
<p><strong>Player:</strong> Sarah | <strong>Class:</strong> Warlock 9 (Archfey Patron) | <strong>Race:</strong> Half-Elf</p>

<h3>Appearance</h3>
<p>Pale skin with an almost luminescent quality, as if touched by moonlight. Her left eye is violet, her right an icy blue—a mark of her patron's influence. She wears layers of dark clothing and always keeps her hood up, hiding the pointed tips of her ears.</p>

<h3>Personality</h3>
<ul>
<li><strong>Ideal:</strong> "Power is a means to an end. My end is finding my sister."</li>
<li><strong>Bond:</strong> Her twin sister Sera disappeared into the mists three years ago.</li>
<li><strong>Flaw:</strong> She keeps too many secrets, even from those who care about her.</li>
</ul>

<h3>Backstory</h3>
<p>Lyra and her twin sister Sera were street performers in Neverwinter—charlatans who used minor illusions to enhance their act. When Sera discovered real magic and began researching the Shadowfell, she became obsessed with a ritual that would grant true power.</p>

<p>One night, Sera completed the ritual and vanished. Lyra spent two years searching before a mysterious figure offered her a pact: serve the Prince of Frost, and he would lead her to her sister. The trail led to Barovia.</p>

<p><strong>Secret:</strong> Lyra recently discovered that Sera is in Castle Ravenloft—as one of Strahd's vampire spawn. She hasn't told the party.</p>

<h3>Character Arc</h3>
<p>When Lyra finds Sera, she'll face an impossible choice: destroy the monster her sister has become, or try to save her soul at any cost?</p>

<h3>Patron: The Prince of Frost</h3>
<p>A powerful archfey who rules a domain of eternal winter in the Feywild. He collects things that are "lost"—people, memories, hopes. His interest in Barovia is unclear, but he has been unusually generous with power lately...</p>

<h3>Combat Notes</h3>
<p>Control and damage from range. <em>Hypnotic Pattern</em> for crowds, <em>Hunger of Hadar</em> for area denial. Pact of the Tome with <em>Guidance</em>, <em>Spare the Dying</em>, <em>Shillelagh</em>.</p>`,
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    position_x: 350,
    position_y: 80,
  },
  {
    id: 'char-3',
    campaign_id: 'demo-1',
    name: 'Grimjaw Ironfoot',
    type: 'pc',
    summary: 'A gruff dwarven forge cleric exiled from his clan for a crime he didn\'t commit. His faith in Moradin wavers in this godless land.',
    notes: `<h2>Character Overview</h2>
<p><strong>Player:</strong> Dave | <strong>Class:</strong> Cleric 9 (Forge Domain) | <strong>Race:</strong> Mountain Dwarf</p>

<h3>Appearance</h3>
<p>Stocky even for a dwarf, with a magnificent braided beard streaked with iron-gray. His armor is a masterwork of dwarven craft, covered in prayer runes to Moradin. Burns and calluses mark his hands—the marks of a true smith. One eye is clouded from a forge accident.</p>

<h3>Personality</h3>
<ul>
<li><strong>Ideal:</strong> "A good weapon needs tempering. So do good people."</li>
<li><strong>Bond:</strong> He must prove his innocence and reclaim his honor to return to Clan Ironfoot.</li>
<li><strong>Flaw:</strong> Drinks heavily and complains constantly—both coping mechanisms.</li>
</ul>

<h3>Backstory</h3>
<p>Grimjaw was the head smith of Clan Ironfoot, responsible for creating their greatest treasures. When a sacred artifact went missing, all evidence pointed to him. Rather than face execution, he fled into exile.</p>

<p>The truth: His apprentice Dolgrim stole the artifact and framed Grimjaw out of jealousy. Grimjaw has spent decades as a wandering smith, taking odd jobs and trying to find evidence of his innocence.</p>

<p>The mists took him near Citadel Adbar. He believes Moradin guided him here for a reason—perhaps to test his faith in a land where the gods cannot reach.</p>

<h3>Crisis of Faith</h3>
<p>In Barovia, Grimjaw cannot feel Moradin's presence. His prayers feel hollow, though his magic still works. He's beginning to wonder if the gods are as powerless as the people trapped here—or if they simply don't care.</p>

<h3>Roleplay Notes</h3>
<ul>
<li>Complains about everything but always helps anyway</li>
<li>Secretly loves the party like family</li>
<li>Refers to everyone as "ye daft [noun]"</li>
<li>Will drop everything to examine interesting metalwork</li>
</ul>

<h3>Combat Notes</h3>
<p>Frontline support. <em>Spirit Guardians</em> is the bread and butter. <em>Spiritual Weapon</em> for bonus action damage. Don't forget <em>Blessing of the Forge</em> on Theron's armor each day.</p>`,
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    position_x: 580,
    position_y: 80,
  },
  {
    id: 'char-4',
    campaign_id: 'demo-1',
    name: 'Zara Nightwhisper',
    type: 'pc',
    summary: 'A tiefling rogue with a dark sense of humor and darker past. She came to Barovia chasing a bounty and found herself becoming the hunted.',
    notes: `<h2>Character Overview</h2>
<p><strong>Player:</strong> Jess | <strong>Class:</strong> Rogue 9 (Arcane Trickster) | <strong>Race:</strong> Tiefling</p>

<h3>Appearance</h3>
<p>Deep crimson skin, small curved horns filed to points, and a long tail she uses expressively. Her eyes are solid gold with no visible pupils. She dresses in practical dark clothing with too many hidden pockets and always carries at least six visible knives (and a dozen hidden ones).</p>

<h3>Personality</h3>
<ul>
<li><strong>Ideal:</strong> "Everyone has a price. The trick is figuring out what currency they accept."</li>
<li><strong>Bond:</strong> She owes a life-debt to a crime lord in Baldur's Gate—the bounty was supposed to pay it off.</li>
<li><strong>Flaw:</strong> Cannot resist the challenge of stealing something "impossible to steal."</li>
</ul>

<h3>Backstory</h3>
<p>Zara was abandoned as an infant on the steps of a temple of Tymora in Baldur's Gate. The priests raised her until age twelve, when she ran away to join the Guild. She proved a natural—quick fingers, quicker wit, and absolutely no conscience.</p>

<p>She rose through the ranks until she caught the attention of Renaer Neverember, who hired her for increasingly dangerous jobs. The last one went wrong, leaving her in debt to some very dangerous people.</p>

<p>The bounty that brought her to the borders of Barovia was supposed to clear her debts: a Vistani woman named "Esmeralda" wanted for crimes in Waterdeep. She never found the target. The mists found her first.</p>

<h3>Secret: Actually Having Fun</h3>
<p>Zara would never admit it, but she's grown to genuinely care about the party. She's never had real friends before, and it terrifies her. She expresses affection through insults and "borrowing" their things.</p>

<h3>Relationship with Strahd</h3>
<p>Strahd is intrigued by Zara—she's one of the few people in Barovia who isn't afraid of him, treating him with the same sardonic wit she applies to everyone. He's not sure if she's brave or stupid, and that uncertainty delights him.</p>

<h3>Combat Notes</h3>
<p>Sneak attack from range or flanking. <em>Mage Hand Legerdemain</em> for tricks. <em>Mirror Image</em> before combat if possible. She has a +1 dagger she refuses to name (it's secretly named "Stabitha").</p>`,
    image_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    position_x: 250,
    position_y: 280,
  },

  // ═══════════════════════════════════════════════════════════════
  // KEY NPCs
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'char-5',
    campaign_id: 'demo-1',
    name: 'Strahd von Zarovich',
    type: 'npc',
    summary: 'The immortal vampire lord of Barovia. Once a conquering prince, now a prisoner in his own domain, forever pursuing an obsession that can never be fulfilled.',
    notes: `<h2>The Devil of Barovia</h2>
<p><strong>Role:</strong> Main Antagonist | <strong>CR:</strong> 15 | <strong>Alignment:</strong> Lawful Evil</p>

<h3>Appearance</h3>
<p>Tall and gaunt, with sharp features that might have been handsome in life. His black hair is swept back from a pronounced widow's peak. He dresses impeccably in noble finery of archaic style—always in black and crimson. His eyes burn with crimson light when he's angered or hungry.</p>

<h3>Personality</h3>
<p>Strahd is cultured, intelligent, and utterly without mercy. He fancies himself a gentleman and observes elaborate courtesies even while tormenting his victims. He speaks softly but commands absolute attention. Every word is chosen with care; every gesture is deliberate.</p>

<p>Beneath the sophistication lies bottomless rage and grief. He's had centuries to perfect his cruelty, but he's also had centuries to marinate in his own failures. He hates what he's become but lacks the self-awareness to change.</p>

<h3>Goals & Motivations</h3>
<ul>
<li><strong>Ireena:</strong> His eternal obsession. She is the reincarnation of Tatyana, the woman he loved and lost. He believes that this time, he can make her love him willingly.</li>
<li><strong>Entertainment:</strong> Eternity is boring. The adventurers represent a new game to play.</li>
<li><strong>The Prophecy:</strong> He knows Madam Eva's readings often come true. He's curious what fate has in store.</li>
</ul>

<h3>Relationship with the Party</h3>
<ul>
<li><strong>Theron:</strong> Knows the paladin's family history. Enjoys needling him about his ancestor's "betrayal."</li>
<li><strong>Lyra:</strong> Recognizes her patron's influence. The Archfey have no power in Barovia—but her magic works anyway. Interesting.</li>
<li><strong>Grimjaw:</strong> Respects dwarven craftsmanship. Has offered to show him the castle's ancient forges.</li>
<li><strong>Zara:</strong> Genuinely amused by her irreverence. Has made it a game to see if he can make her afraid.</li>
</ul>

<h3>Tactics</h3>
<p>Strahd never fights fair. He uses the environment, his lair actions, and his minions to wear down opponents. He prefers to toy with victims rather than kill them quickly—death is so final, and there's so much suffering to enjoy first.</p>

<p>If seriously threatened, he retreats to his coffin. He's survived for centuries by knowing when to withdraw.</p>

<h3>Quotes</h3>
<ul>
<li>"I am the land. The land is me. You cannot defeat what you're standing on."</li>
<li>"Love? You speak of love? I <em>invented</em> love's suffering."</li>
<li>"Please, call me Strahd. 'Lord' is so formal between friends."</li>
</ul>`,
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    position_x: 500,
    position_y: 280,
  },
  {
    id: 'char-6',
    campaign_id: 'demo-1',
    name: 'Ireena Kolyana',
    type: 'npc',
    summary: 'The adopted daughter of the late Burgomaster of Barovia village. She is the latest reincarnation of Tatyana, Strahd\'s eternal obsession.',
    notes: `<h2>The Hunted</h2>
<p><strong>Role:</strong> Key NPC / Protected Figure | <strong>Alignment:</strong> Lawful Good</p>

<h3>Appearance</h3>
<p>A striking young woman with auburn hair and bright green eyes that seem too vivid for Barovia's muted palette. She carries herself with unconscious nobility despite her modest upbringing. Two puncture scars mark her neck, though she keeps them hidden.</p>

<h3>Personality</h3>
<p>Ireena is brave, compassionate, and more capable than people assume. She's tired of being treated as a prize to be protected or claimed—she wants to fight back. She's an accomplished swordswoman (trained by her brother) and refuses to be passive in her own rescue.</p>

<h3>Current Situation</h3>
<p>Strahd has visited her twice, charming his way past defenses to drink her blood. Each bite strengthens his hold over her. She has nightmares of a castle she's never visited and a name that feels like her own: Tatyana.</p>

<p>Her father died of a heart attack after Strahd's second visit—or so she believes. In truth, Strahd killed him for trying to stake her while she slept.</p>

<h3>What She Knows</h3>
<ul>
<li>Strahd is the lord of Barovia and a vampire</li>
<li>He has pursued her twice and will come again</li>
<li>She has no memory of past lives but sometimes knows things she shouldn't</li>
<li>The mists prevent anyone from leaving</li>
</ul>

<h3>Relationship with Party</h3>
<p>Initially wary—many have promised to protect her before, and all have failed. As she travels with the party, she becomes more open and even cheerful. She's particularly drawn to Theron (recognizing a kindred noble soul) and Zara (who treats her like a person rather than a porcelain doll).</p>

<h3>Character Arc</h3>
<p>Ireena's journey is about agency. She can become a true hero in her own right, or she can succumb to despair and Strahd's control. The party's treatment of her—as a damsel or as an ally—will determine which path she takes.</p>

<h3>Combat Stats</h3>
<p>Use <strong>Noble</strong> stat block with +1 rapier. She should level up as the party does if they treat her as a companion rather than cargo.</p>`,
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    position_x: 120,
    position_y: 480,
  },
  {
    id: 'char-7',
    campaign_id: 'demo-1',
    name: 'Madam Eva',
    type: 'npc',
    summary: 'The ancient leader of the Vistani at Tser Pool. Her Tarokka readings reveal glimpses of possible futures, and she knows more than she reveals.',
    notes: `<h2>The Seer</h2>
<p><strong>Role:</strong> Oracle / Quest Giver | <strong>Alignment:</strong> Chaotic Neutral</p>

<h3>Appearance</h3>
<p>Ancient beyond counting, with skin like weathered parchment and eyes that hold centuries of secrets. She wears layers of colorful scarves and bangles that clink softly when she moves. Despite her age, her hands are steady when she handles the cards.</p>

<h3>Personality</h3>
<p>Cryptic and theatrical, Madam Eva speaks in riddles wrapped in metaphors. She enjoys being mysterious but is not unkind. She has seen countless adventurers come to Barovia, and she genuinely hopes this group might succeed where others have failed.</p>

<h3>The Secret</h3>
<p><strong>DM Eyes Only:</strong> Madam Eva is Strahd's half-sister, the daughter of King Barov and a Vistani woman. She has lived as long as Strahd through her own methods. She loves her brother despite what he has become and has spent centuries trying to orchestrate his destruction—because she believes it's the only way to free him.</p>

<h3>The Tarokka Reading</h3>
<p>The reading the party received:</p>
<ul>
<li><strong>Tome of Strahd:</strong> "The Broken One" — The tome is in a place of madness, among the cackling of the lost. <em>(Bonegrinder or the Abbey)</em></li>
<li><strong>Holy Symbol:</strong> "The Innocent" — It lies with a young man who carries light in darkness. <em>(With the altar boy at the church in Vallaki)</em></li>
<li><strong>Sunsword:</strong> "The Beast" — Seek it where the dragon's bones lie. <em>(In the treasury of Argynvostholt)</em></li>
<li><strong>Strahd's Enemy:</strong> "The Mists" — A wanderer in the mist, neither fully here nor there. <em>(Ezmerelda d'Avenir)</em></li>
<li><strong>Final Battle:</strong> "The Darklord" — He waits for you where the dead are honored. <em>(In the crypts beneath Castle Ravenloft)</em></li>
</ul>

<h3>Quotes</h3>
<ul>
<li>"The cards do not lie. But they do enjoy riddles."</li>
<li>"You seek to kill the devil? Good. He has been waiting for someone worthy to try."</li>
<li>"The future is not set. Even I only see the paths—you choose which to walk."</li>
</ul>`,
    image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face',
    position_x: 350,
    position_y: 480,
  },
  {
    id: 'char-8',
    campaign_id: 'demo-1',
    name: 'Ezmerelda d\'Avenir',
    type: 'npc',
    summary: 'A Vistani monster hunter trained by the legendary Rudolph van Richten. She has dedicated her life to destroying Strahd.',
    notes: `<h2>The Monster Hunter</h2>
<p><strong>Role:</strong> Ally / Potential Party Member | <strong>Alignment:</strong> Chaotic Good</p>

<h3>Appearance</h3>
<p>A striking young Vistani woman with dark curly hair often kept under a wide-brimmed hat. A jagged scar runs down her left cheek. She wears practical traveling clothes and carries an arsenal of monster-hunting equipment. One leg is a remarkably well-crafted prosthetic.</p>

<h3>Personality</h3>
<p>Bold, impulsive, and fiercely independent. Ezmerelda throws herself into danger without hesitation and considers fear a weakness to be conquered. Beneath the bravado is a young woman haunted by her past and desperate to prove herself.</p>

<h3>Backstory</h3>
<p>Ezmerelda's parents were Vistani who secretly sold kidnapped children to vampires in exchange for safe passage through Barovia. When the legendary monster hunter Van Richten discovered this, he killed them—unknowingly orphaning the young girl who had been hidden nearby.</p>

<p>Years later, Ezmerelda tracked down Van Richten, intending to kill him. Instead, she learned the truth about her parents and convinced Van Richten to train her. They parted ways after she lost her leg fighting a werewolf, but she never stopped hunting.</p>

<h3>Current Goals</h3>
<ul>
<li>Find Van Richten (he's in Barovia somewhere, hiding)</li>
<li>Destroy Strahd to avenge all his victims</li>
<li>Prove she doesn't need Van Richten or anyone else</li>
</ul>

<h3>Equipment</h3>
<ul>
<li>Her magic wagon (trapped with <em>Fireball</em>)</li>
<li>Silvered weapons collection</li>
<li>Holy water (12 vials)</li>
<li>Vampire hunting kit (stakes, mirrors, garlic)</li>
<li>Spell scrolls (various)</li>
</ul>

<h3>If She Joins the Party</h3>
<p>Use stat block from Curse of Strahd appendix. She's headstrong and will argue strategy—she's used to working alone. If she grows to trust the party, she becomes fiercely loyal.</p>

<h3>Secret Connection</h3>
<p>Zara's bounty target was "Esmeralda"—the same person. The bounty was placed by a surviving relative of a vampire Ezmerelda killed. This could cause tension or alliance when revealed.</p>`,
    image_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face',
    position_x: 580,
    position_y: 480,
  },
  {
    id: 'char-9',
    campaign_id: 'demo-1',
    name: 'Ismark Kolyanovich',
    type: 'npc',
    summary: 'The new Burgomaster of the village of Barovia and Ireena\'s brother. A good man crushed by impossible responsibility.',
    notes: `<h2>The Burgomaster</h2>
<p><strong>Role:</strong> Quest Giver / Ally | <strong>Alignment:</strong> Lawful Good</p>

<h3>Appearance</h3>
<p>A handsome man in his late twenties whose eyes carry the weight of someone much older. His clothes are fine but worn, and he always carries his father's sword. Dark circles under his eyes speak to sleepless nights.</p>

<h3>Personality</h3>
<p>Ismark is called "the Lesser" by the villagers—a bitter joke comparing him to his father, "Ismark the Great." This weighs on him heavily. He desperately wants to protect his sister and his village but feels inadequate to the task.</p>

<h3>Current Situation</h3>
<p>His father died after Strahd's attacks on their home. Ismark has inherited the role of Burgomaster, but he knows he cannot protect Ireena. He has begged every adventuring party to take her somewhere—anywhere—safe.</p>

<h3>What He Wants</h3>
<ul>
<li>Ireena escorted to safety (he suggests Vallaki or Krezk)</li>
<li>His father given a proper burial in the church cemetery</li>
<li>His village protected from the growing darkness</li>
</ul>

<h3>What He Offers</h3>
<p>100 gold pieces (all he has), lodging at the mansion, and his eternal gratitude. He cannot leave the village himself—he's the Burgomaster now, and the people need someone.</p>

<h3>Roleplay Notes</h3>
<p>Ismark is ashamed of his fear but controls it well. He's competent with a blade (Fighter 4) and will fight to protect his sister. If pushed, he'll admit he feels like a failure—he couldn't protect his father, and he can't protect Ireena.</p>`,
    image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    position_x: 120,
    position_y: 680,
  },
  {
    id: 'char-10',
    campaign_id: 'demo-1',
    name: 'Father Donavich',
    type: 'npc',
    summary: 'The priest of the Morning Lord in Barovia village. His faith has been shattered by his son\'s transformation into a vampire spawn.',
    notes: `<h2>The Broken Priest</h2>
<p><strong>Role:</strong> Tragic Figure / Quest Hook | <strong>Alignment:</strong> Lawful Good (struggling)</p>

<h3>Appearance</h3>
<p>A haggard man in his sixties with wild gray hair and bloodshot eyes. His priestly vestments are stained and torn. He clearly hasn't slept or bathed in days, perhaps weeks. His hands shake constantly.</p>

<h3>The Tragedy</h3>
<p>Father Donavich's son, Doru, joined a failed uprising against Strahd a year ago. Strahd turned Doru into a vampire spawn and sent him home as a message. Unable to destroy his own son, Donavich locked Doru in the church undercroft, where the young vampire screams and claws at the door.</p>

<h3>Current State</h3>
<p>Donavich hasn't conducted a service since Doru's return. He spends his days praying desperately for guidance that never comes and his nights listening to his son's tormented cries. His faith in the Morning Lord is crumbling—why would a good god allow such suffering?</p>

<h3>Interaction with Party</h3>
<ul>
<li>Initially hostile to intrusion—he's protective of his shameful secret</li>
<li>Will beg the party not to harm Doru if they discover him</li>
<li>If the party destroys Doru mercifully, Donavich is devastated but grateful</li>
<li>Could be restored to hope if shown genuine kindness</li>
</ul>

<h3>What He Knows</h3>
<ul>
<li>The church was once protected by the Morning Lord's power, but that protection has faded</li>
<li>A holy symbol of great power was once kept here but was moved to Vallaki for safekeeping</li>
<li>Strahd cannot enter hallowed ground, but the church is no longer properly hallowed</li>
</ul>`,
    image_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face',
    position_x: 350,
    position_y: 680,
  },
]

export const DEMO_TAGS = [
  { id: 'tag-1', campaign_id: 'demo-1', name: 'ally', color: '#22c55e' },
  { id: 'tag-2', campaign_id: 'demo-1', name: 'enemy', color: '#ef4444' },
  { id: 'tag-3', campaign_id: 'demo-1', name: 'romantic', color: '#ec4899' },
  { id: 'tag-4', campaign_id: 'demo-1', name: 'rival', color: '#f59e0b' },
  { id: 'tag-5', campaign_id: 'demo-1', name: 'family', color: '#8b5cf6' },
  { id: 'tag-6', campaign_id: 'demo-1', name: 'mentor', color: '#3b82f6' },
  { id: 'tag-7', campaign_id: 'demo-1', name: 'suspicious', color: '#6b7280' },
  { id: 'tag-8', campaign_id: 'demo-1', name: 'secret', color: '#a855f7' },
  { id: 'tag-9', campaign_id: 'demo-1', name: 'quest', color: '#eab308' },
  { id: 'tag-10', campaign_id: 'demo-1', name: 'dead', color: '#1f2937' },
]

export const DEMO_CHARACTER_TAGS = [
  // Party relationships
  { id: 'ct-1', character_id: 'char-1', tag_id: 'tag-1', related_character_id: 'char-2', notes: 'Trusts her despite warlock pact' },
  { id: 'ct-2', character_id: 'char-1', tag_id: 'tag-1', related_character_id: 'char-3', notes: 'Brothers in arms' },
  { id: 'ct-3', character_id: 'char-1', tag_id: 'tag-1', related_character_id: 'char-4', notes: 'Tolerates her antics' },
  { id: 'ct-4', character_id: 'char-1', tag_id: 'tag-3', related_character_id: 'char-6', notes: 'Developing feelings' },
  { id: 'ct-5', character_id: 'char-1', tag_id: 'tag-2', related_character_id: 'char-5', notes: 'Sworn enemy' },

  // Lyra's relationships
  { id: 'ct-6', character_id: 'char-2', tag_id: 'tag-1', related_character_id: 'char-1', notes: 'Respects his conviction' },
  { id: 'ct-7', character_id: 'char-2', tag_id: 'tag-8', related_character_id: 'char-7', notes: 'Knows more than she reveals' },
  { id: 'ct-8', character_id: 'char-2', tag_id: 'tag-7', related_character_id: 'char-5', notes: 'Wary of his interest in her' },

  // Strahd's relationships
  { id: 'ct-9', character_id: 'char-5', tag_id: 'tag-3', related_character_id: 'char-6', notes: 'Eternal obsession' },
  { id: 'ct-10', character_id: 'char-5', tag_id: 'tag-4', related_character_id: 'char-1', notes: 'Sees ancestral echo' },
  { id: 'ct-11', character_id: 'char-5', tag_id: 'tag-5', related_character_id: 'char-7', notes: 'Hidden connection' },

  // Ireena's relationships
  { id: 'ct-12', character_id: 'char-6', tag_id: 'tag-5', related_character_id: 'char-9', notes: 'Adopted brother' },
  { id: 'ct-13', character_id: 'char-6', tag_id: 'tag-2', related_character_id: 'char-5', notes: 'Her tormentor' },
  { id: 'ct-14', character_id: 'char-6', tag_id: 'tag-1', related_character_id: 'char-1', notes: 'Her protector' },

  // Ezmerelda's relationships
  { id: 'ct-15', character_id: 'char-8', tag_id: 'tag-6', related_character_id: null, notes: 'Trained by Van Richten' },
  { id: 'ct-16', character_id: 'char-8', tag_id: 'tag-2', related_character_id: 'char-5', notes: 'Sworn to destroy' },

  // Ismark's relationships
  { id: 'ct-17', character_id: 'char-9', tag_id: 'tag-5', related_character_id: 'char-6', notes: 'Protective brother' },
  { id: 'ct-18', character_id: 'char-9', tag_id: 'tag-9', related_character_id: 'char-1', notes: 'Hired party to protect Ireena' },
]

export const DEMO_SESSIONS = [
  {
    id: 'session-1',
    campaign_id: 'demo-1',
    session_number: 1,
    title: 'Into the Mists',
    date: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party was mysteriously drawn through the mists into Barovia. They discovered a corpse with a desperate letter and made their way to the village.',
    notes: `<h1>Session 1: Into the Mists</h1>

<h2>Session Summary</h2>
<p>The party was traveling on the road to Daggerford when a sudden, unnatural fog rolled in. Despite their attempts to backtrack, they found themselves on an unfamiliar road surrounded by dark, oppressive forest.</p>

<h2>Key Events</h2>

<h3>The Gates of Barovia</h3>
<p>The party encountered massive iron gates that opened on their own, seemingly inviting them in. Beyond lay a corpse clutching a letter—a plea from the Burgomaster of Barovia begging for heroes to save his adopted daughter from a vampire.</p>

<p><strong>Theron</strong> insisted they investigate. <strong>Zara</strong> tried to pick the lock on the gates to go back but found them unopenable from this side.</p>

<h3>Wolves in the Wood</h3>
<p>A pack of wolves shadowed the party through the Svalich Woods. <strong>Lyra</strong> noticed their eyes held an unnatural intelligence. They never attacked—just watched.</p>

<h3>Arrival at Barovia Village</h3>
<p>The party reached the village at dusk. The streets were empty, windows shuttered, and a heavy sense of despair hung over everything. They found shelter at the Blood of the Vine tavern (a sign that once read "Blood on the Vine" with letters scraped away).</p>

<h2>NPCs Encountered</h2>
<ul>
<li><strong>Arik the Barkeep:</strong> Vacant-eyed, responded to questions with monotone answers</li>
<li><strong>Three Vistani Women:</strong> Were drinking in the corner, watched the party with interest</li>
</ul>

<h2>Loot</h2>
<ul>
<li>Letter from Kolyan Indirovich (the Burgomaster)</li>
<li>50 gp found on the corpse</li>
</ul>

<h2>Notes for Next Session</h2>
<p>The party plans to seek out the Burgomaster's mansion in the morning. The Vistani mentioned that "the Burgomaster is dead" but wouldn't elaborate.</p>

<h2>Quotes of the Night</h2>
<blockquote>"I've got a bad feeling about this." —Grimjaw (for the first of many times)</blockquote>
<blockquote>"On the bright side, the real estate prices here must be very reasonable." —Zara</blockquote>`,
  },
  {
    id: 'session-2',
    campaign_id: 'demo-1',
    session_number: 2,
    title: 'Death House',
    date: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party explored the infamous Death House, uncovering the dark history of the Durst family and barely escaping with their lives.',
    notes: `<h1>Session 2: Death House</h1>

<h2>Session Summary</h2>
<p>On their way to the Burgomaster's mansion, the party encountered two ghostly children who begged them to save their baby brother from the "monster" in their basement. The house had other plans for them.</p>

<h2>Key Events</h2>

<h3>The Ghost Children</h3>
<p><strong>Rose</strong> and <strong>Thorn</strong> appeared as two frightened children. <strong>Theron</strong> immediately agreed to help, while <strong>Zara</strong> sensed something was wrong. The party entered the townhouse to find it seemingly abandoned but well-maintained.</p>

<h3>Exploring the House</h3>
<p>The party discovered increasingly disturbing elements:</p>
<ul>
<li>A portrait gallery showing the Durst family—with Mrs. Durst holding a bundle that looked disturbingly malformed</li>
<li>A secret door behind a mirror leading to hidden stairs</li>
<li>The children's bedroom, where they found the skeletons of Rose and Thorn in a locked room (they starved to death)</li>
<li>A letter revealing Mr. Durst's affair with the nursemaid</li>
</ul>

<p><strong>Grimjaw</strong> attempted to consecrate the children's remains but felt his god's presence blocked from this place.</p>

<h3>The Basement Cult</h3>
<p>The hidden stairway led to a massive underground complex—the remnants of a cult dedicated to "terrible powers." They found:</p>
<ul>
<li>A dining hall with moldy feast remains and ghouls hiding under the tables</li>
<li>Prison cells with long-dead victims</li>
<li>A ritual chamber with a blood-stained altar</li>
</ul>

<h3>The Final Horror</h3>
<p>In the deepest chamber, they confronted a <strong>Shambling Mound</strong>—a creature formed from the house's sacrificial victims. The house itself began to turn against them: walls sprouted blades, doors slammed shut, toxic smoke filled hallways.</p>

<p><strong>Lyra</strong> went down twice but <strong>Grimjaw</strong> kept her up. <strong>Theron</strong> finally destroyed the creature with a critical Divine Smite.</p>

<p>The party barely escaped as the house tried to consume them.</p>

<h2>Loot</h2>
<ul>
<li>+1 Longsword (found in the basement)</li>
<li>Deed to a windmill ("Old Bonegrinder")</li>
<li>4 silver goblets worth 25 gp each</li>
<li>A spellbook with <em>Web</em> and <em>Invisibility</em> (Lyra claimed it)</li>
</ul>

<h2>Character Moments</h2>
<p><strong>Theron</strong> struggled with the revelation that Rose and Thorn were dead all along—he'd sworn to protect children who'd been dead for decades.</p>

<p><strong>Zara</strong> pocketed several valuables without telling the party. Old habits.</p>

<h2>Quotes</h2>
<blockquote>"I'm never going in a haunted house again." —Grimjaw<br/>"We're IN Barovia. Everything here is a haunted house." —Lyra</blockquote>`,
  },
  {
    id: 'session-3',
    campaign_id: 'demo-1',
    session_number: 3,
    title: 'The Burgomaster\'s Funeral',
    date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party met Ismark and Ireena, learned of Strahd\'s pursuit of Ireena, and helped bury the late Burgomaster.',
    notes: `<h1>Session 3: The Burgomaster's Funeral</h1>

<h2>Session Summary</h2>
<p>After escaping Death House, the party finally reached the Burgomaster's mansion and learned the truth about Barovia's situation.</p>

<h2>Key Events</h2>

<h3>Meeting Ismark</h3>
<p>At the Blood of the Vine tavern, the party encountered <strong>Ismark Kolyanovich</strong>, son of the late Burgomaster. He explained:</p>
<ul>
<li>His father died three days ago from a "broken heart" (heart attack after Strahd's attacks)</li>
<li>Strahd has visited their home twice, seeking Ireena</li>
<li>He needs help burying his father in hallowed ground and escorting Ireena to safety</li>
</ul>

<p>Ismark offered 100 gold pieces—everything he has—for the party's help.</p>

<h3>The Mansion</h3>
<p>At the mansion, the party saw the damage from Strahd's attacks: claw marks on the walls, shattered windows, a pervasive sense of dread. They met <strong>Ireena Kolyana</strong>, who surprised them with her composure and steel.</p>

<p><strong>Theron</strong> was immediately taken with her courage. <strong>Zara</strong> noted the bite marks on her neck that Ireena tried to hide.</p>

<p>The Burgomaster's body lay in a coffin in the drawing room. No one in the village would help carry it—they're too afraid of Strahd's attention.</p>

<h3>The Funeral</h3>
<p>The party helped carry the coffin to the church. <strong>Father Donavich</strong> reluctantly agreed to perform the service despite his broken state. During the burial, they heard inhuman screaming from beneath the church.</p>

<p>Donavich confessed: his son Doru is imprisoned below, transformed into a vampire spawn. He begged the party not to go down there.</p>

<h3>A Choice Made</h3>
<p>The party debated what to do about Doru. <strong>Theron</strong> wanted to destroy the creature mercifully. <strong>Grimjaw</strong> agreed but understood a father's grief. <strong>Lyra</strong> wanted to leave it alone—it wasn't their problem.</p>

<p>They decided to leave Doru for now but marked it as unfinished business.</p>

<h2>Party Decision</h2>
<p>The party agreed to escort Ireena to Vallaki, a town to the west said to have strong defenses against Strahd. They'll leave at first light.</p>

<h2>Character Development</h2>
<p><strong>Ireena</strong> insisted on carrying a sword and being treated as an ally, not cargo. <strong>Zara</strong> approved: "Finally, someone with sense."</p>

<p><strong>Grimjaw's</strong> faith was tested seeing Donavich's broken state. He offered to pray with the priest but Donavich refused—"The gods don't listen here."</p>

<h2>Loot</h2>
<ul>
<li>100 gp from Ismark</li>
<li>Burgomaster's letter of introduction (could be useful in Vallaki)</li>
</ul>`,
  },
  {
    id: 'session-4',
    campaign_id: 'demo-1',
    session_number: 4,
    title: 'The Tarokka Reading',
    date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party visited the Vistani camp at Tser Pool, where Madam Eva read their fortunes and revealed the locations of the artifacts needed to defeat Strahd.',
    notes: `<h1>Session 4: The Tarokka Reading</h1>

<h2>Session Summary</h2>
<p>On the road to Vallaki, the party stopped at the Vistani encampment at Tser Pool to seek information. They received far more than they bargained for.</p>

<h2>Key Events</h2>

<h3>The Road to Vallaki</h3>
<p>Travel was tense. The party passed several disturbing sights:</p>
<ul>
<li>A gallows with a corpse that bore an unsettling resemblance to <strong>Theron</strong></li>
<li>A crossroads with a strange monument to "those who fell to the devil Strahd"</li>
<li>A black carriage pulled by black horses that passed them silently—they saw a pale face watching from within</li>
</ul>

<p><strong>Lyra</strong> cast <em>Detect Magic</em> on the carriage. "Don't," was all she said afterward.</p>

<h3>Tser Pool Camp</h3>
<p>The Vistani camp was surprisingly welcoming. Music, dancing, wine—the first color and life the party had seen in Barovia. <strong>Zara</strong> was immediately suspicious. <strong>Grimjaw</strong> immediately got drunk.</p>

<p>The Vistani invited them to meet their leader: <strong>Madam Eva</strong>.</p>

<h3>The Reading</h3>
<p>In her tent, Madam Eva performed a Tarokka reading for the party. Her voice changed, becoming deeper and resonant:</p>

<blockquote>
<p><strong>"The Tome of Strahd"</strong> — "Find the Broken One among the mad cackling. There lies knowledge of the ancient."</p>

<p><strong>"The Holy Symbol of Ravenkind"</strong> — "The Innocent holds it in a place of worship. He knows not what he guards."</p>

<p><strong>"The Sunsword"</strong> — "Where the dragon's bones rest, there lies the blade of light."</p>

<p><strong>"Strahd's Enemy"</strong> — "A wanderer in the mists, seeking the devil's end. She walks alone but need not."</p>

<p><strong>"Strahd's Defeat"</strong> — "The Darklord waits where his ancestors are honored. Face him among the dead."</p>
</blockquote>

<p>The party spent hours trying to interpret the reading.</p>

<h3>Warnings and Wisdom</h3>
<p>Before they left, Madam Eva offered additional guidance:</p>
<ul>
<li>"Beware the windmill—what grinds there is not grain."</li>
<li>"The village of Vallaki is not as safe as it seems. Its leader hides madness behind festivals."</li>
<li>"There is one who hunts the hunter. Seek her in the mists. She may yet be your salvation."</li>
</ul>

<h2>Character Moments</h2>
<p><strong>Lyra</strong> asked Madam Eva about her sister. Eva's response: "She is closer than you think. But what she has become... that is for you to discover."</p>

<p><strong>Theron</strong> received a cryptic warning: "Your blood remembers this land, even if you do not."</p>

<h2>Player Theories</h2>
<ul>
<li>The "Broken One" might refer to the Abbey of Saint Markovia (known for healing the mad) or the Old Bonegrinder (the windmill)</li>
<li>The "Innocent" with the holy symbol could be a child or young priest</li>
<li>The "dragon's bones" suggests Argynvostholt, a ruined mansion rumored to be connected to an order of dragon knights</li>
</ul>`,
  },
  {
    id: 'session-5',
    campaign_id: 'demo-1',
    session_number: 5,
    title: 'Old Bonegrinder',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party investigated the windmill from their deed and discovered a coven of night hags who were baking children into "dream pastries." A brutal battle ensued.',
    notes: `<h1>Session 5: Old Bonegrinder</h1>

<p><em>Content Warning: This session dealt with dark themes including child endangerment. All children were rescued.</em></p>

<h2>Session Summary</h2>
<p>The party made a detour to investigate the windmill they received the deed for. What they found was far worse than an abandoned building.</p>

<h2>Key Events</h2>

<h3>Approaching the Windmill</h3>
<p>The party smelled something sweet—baked goods?—drifting from the old mill. An old woman named <strong>Morgantha</strong> was leaving with a cart of pastries. She offered to sell them "dream pastries" for 1 gp each.</p>

<p><strong>Grimjaw</strong>: "In Barovia? Something that makes you feel good? Absolutely cursed."</p>

<p><strong>Zara</strong> tailed Morgantha while the others investigated the mill.</p>

<h3>The Horrifying Truth</h3>
<p>Inside, they found:</p>
<ul>
<li>Two more old women (Morgantha's daughters)</li>
<li>A child in a cage ("for the next batch")</li>
<li>Bone fragments in the flour</li>
<li>A second child upstairs, drugged and unresponsive</li>
</ul>

<p><strong>Theron</strong> demanded the children's release. The hags laughed and revealed their true forms.</p>

<h3>The Battle</h3>
<p>This was the hardest fight yet. The night hags:</p>
<ul>
<li>Used <em>Nightmare Haunting</em> on <strong>Lyra</strong>, trapping her in a waking nightmare</li>
<li>Turned invisible and repositioned constantly</li>
<li>Cast <em>Lightning Bolt</em> through the entire party, downing <strong>Grimjaw</strong></li>
</ul>

<p><strong>Zara</strong> returned mid-fight and used the element of surprise to backstab one hag for massive damage.</p>

<p><strong>Theron</strong> cornered the leader, Morgantha, and destroyed her with a divine smite while she begged for mercy.</p>

<p>One hag escaped into the Ethereal Plane. She will be a problem later.</p>

<h3>The Children</h3>
<p>Two children rescued:</p>
<ul>
<li><strong>Freek</strong>: A boy, traumatized but physically okay</li>
<li><strong>Myrtle</strong>: A girl, heavily drugged on dream pastries, will need time to recover</li>
</ul>

<p>Their parents sold them to the hags in exchange for dream pastries. This broke something in <strong>Theron</strong>.</p>

<h2>Aftermath</h2>
<p>The party burned the windmill to the ground. They're escorting the children to Vallaki, hoping to find them safe homes.</p>

<p><strong>Ireena</strong> has been helping care for the children. She has a natural way with them.</p>

<h2>Character Moments</h2>
<p><strong>Theron</strong> had to be physically restrained from going after the children's parents. "They SOLD their children. For PASTRIES."</p>

<p><strong>Lyra</strong> was shaken by the nightmare haunting—she saw her sister Sera, transformed into something monstrous, welcoming her to join.</p>

<h2>Loot</h2>
<ul>
<li>Night Hag heartstone (worth 500 gp to the right buyer)</li>
<li>Various dark ritual components</li>
<li>The Tome of Strahd! (Was being used by the hags for dark rituals)</li>
</ul>

<h2>The Tome</h2>
<p>The party has the Tome of Strahd. It's written in Strahd's own hand and chronicles his history—how he became a vampire, his obsession with Tatyana, and hints about his weaknesses. This is HUGE.</p>`,
  },
  {
    id: 'session-6',
    campaign_id: 'demo-1',
    session_number: 6,
    title: 'Welcome to Vallaki',
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party arrived in Vallaki, a town obsessed with "happiness" enforced through weekly festivals. They uncovered political tensions and found shelter at the Blue Water Inn.',
    notes: `<h1>Session 6: Welcome to Vallaki</h1>

<h2>Session Summary</h2>
<p>After the horrors of Bonegrinder, the party reached the "safe" town of Vallaki. They quickly learned that safety here comes at a cost.</p>

<h2>Key Events</h2>

<h3>The Gates of Vallaki</h3>
<p>Unlike Barovia village, Vallaki has real fortifications: high walls, guards at the gates, and (supposedly) protection against Strahd. The guards questioned the party extensively before allowing them in.</p>

<p>Inside, they saw townspeople constructing what appeared to be festival decorations. Signs everywhere proclaimed: "ALL WILL BE WELL!"</p>

<h3>The Blue Water Inn</h3>
<p>The party found lodging at the Blue Water Inn, run by a family of wereravens (though the party doesn't know this yet). The innkeepers, <strong>Urwin Martikov</strong> and his wife <strong>Danika</strong>, were genuinely welcoming—a rarity in Barovia.</p>

<p><strong>Urwin</strong> shared information:</p>
<ul>
<li>Baron Vargas Vallakovich rules the town with an iron fist disguised as forced happiness</li>
<li>Weekly festivals are mandatory; "malicious unhappiness" is punishable by time in the stocks—or worse</li>
<li>Lady Fiona Wachter leads an underground opposition to the Baron</li>
<li>The Church of St. Andral might be able to help with the children</li>
</ul>

<h3>Exploring the Town</h3>
<p>The party split up to investigate:</p>

<p><strong>Theron and Grimjaw</strong> visited the <strong>Church of St. Andral</strong>:</p>
<ul>
<li>Met Father Lucian, a kind but worried priest</li>
<li>The church is protected by the bones of St. Andral (hallowed ground)</li>
<li>Father Lucian admitted something troubling: the bones have been stolen. Without them, vampires can enter freely.</li>
<li>A young altar boy named <strong>Yeska</strong> seemed nervous when questioned</li>
</ul>

<p><strong>Lyra and Zara</strong> investigated the town:</p>
<ul>
<li>The Baron's mansion is heavily guarded</li>
<li>They spotted Lady Wachter leaving her townhouse looking secretive</li>
<li>Zara pickpocketed a guard and found a list of "unhappy citizens" marked for arrest</li>
</ul>

<h3>The Children's Fate</h3>
<p>The party placed Freek and Myrtle with Father Lucian, who promised to care for them and find them a proper home. <strong>Ireena</strong> was reluctant to leave them but understood she couldn't stay.</p>

<h2>Political Situation</h2>
<p>Vallaki is a powder keg:</p>
<ul>
<li><strong>Baron Vallakovich</strong> believes his festivals keep Strahd away through sheer happiness. He's increasingly paranoid and tyrannical.</li>
<li><strong>Lady Wachter</strong> wants to overthrow the Baron but may have her own dark agenda—rumors say she has ties to Strahd.</li>
<li>The common folk are caught in between, forced to smile while they suffer.</li>
</ul>

<h2>Hooks for Next Session</h2>
<ul>
<li>Find the stolen bones before vampires attack the church</li>
<li>Investigate Lady Wachter—ally or enemy?</li>
<li>The "Festival of the Blazing Sun" is in three days—attendance is mandatory</li>
</ul>`,
  },
  {
    id: 'session-7',
    campaign_id: 'demo-1',
    session_number: 7,
    title: 'The Bones of St. Andral',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'The party tracked down the stolen holy bones, confronting the coffin maker who had made a dark deal. A vampire attack on the church was barely prevented.',
    notes: `<h1>Session 7: The Bones of St. Andral</h1>

<h2>Session Summary</h2>
<p>A race against time to recover the stolen bones before Strahd's servants attacked the church.</p>

<h2>Key Events</h2>

<h3>The Investigation</h3>
<p><strong>Zara</strong> intimidated young Yeska into confessing: he told the coffin maker, <strong>Henrik van der Voort</strong>, about the bones in exchange for coins to buy food for his sick mother. He didn't know what Henrik would do with the information.</p>

<p>The party headed to Henrik's shop immediately.</p>

<h3>The Coffin Maker's Shop</h3>
<p>Henrik was terrified—not of the party, but of what was upstairs. He confessed that <strong>Vampire Spawn</strong> had forced him to steal the bones. They were hiding in his attic, waiting for nightfall to attack the church.</p>

<p>It was midday. The party had to act now.</p>

<h3>The Battle Upstairs</h3>
<p>Six vampire spawn waited in the attic. The fight was brutal:</p>
<ul>
<li><strong>Theron</strong> used <em>Turn Undead</em> to scatter half of them</li>
<li><strong>Grimjaw</strong> held a chokepoint at the stairs</li>
<li><strong>Lyra</strong> blasted two with <em>Eldritch Blast</em> through the window (sunlight helped)</li>
<li><strong>Zara</strong> found the bones hidden under a loose floorboard</li>
</ul>

<p>One spawn escaped through a window. It will report back to Strahd.</p>

<h3>The Bones Returned</h3>
<p>The party returned the bones to Father Lucian just as the sun set. He re-consecrated the church immediately. The ground glowed briefly with holy light.</p>

<p>"You've done a great thing today," Father Lucian said. "The church is protected once more."</p>

<h3>A Discovery</h3>
<p>Among the spawn's remains, <strong>Lyra</strong> found a locket. Inside was a tiny portrait of a young woman—her sister Sera.</p>

<p>One of the vampire spawn... had been Sera.</p>

<p>Lyra hasn't told the party yet. She excused herself and hasn't come back to the inn.</p>

<h2>Aftermath</h2>
<ul>
<li>Henrik was arrested by the town guard for consorting with vampires. His fate is in the Baron's hands.</li>
<li>The party is hailed as heroes by Father Lucian and the church congregation.</li>
<li>The Baron has taken notice of them—could be good or bad.</li>
</ul>

<h2>Character Moments</h2>
<p><strong>Lyra</strong>'s discovery about Sera was devastating. Sarah (the player) did an amazing job roleplaying the quiet horror of realization.</p>

<p><strong>Grimjaw</strong> felt the Morning Lord's presence for the first time since entering Barovia when the bones were restored. His faith has been renewed.</p>

<h2>Loot</h2>
<ul>
<li>Sera's locket (Lyra took it)</li>
<li>100 gp reward from Father Lucian</li>
<li>The gratitude of the church (may be useful later)</li>
</ul>`,
  },
  {
    id: 'session-8',
    campaign_id: 'demo-1',
    session_number: 8,
    title: 'Dinner with the Devil',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: 'Strahd invited the party to Castle Ravenloft for dinner. Against all better judgment, they accepted. The night revealed much about their enemy—and themselves.',
    notes: `<h1>Session 8: Dinner with the Devil</h1>

<h2>Session Summary</h2>
<p>A formal invitation arrived at the Blue Water Inn: Strahd von Zarovich requested the pleasure of the party's company for dinner at Castle Ravenloft. RSVP immediately.</p>

<p>After much debate, they accepted.</p>

<h2>The Invitation</h2>
<p>The invitation was written in elegant script on black parchment sealed with crimson wax. A black carriage would arrive at sunset.</p>

<p><strong>Theron</strong>: "This is obviously a trap."<br/>
<strong>Zara</strong>: "Obviously. But consider: free dinner."<br/>
<strong>Grimjaw</strong>: "Also, refusing might be worse."<br/>
<strong>Lyra</strong>: "I need to see inside that castle."</p>

<p><strong>Ireena</strong> was NOT invited. She stayed at the church under Father Lucian's protection.</p>

<h2>Castle Ravenloft</h2>
<p>The castle was... not what they expected. Instead of cobwebs and gothic horror, they found:</p>
<ul>
<li>Elegant chandeliers, rich tapestries, roaring fireplaces</li>
<li>A pipe organ playing itself in a distant hall</li>
<li>Servants (humans? or something else?) attending to their every need</li>
<li>An exquisite dining hall with a feast prepared</li>
</ul>

<p>Strahd was the perfect host. Charming, witty, solicitous of their comfort. He asked about their adventures, seemed genuinely interested in their answers, and offered excellent wine.</p>

<h2>The Revelations</h2>
<p>Over the course of the evening, Strahd revealed (or confirmed) several things:</p>

<h3>To Theron:</h3>
<p>"Your great-great-grandmother was to be my bride before your ancestor stole her away. The Brighthearts owe me a debt, young paladin. I wonder how you'll repay it."</p>

<h3>To Lyra:</h3>
<p>"Your sister? Yes, she's here. Would you like to see her? I could arrange a reunion." He smiled at her horror. "I thought not. Not yet."</p>

<h3>To Grimjaw:</h3>
<p>"Your faith is admirable, dwarf. But your god has no power here. The Morning Lord is just another name for the sun—and the sun answers to ME in Barovia."</p>

<h3>To Zara:</h3>
<p>"You're the only one here who isn't pretending. I respect that. If you ever tire of these... heroes... I could use someone with your talents."</p>

<h2>The Warning</h2>
<p>As the evening ended, Strahd's demeanor shifted:</p>

<blockquote>"You've been amusing guests. You've even done me a service, eliminating those hags—they were becoming troublesome. But I want you to understand something: Ireena belongs to me. I have pursued her through lifetimes. If you continue to keep her from me... this pleasant evening will be the last kindness you receive."</blockquote>

<h2>The Return</h2>
<p>The black carriage returned them to Vallaki at dawn. They were unharmed but shaken.</p>

<p>For the first time, they truly understood what they were facing. Strahd isn't just a monster—he's a monster with patience, intelligence, and absolute power in his domain.</p>

<h2>Character Moments</h2>
<p><strong>Theron</strong> is shaken by the revelation about his family. He's questioning everything.</p>

<p><strong>Lyra</strong> knows Sera is in the castle. She has to find a way to get to her—or accept that her sister is gone.</p>

<p><strong>Zara</strong> was uncomfortably tempted by Strahd's offer. She's not going to take it. Probably.</p>

<h2>Next Session</h2>
<p>The party needs to find the remaining artifacts (Holy Symbol, Sunsword) and Strahd's prophesied enemy. They're also running out of time—Strahd's patience has limits.</p>`,
  },
]

export const DEMO_TIMELINE_EVENTS = [
  {
    id: 'event-1',
    campaign_id: 'demo-1',
    title: 'Entered Barovia',
    description: 'The party was drawn through the mists into the demiplane of dread. The gates slammed shut behind them.',
    event_date: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'discovery',
    character_id: null,
  },
  {
    id: 'event-2',
    campaign_id: 'demo-1',
    title: 'Survived Death House',
    description: 'Barely escaped the haunted Durst Manor after defeating the shambling mound in the basement.',
    event_date: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'combat',
    character_id: null,
  },
  {
    id: 'event-3',
    campaign_id: 'demo-1',
    title: 'Burgomaster\'s Funeral',
    description: 'Helped bury Kolyan Indirovich and met his children, Ismark and Ireena.',
    event_date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'character_intro',
    character_id: 'char-6',
  },
  {
    id: 'event-4',
    campaign_id: 'demo-1',
    title: 'Tarokka Reading',
    description: 'Madam Eva revealed the locations of the artifacts needed to defeat Strahd.',
    event_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'discovery',
    character_id: 'char-7',
  },
  {
    id: 'event-5',
    campaign_id: 'demo-1',
    title: 'Destroyed Old Bonegrinder',
    description: 'Defeated a coven of night hags and burned down their child-eating operation. Recovered the Tome of Strahd.',
    event_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'combat',
    character_id: null,
  },
  {
    id: 'event-6',
    campaign_id: 'demo-1',
    title: 'Artifact Found: Tome of Strahd',
    description: 'The ancient tome containing Strahd\'s history and secrets was recovered from the hags\' lair.',
    event_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'treasure',
    character_id: null,
  },
  {
    id: 'event-7',
    campaign_id: 'demo-1',
    title: 'Arrived in Vallaki',
    description: 'Reached the fortified town of Vallaki, meeting its strange inhabitants and uncovering political intrigue.',
    event_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'discovery',
    character_id: null,
  },
  {
    id: 'event-8',
    campaign_id: 'demo-1',
    title: 'Bones of St. Andral Recovered',
    description: 'Defeated vampire spawn at the coffin maker\'s shop and returned the stolen bones to the church.',
    event_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'quest_complete',
    character_id: null,
  },
  {
    id: 'event-9',
    campaign_id: 'demo-1',
    title: 'Lyra\'s Discovery',
    description: 'Lyra discovered that one of the vampire spawn was her sister Sera. She hasn\'t shared this with the party.',
    event_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'character',
    character_id: 'char-2',
  },
  {
    id: 'event-10',
    campaign_id: 'demo-1',
    title: 'Dinner at Castle Ravenloft',
    description: 'Strahd invited the party to dinner. Revelations were made about Theron\'s ancestry, Lyra\'s sister, and Strahd\'s ultimatum regarding Ireena.',
    event_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_type: 'encounter',
    character_id: 'char-5',
  },
]

export const DEMO_VAULT_CHARACTERS = [
  {
    id: 'vault-1',
    name: 'Template: Mysterious Merchant',
    type: 'npc',
    summary: 'A wandering trader who appears when least expected, offering rare goods at strange prices.',
    notes: `<h2>Universal NPC Template</h2>
<p>Can be dropped into any campaign as a source of magic items, information, or plot hooks.</p>

<h3>Customization Options</h3>
<ul>
<li><strong>Race:</strong> Human, elf, tiefling, or something stranger</li>
<li><strong>Gender:</strong> Any</li>
<li><strong>Personality:</strong> Cryptic, jovial, sinister, or matter-of-fact</li>
</ul>

<h3>What They Sell</h3>
<ul>
<li>Magic items at above-market prices</li>
<li>Information about local dangers</li>
<li>Maps to forgotten places</li>
<li>Services best not described</li>
</ul>

<h3>What They Accept</h3>
<p>Often prefers payment in favors, memories, or years of life rather than gold.</p>`,
    image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'vault-2',
    name: 'Template: Veteran Adventurer',
    type: 'npc',
    summary: 'A retired adventurer who runs a tavern/shop/guild and offers advice, quests, or training to new heroes.',
    notes: `<h2>Universal NPC Template</h2>
<p>Perfect for establishing a home base or providing mentor figures.</p>

<h3>Former Career Options</h3>
<ul>
<li>Retired knight who lost their lord</li>
<li>Former thieves' guild member seeking redemption</li>
<li>Wizard who gave up magic after a tragedy</li>
<li>Soldier who survived a famous battle</li>
</ul>

<h3>What They Provide</h3>
<ul>
<li>Quest hooks and rumors</li>
<li>Training montages between adventures</li>
<li>Equipment storage and upgrades</li>
<li>Emotional support and wisdom</li>
</ul>

<h3>Hidden Depths</h3>
<p>Always give them a secret: a hidden stash of powerful items, a nemesis who might return, or a debt that could draw the party into new adventures.</p>`,
    image_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&crop=face',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

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

// Generate a placeholder avatar for characters without images
export function generateAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name)
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`
}
