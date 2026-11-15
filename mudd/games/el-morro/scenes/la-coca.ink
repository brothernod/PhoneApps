// LA COCA FALLS, EL YUNQUE. Slots: gauge (Ranger Inés and her rain chart),
// sign (the scratched sign). The gauge earns the clue and the sign earns the
// lock number. Tags are listed at the top of museum.ink.

The road climbs into El Yunque, the rainforest. Around a bend, there it is: LA COCA FALLS. # clear # pic: la-coca
Water slides down a wall of dark rock as tall as a building, and the spray tickles your face.
{pet} barks at the waterfall. The waterfall does not care.
-> choose

= choose
* [TALK to the RANGER by the FALLS] -> gauge
* [READ the SIGN at the LOOKOUT] -> sign
* -> leave

= gauge
Ranger Inés is checking her rain gauge, a tube that catches the rain so she can measure it.
She keeps a chart for every day: lunes, martes, miércoles. That's Monday, Tuesday, Wednesday.
"A little dragon? Something small went right past here," she says. "Help me finish my notes, and I'll show you where." # slot: gauge
+ [@pass] -> gauge_pass
+ [@fail] -> gauge_fail

= gauge_pass
"¡Muy bien! My notes are done." Ranger Inés tucks her pencil behind her ear. # cue: find
"It went that way, along the wet rocks." {sibling} is already crouching there. # clue
-> choose

= gauge_fail
Ranger Inés works through it with you, one step at a time. A cloud drifts over while you think.
~ minutes += 15
"It went that way, along the wet rocks," she says. {sibling} is already crouching there. # clue
-> choose

= sign
A sign at the lookout tells about the falls and the animals of the forest. Someone with tiny claws has been at it: the words are scratched and the pictures are knocked crooked.
{pet} sniffs the sign and sneezes. Something here needs fixing! # slot: sign
+ [@pass] -> sign_pass
+ [@fail] -> sign_fail

= sign_pass
{pet} wags. You wipe the wet sign with your sleeve, and there is something under the scratches. # cue: find
A little scorch mark, right on the signpost. # digit
-> choose

= sign_fail
{pet} lets out a very big corgi sigh. You read the whole sign again, slowly.
~ minutes += 15
Then {sibling} wipes the wet signpost with his sleeve. There's a little scorch mark on it. # digit
-> choose

= leave
The footprints cross the road and head back down the hill. Everybody into the van!
-> DONE
