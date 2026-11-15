// THE SAND NEST: the turtle dragon's lair. A lair belongs to one creature,
// so this card may name it. Slot: rescue. Toy: dig.
// Tags are listed at the top of museum.ink.

The van stops at the far end of a quiet beach, where nobody has walked today. # clear # pic: sand-nest
Two wavy lines run up the sand from the water, as if tiny oars were dragged along. They stop at a little bump.
{pet} puts his nose down to dig. "No digging!" says Doña Luz. "Just watch. The sand is moving by itself."
Something under there is digging its own way out. # toy: dig
One more wiggle, and the bump falls open!
-> found

= found
Out of the warm sand pops a little gray dragon, shaking the sand off its head. # clear # pic: sand-dragon # cue: hatch
Its shell is smooth, like leather, and its front feet are shaped like paddles.
It's the TURTLE DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon blinks... then paddles across the sand toward you, leaving two wavy lines behind it!
-> herd

= rescue_fail
The dragon scoots backward and wiggles down into the sand again. You wait, very quietly, until its nose pokes out.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon paddles across the sand toward you.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
