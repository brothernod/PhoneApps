// THE LANTERN TUNNEL, SAN CRISTÓBAL. Slots: gate (the ranger needs help),
// sign (the sign and the puzzle board on the wall). The gate earns the clue and the sign earns the
// lock number. Tags are listed at the top of museum.ink.

Castillo San Cristóbal, the big fort on the east side of the old city. # clear # pic: tunnel
A long tunnel runs down under the walls. Lanterns glow orange on the ceiling, and your steps echo: tap, tap, tap.
{pet} sniffs the cold stone floor. The footprints go in!
-> choose

= choose
* [TALK to the RANGER at the GATE] -> gate
* [LOOK at the SIGN on the WALL] -> sign
* -> leave

= gate
A ranger with a big ring of keys stands at the tunnel gate.
"A little dragon? Something small ran through here," she says. "Help me with one thing first, and I'll let you in." # slot: gate
+ [@pass] -> gate_pass
+ [@fail] -> gate_fail

= gate_pass
"That's it! ¡Gracias!" The ranger swings the gate open. # cue: find
Just inside, {sibling} stops and points at the floor. # clue
-> choose

= gate_fail
The ranger works it out with you, step by step. That takes a while.
~ minutes += 15
Then she swings the gate open. Just inside, {sibling} stops and points at the floor. # clue
-> choose

= sign
A sign on the tunnel wall tells about the fort, and beside it hangs a puzzle board for kids who visit.
{pet} sniffs along the wall and sneezes. Somebody small has been at this one! # slot: sign
+ [@pass] -> sign_pass
+ [@fail] -> sign_fail

= sign_pass
{pet} wags. He noses at the wall under the sign, down low where only a corgi would look. # cue: find
There's a little scorch mark on the stone. # digit
-> choose

= sign_fail
{pet} lets out a very big corgi sigh. You go over the whole thing again, slowly.
~ minutes += 15
Then {pet} noses at the wall under the sign. There's a little scorch mark on the stone. # digit
-> choose

= leave
The footprints come back out into the sunshine and head for the road. Off you go!
-> DONE
