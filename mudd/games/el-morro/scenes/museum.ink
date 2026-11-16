// MUSEO DE LEYENDAS: the hub. A run starts at the top of this card, comes
// back to "= casefile" after the last place, and ends at "= home".
//
// A scene card is plain ink. A place card never names the creature or a
// puzzle (a lair belongs to one creature, so it may name that one):
//   # slot: <name>   the dealer's puzzle for that slot (see the .yaml);
//                    it must be followed by [@pass] and [@fail] choices
//   # clue           reveal the next clue about this run's creature
//   # digit          reveal the next number of the lock (one per place)
//   # toy: <name>    play a lair toy from the .yaml (tap a spot, count taps, send pulses)
//   # caught         add the creature to the Field Guide
//   # rate           count up the run and award its egg
//   # clear          wipe the text window
//   # pic: <name>    show a picture
//   # tune: <name>   play a tune from banks.yaml
//   # cue: <name>    play a short sound (right, miss, find, hatch, disk)
// The engine sets: {hero} {sibling} {pet}, minutes, sunset, clues, stars,
// detours (wrong picks in the case file), egg (after "# rate": 1 is the
// lowest egg), runs (quests finished before this one), and caught
// (creatures found so far). Don't name a "= part" after one of those.
// End a card with -> DONE. The engine drives to the next stop.
// "= mother" and "= mother_gold" are the two endings that play once (see
// finales: in game.yaml), after the run's own ending.

{ runs == 0:
    ¡Hola, {hero}! Welcome to the Museo de Leyendas. # clear # pic: museum
    {sibling} is right beside you, and {pet} is wagging so hard his whole back end wiggles.
    Doña Luz waves from the front desk. "My two favorite explorers, and the best corgi in San Juan! I'm so glad you came today."
- else:
    ¡Hola otra vez, {hero}! Welcome back to the Museo de Leyendas. # clear # pic: museum
    {sibling} races ahead, and {pet} is already sniffing the floor for clues.
    { caught > 0:
        Doña Luz beams. "My explorers are back! Your Dragon Field Guide has {caught} {caught == 1:dragon|dragons} in it now. ¡Qué bueno!"
    - else:
        Doña Luz beams. "My explorers are back! I knew you would come."
    }
}
+ [LET'S GO!] -> briefing

= briefing
Museo de Leyendas, Old San Juan. A quiet afternoon. # clear # pic: museum
Doña Luz, the curator, hurries over with her keys jingling. "¡Ay, bendito! Look at the Sleeping Egg!"
The glass case is open. The stone-gray egg is cracked... and EMPTY.
Tiny FOOTPRINTS lead out the door. {pet} sniffs them and wags.
"The legend says a hatchling must be back in its nest by sunset," says Doña Luz, "or it flies off to sea!"
She presses a little notebook into your hands. "Your CASEBOOK. Every clue goes in it. Tap CASEBOOK any time to read it."
-> look

= look
* [LOOK at the EGG] -> shell
* [READ the SIGN] -> sign
* {shell} [FOLLOW the FOOTPRINTS] -> leave

= shell
{sibling} crouches by the empty shell, very still. He has noticed something. # cue: find
"Your first clue!" says Doña Luz. # clue
"The rest are out there, wherever the hatchling went."
-> look

= sign
The sign says: EL HUEVO DORMIDO, the Sleeping Egg.
It crossed the ocean on a ship in the 1500s. Sailors said it would hatch on the night every coquí frog sang at once.
"Last night," Doña Luz whispers, "they did."
-> look

= leave
"I'll get the van!" says Doña Luz. "The footprints go out the door and down the street."
She unfolds a MAP on the hood. "You pick the way, {hero}."
-> DONE

= casefile
Everyone piles back into the van, and {pet} takes the front seat. # clear # pic: casefile
Doña Luz turns around. "That's every clue, {hero}. So which dragon hatched?"
"Open the CASE FILE and check each dragon against your clues. Pick the wrong one, and we drive to the wrong place!"
-> DONE

= home
{ minutes > sunset:
    Back at the Museo de Leyendas. The sun is down and the first stars are out. # clear # pic: museum
    The hatchling is fast asleep in its basket.
- else:
    Back at the Museo de Leyendas. # clear # pic: museum
    The hatchling peeks out of its basket and squeaks at the empty nest.
}
But the glass case has snapped shut, and there's a LOCK on it.
{sibling} points at your casebook. "The numbers!" # slot: lock
+ [@pass] -> nest
+ [@fail] -> slow

= slow
Doña Luz reads the numbers from your casebook with you, one at a time.
~ minutes += 5
-> nest

= nest
The glass case swings open. # clear # pic: nest
{ minutes > sunset:
    Doña Luz lifts the sleeping dragon into its nest, under the stars in the window. It doesn't even wake up.
    "Home at last," she whispers. "Next time, let's beat the sunset."
- else:
    { minutes > sunset - 30:
        The dragon squeezes into its nest. It barely fits! It's asleep before you can close the case. That was close!
    - else:
        The dragon squeezes into its nest. It barely fits in the case anymore! It curls up and closes its eyes.
        Doña Luz claps her hands. "Home long before sunset! ¡Gracias, {hero}!"
    }
}
{ detours > 0: "And we saw some real animals on the way," she laughs. "Even if we didn't mean to." }
A new page fills itself in, in your Dragon Field Guide. # caught # cue: hatch
Doña Luz counts up your quest. # rate
She sets the egg on the shelf beside the nest. # tune: ending
Then, in the case next door, another egg starts to WOBBLE...
-> DONE

// ---------------------------------------------------------------------------
// THE MOTHER DRAGON. Plays once, after the run that catches the last of the
// eight dragons.

= mother
The egg wobbles... and stops. The whole museum goes quiet. # clear # pic: museum
Then the windows start to rattle.
Every hatchling is awake, all eight of them, with their noses pressed to the glass, looking out at the sea.
"¡Escuchen!" whispers Doña Luz. Listen!
From far away comes a long, low song. It sounds like a coquí, a parrot, and the ocean, all at once. # tune: mother
{pet} barks once and runs for the door.
+ [FOLLOW {pet}!] -> mother_wall

= mother_wall
You run up the hill to El Morro, and the hatchlings scramble after you. # clear # pic: mother
The sun is going down into the sea. And on top of the old wall sits a DRAGON. A huge one, bigger than the van!
Her scales are green like the iguana's. Her forehead is red like the parrot's. Her wings are blue, and the tip of her tail glows like the bay.
"La MAMÁ," whispers {sibling}. The MOTHER DRAGON!
The eight hatchlings squeak and tumble across the grass to her. She nuzzles every one.
Then she lowers her great big head, right down to {hero}. Her eye is as big as a pizza. It's warm, and kind.
"She crossed the whole ocean looking for her babies," says Doña Luz softly. "And you found every one."
The mother dragon rumbles one word, deep as a drum: "GRACIAS."
+ [SAY "¡DE NADA!"] -> mother_bye

= mother_bye
"¡De nada!" says {hero}. That means "you're welcome."
She touches her nose to {hero}'s hand, then to {sibling}'s, then to {pet}'s. {pet} sneezes. # cue: find
"The little ones want to stay with us for a while, to learn," says Doña Luz. "Dragons always come home. So will she."
The mother dragon spreads her wings and flies off over the sea, toward the first star. # cue: hatch
Doña Luz squeezes your hand. "They say if all eight eggs on the shelf ever turn GOLD, she'll come back for something special."
-> DONE

// ---------------------------------------------------------------------------
// EIGHT GOLD EGGS. Plays once, after the run that turns the last egg gold.

= mother_gold
Doña Luz sets the egg on the shelf and steps back. # clear # pic: gold-eggs
EIGHT gold eggs in a row! One for every dragon.
One by one, the eggs start to glow. Then they all hum together, like a song you almost know. # tune: mother
Outside, something lands with a THUMP that shakes the floor.
{sibling} runs to the window. "SHE CAME BACK!"
+ [RUN OUTSIDE] -> mother_ride

= mother_ride
The mother dragon is waiting in the plaza, and the hatchlings are already climbing onto her back.
"Súbanse," she rumbles. Climb on.
{hero} climbs up first, then {sibling}. Doña Luz lifts {pet} up. He is not sure about this.
"¡Buen viaje!" calls Doña Luz from the steps. Have a good trip!
+ [HOLD ON TIGHT!] -> mother_fly

= mother_fly
One push of her great blue wings, and you're up in the sky. # clear # pic: mother-flight
Below you, Old San Juan twinkles. There's El Morro, and the lawn where the kites fly.
The parrot dragon and the bat dragon flap along beside you. The glow dragon zooms ahead.
Far away, the mountains of El Yunque poke up through the clouds. Yokahú Tower is down there somewhere!
Then the dark bay. She skims it with her tail, and the whole bay lights up blue and green. # cue: find
{pet} barks at the glowing water. {sibling} can't stop laughing.
+ [FLY HOME] -> mother_crown

= mother_crown
She lands on El Morro under the moon. Doña Luz is waiting on the grass. # clear # pic: mother-stars
The hatchlings slide down her tail, one after another.
Then she bows her head to {hero}. "{hero}. GUARDIÁN DE LOS DRAGONES." The guardian of the dragons.
"And me?" asks {sibling}.
"Y {sibling}," she rumbles. "Y {pet}." {pet} wags so hard he falls over.
She flies up and up, until she is one more star over the sea. # cue: hatch
Your Dragon Field Guide has a gold page now, just for her.
-> DONE

