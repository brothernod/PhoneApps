// THE DEEPEST TUNNEL ROOM: the bat dragon's lair. A lair belongs to one
// creature, so this card may name it. Slot: rescue. Toy: echo.
// Tags are listed at the top of museum.ink.

The van stops at San Cristóbal, and the ranger lends you her lantern. # clear # pic: tunnel
Down the tunnel, around a corner, and around another. This is the deepest room in the whole fort.
Click, click, click. Something is in here with you.
"Lantern off," whispers Doña Luz. "It finds its way with sound. So can we." # clear # pic: echo-room
Now it's as dark as the inside of a hat. {sibling} holds on to your sleeve. # toy: echo
The echoes drew a shape on the ceiling: two big ears and two folded wings, UPSIDE DOWN!
-> found

= found
You turn the lantern back on, very low. # clear # pic: echo-dragon # cue: hatch
A big furry dragon hangs from the ceiling by its toes, blinking at the light.
It's the BAT DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the big travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon lets go, flips over in the air, and flutters down!
-> herd

= rescue_fail
The dragon scoots across the ceiling into a crack to hide. You wait, very quietly, until it peeks out again.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon flips over and flutters down.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
