// THE CAVE OF VINES: the boa dragon's lair. A lair belongs to one creature,
// so this card may name it. Slot: rescue. Toy: vine.
// Tags are listed at the top of museum.ink.

The van bumps up a hill road until the road runs out. # clear # pic: cave-vines
A cave opens in the rock like a big sleepy mouth, with vines hanging down all across it.
{pet} sniffs the air and sits down. He isn't sure about this one.
"Nothing here but vines," says {sibling}. Then one of the vines BLINKS. # toy: vine
You found it! That is NOT a vine. # cue: find
-> found

= found
The vine uncurls and lifts its head. # clear # pic: cave-dragon # cue: hatch
It's a little dragon with no legs at all, and it was holding perfectly still.
It's the BOA DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon tilts its head... then slides down the vines like a ribbon!
-> herd

= rescue_fail
The dragon pulls itself back up into the vines and holds still again. You wait, very quietly, until it peeks out.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon slides down the vines like a ribbon.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
