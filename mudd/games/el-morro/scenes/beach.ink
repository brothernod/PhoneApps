// THE BEACH, NORTH COAST. Slots: shells (what the hero's sibling collected),
// towel (a card game on a beach towel). The shells earn the clue and the
// towel earns the lock number. Tags are listed at the top of museum.ink.

The van stops where the road meets the sea. A long, quiet beach, warm sand, and waves that go shhhh. # clear # pic: beach
{pet} runs straight at the water, then straight back when a wave chases him.
The footprints wander off along the sand.
-> choose

= choose
* [HELP {sibling} with his SHELLS] -> shells
* [VISIT the BEACH TOWEL] -> towel
* -> leave

= shells
{sibling} has been busy. There's a heap of shells by his feet, and {pet} sits right beside it, hoping they are snacks.
"Help me!" says {sibling}. # slot: shells
+ [@pass] -> shells_pass
+ [@fail] -> shells_fail

= shells_pass
All done! {sibling} claps, and {pet} spins in a circle. # cue: find
Then {sibling} goes very still. He has spotted something in the sand, right where the heap was. # clue
-> choose

= shells_fail
You work it out together, with a lot of help from Doña Luz. The tide comes in a little while you think.
~ minutes += 15
Then {sibling} goes very still. He has spotted something in the sand, right where the heap was. # clue
-> choose

= towel
A girl about your age sits on a beach towel, with cards laid out in front of her in neat rows.
"Juego de memoria," she says. A memory game! "¿Quieres jugar?" Do you want to play? # slot: towel
+ [@pass] -> towel_pass
+ [@fail] -> towel_fail

= towel_pass
"¡Ganaste!" You won! The girl grins and points at the leg of her beach chair. # cue: find
Something small was here before you, and it left a mark. # digit
-> choose

= towel_fail
The girl turns the cards over one at a time and says each word for you. That takes a while.
~ minutes += 15
Then she points at the leg of her beach chair. Something small was here before you, and it left a mark. # digit
-> choose

= leave
The footprints head back up the sand to the road. {pet} shakes, and now everybody is sandy. Off you go!
-> DONE
