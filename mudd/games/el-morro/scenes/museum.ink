// MUSEO DE LEYENDAS: the hub. A run starts at the top of this card and
// comes back to "= home" at the end.
//
// A scene card is plain ink. It never names the creature or a puzzle:
//   # slot: <name>   the dealer's puzzle for that slot (see the .yaml);
//                    it must be followed by [@pass] and [@fail] choices
//   # clue           reveal the next clue about this run's creature
//   # caught         add the creature to the Field Guide
//   # clear          wipe the text window
//   # pic: <name>    show a picture
//   # tune: <name>   play a tune from banks.yaml
//   # cue: <name>    play a short sound (right, miss, find, hatch, disk)
// The engine sets: {hero} {sibling} {pet}, minutes, sunset, clues,
// runs (quests finished before this one), and caught (creatures found so far).
// End a card with -> DONE. The engine drives to the next place.

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
Museo de Leyendas, Old San Juan. A quiet morning. # clear # pic: museum
Doña Luz, the curator, hurries over with her keys jingling. "¡Ay, bendito! Look at the Sleeping Egg!"
The glass case is open. The stone-gray egg is cracked... and EMPTY.
Tiny clawed FOOTPRINTS lead out the door. {pet} sniffs them and wags.
"The legend says a hatchling must be back in its nest by sunset," says Doña Luz, "or it flies off to sea!"
-> look

= look
* [LOOK at the EGG] -> egg
* [READ the SIGN] -> sign
+ [FOLLOW the FOOTPRINTS] -> leave

= egg
{sibling} peeks around the empty shell and spots something the hatchling left behind. # cue: find
{pet} sneezes on it. # clue
-> look

= sign
The sign says: EL HUEVO DORMIDO, the Sleeping Egg.
It crossed the ocean on a ship in the 1500s. Sailors said it would hatch on the night every coquí frog sang at once.
"Last night," Doña Luz whispers, "they did."
-> look

= leave
"I'll get the van!" says Doña Luz. "The footprints point toward the old streets."
-> DONE

= home
Back at the Museo de Leyendas. # clear # pic: nest
The little dragon climbs into its nest and curls up inside the warm eggshell.
{ minutes <= sunset - 30:
    Doña Luz claps her hands. "Home long before sunset! ¡Gracias, {hero}!"
- else:
    It falls asleep before you can even close the case.
}
A new page fills itself in, in your Dragon Field Guide. # caught # cue: hatch
Then, in the case next door, another egg starts to WOBBLE... # tune: ending
THE END of the demo. More places coming soon!
-> DONE
