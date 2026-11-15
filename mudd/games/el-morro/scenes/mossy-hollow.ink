// THE MOSSY HOLLOW: the coquí dragon's lair. A lair belongs to one creature,
// so this card may name it. Slot: rescue. Toy: song.
// Tags are listed at the top of museum.ink.

The van climbs into El Yunque and stops where a little stream crosses under the road. # clear # pic: hollow-song
Under the roots of a giant tree there is a mossy hollow. The leaves are so thick that it's as dim as evening down here.
{pet} tilts his head. From the moss comes a tiny voice with two notes: co-KEE!
"It's singing to say I'M HERE," whispers Doña Luz. "Sing back to it, {hero}. The same notes, in the same order." # toy: song
The singing stops. Two big eyes blink in the dark. It heard you!
-> found

= found
Something hops out of the moss, right onto a wet leaf. It's bigger than you thought! # clear # pic: hollow-dragon # cue: hatch
It's a big round dragon with smooth, shiny skin and great big eyes.
It's the COQUÍ DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the big travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon blinks its big eyes... then hop, hop, hop, right up to your shoes!
-> herd

= rescue_fail
The dragon plops into the stream and hides under a leaf. You wait, very quietly, until it peeks out again.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon hops right up to your shoes.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
