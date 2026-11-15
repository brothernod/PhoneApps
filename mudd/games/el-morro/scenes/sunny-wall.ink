// EL MORRO'S SUNNIEST WALL: the anole dragon's lair. A lair belongs to one
// creature, so this card may name it. Slot: rescue. Toy: pushups.
// Tags are listed at the top of museum.ink.

The van stops under El Morro's sunniest wall. The old stones are as warm as toast. # clear # pic: wall
{pet} flops down in the sun. {sibling} shades his eyes and points.
Halfway up the wall, something goes up, down, up, down. # pic: wall-dragon # cue: hatch
A big dragon with an orange flag under its chin is doing PUSH-UPS!
It's the ANOLE DRAGON, just like your clues said!
"Push-ups are how it says LOOK AT ME," Doña Luz whispers. "Count them, then answer with the same number!" # toy: pushups
The dragon stops and stares. You speak its language!
-> found

= found
But it still looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the big travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon tilts its head... then scurries down the warm stones!
-> herd

= rescue_fail
The dragon zips into a crack in the wall to hide. You wait, very quietly, until it peeks out again.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon scurries down the warm stones.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
