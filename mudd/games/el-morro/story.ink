// THE DRAGON OF EL MORRO: vertical slice (one land)
//
// Prose lives here. The engine reads these tags:
//   # clear              wipe the text window
//   # pic: <scene>       show a picture (museum, streets, cart, houses, plaza, dragon, nest)
//   # tune: <name>       play a tune from banks.yaml
//   # cue: <name>        play a short sound (right, miss, find, hatch, disk)
//   # disk: <n>          PLEASE INSERT DISK n OF 4
//   # guide: <id>        add a dragon to the Field Guide
//   # puzzle: <type> key=value
//                        run a puzzle; it must be followed by [@pass] and [@fail] choices
//
// The names come from cast: in banks.yaml (Holden, Quentin, and Cheddar).
// minutes is the time of day: 540 is 9:00 AM, 1125 is sunset (6:45 PM).

VAR hero = "Holden"
VAR sibling = "Quentin"
VAR pet = "Cheddar"
VAR minutes = 540
VAR sunset = 1125
VAR clues = 0
VAR found_dragon = false

-> museum

=== museum ===
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
{sibling} peeks inside the shell and finds something tiny: a green SCALE, still warm. # cue: find
{pet} sneezes on it.
~ clues += 1
CLUE: the hatchling is GREEN.
-> look

= sign
The sign says: EL HUEVO DORMIDO, the Sleeping Egg.
It crossed the ocean on a ship in the 1500s. Sailors said it would hatch on the night every coquí frog sang at once.
"Last night," Doña Luz whispers, "they did."
-> look

= leave
"I'll get the van!" says Doña Luz. "The footprints point toward the old streets." # disk: 2
~ minutes += 15
-> streets

=== streets ===
Old San Juan. Blue cobblestones, houses painted every color, and the smell of the sea. # clear # pic: streets
The footprints are faint here. {pet} pulls toward a little cart with a striped umbrella.
"¡Buenos días!" calls Don Tito, the piragua man. A piragua is shaved ice with sweet syrup poured on top.
-> choose

= choose
* [TALK to DON TITO] -> tito
* [CLIMB the STREET of COLORS] -> houses
* -> plaza

= tito
"A little green dragon? ¡Sí! It ran right past me," says Don Tito. "And look what happened!" # pic: cart
{pet} has his front paws, the white ones, up on the cart. Uh oh.
"Help me count what's left," Don Tito laughs, "and I'll tell you which way it went." # puzzle: dragon_hoard
+ [@pass] -> tito_pass
+ [@fail] -> tito_fail

= tito_pass
"¡Perfecto! ¡Gracias!" Don Tito gives everyone a cherry piragua. # cue: find
"That dragon napped on my hot umbrella, then ran uphill, sniffing every door."
~ clues += 1
CLUE: the hatchling LOVES warm sun.
-> choose

= tito_fail
Don Tito counts with you, cup by cup. That takes a while.
~ minutes += 15
"That dragon napped on my hot umbrella," he says, "then ran uphill."
~ clues += 1
CLUE: the hatchling LOVES warm sun.
-> choose

= houses
The street of colors climbs uphill. Every house is painted a different color. # clear # pic: houses
{sibling} tugs your sleeve and points. "The footprints go to one of these doors!"
A note is stuck to the lamp post. It's written in Spanish. # puzzle: magic_words topic=colors
+ [@pass] -> houses_pass
+ [@fail] -> houses_fail

= houses_pass
The door creaks open onto a sunny courtyard. # cue: find
Muddy footprints go straight UP the wall and over the roof!
~ clues += 1
CLUE: the hatchling CLIMBS like a lizard.
-> choose

= houses_fail
You knock on the wrong doors. A grandma gives {pet} a cookie. Nice, but slow.
~ minutes += 15
At last you find the right door. Muddy footprints go straight UP the wall!
~ clues += 1
CLUE: the hatchling CLIMBS like a lizard.
-> choose

=== plaza ===
At the top of the hill is a little plaza with a big shady tree. # clear # pic: plaza
A street cat on the bench puffs up and HISSES at {pet}.
* [GO AROUND the CAT]
    You take the long way around the plaza.
    ~ minutes += 10
* [Let {pet} SAY HELLO]
    {pet} lies down flat and wags his stubby tail.
    The cat sniffs his nose... and purrs. A new friend!
- Something rustles high in the tree. Leaves drift down. A long tail swishes.
{pet} sits, stares up, and looks very serious. He has something to tell you. # puzzle: fact_or_fib topic=iguana
+ [@pass] -> sniff_pass
+ [@fail] -> sniff_fail

= sniff_pass
"Good boy!" {pet} was right, and now you know what kind of animal to look for. # cue: find
~ clues += 1
-> found

= sniff_fail
{pet} lets out a very big corgi sigh.
~ minutes += 15
-> found

=== found ===
You look up. Way, way up. # clear # pic: dragon
On a sunny branch sits a little green dragon with spikes down its back.
It bobs its head and does three tiny push-ups.
Green. Loves the sun. Climbs walls. It's an IGUANA DRAGON!
It looks scared, and it doesn't seem to understand English.
"Hatchlings only know Spanish!" Doña Luz calls from the van. "Call it down!"
-> call

= call
+ [Say "¡VEN!"] -> ven
+ [Say "¡DUERME!"] -> duerme
+ [Say "¡VUELA!"] -> vuela

= duerme
DUERME means SLEEP. The dragon yawns, curls up on the branch, and snores. # cue: miss
{sibling} giggles. You wait for it to wake up.
~ minutes += 10
-> call

= vuela
VUELA means FLY. The dragon flaps its tiny wings, loops once around the tree, and lands on the very same branch. Show-off. # cue: miss
~ minutes += 5
-> call

= ven
VEN means COME. The dragon tilts its head... then scrambles down the trunk! # cue: right
{pet} trots in a careful circle around it and herds it to the van, just like corgis herd cows.
~ found_dragon = true
-> home

=== home ===
~ minutes += 15
Back at the Museo de Leyendas. # clear # pic: nest
The little dragon climbs into its nest and curls up inside the warm eggshell.
{ minutes <= sunset - 30:
    Doña Luz claps her hands. "Home long before sunset! ¡Gracias, {hero}!"
- else:
    It falls asleep before you can even close the case.
}
A new page fills itself in, in your Dragon Field Guide. # guide: iguana # cue: hatch
IGUANA DRAGON. Based on the green iguana. Discovered by {hero}.
REAL FACT: green iguanas aren't from Puerto Rico. They came as pets in the 1970s. Now people there call them gallina de palo, "chicken of the trees."
Then, in the case next door, another egg starts to WOBBLE... # tune: ending
THE END of the demo. More places coming soon!
-> END
