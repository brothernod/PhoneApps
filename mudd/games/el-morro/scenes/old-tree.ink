// THE OLD TREE: the parrot dragon's lair. A lair belongs to one creature,
// so this card may name it. Slot: rescue. Toy: call.
// Tags are listed at the top of museum.ink.

The van climbs into El Yunque and stops under the tallest, oldest tree you have ever seen. # clear # pic: tree-call
Way up high, where a branch broke off long ago, there is a dark HOLLOW in the trunk.
{pet} barks at it. Something up there answers: SQUAWK!
"Parrot families stay close together, and they are LOUD," Doña Luz whispers. "Call to it, {hero}. Maybe it will answer!" # toy: call
It leans out of the hollow, spreads its wings, and JUMPS. A flash of BLUE feathers!
-> found

= found
A little green dragon glides down in a wide circle and lands on a low branch. # clear # pic: tree-dragon # cue: hatch
It has a red forehead, and the feathers at the tips of its wings are bright blue.
It's the PARROT DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon tilts its head... then flutters down and lands on your shoulder!
-> herd

= rescue_fail
The dragon flaps back up to a higher branch and squawks. You wait, very quietly, until it hops down again.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon flutters down and lands on your shoulder.
-> herd

= herd
{pet} trots in a careful circle under it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
