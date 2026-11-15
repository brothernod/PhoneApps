// THE GLOWING BAY, BY DAY. Slots: hut (Maritza's kayak hut), dock (the sign
// and the box of cards on the dock). The hut earns the clue and the dock
// earns the lock number. Tags are listed at the top of museum.ink.

A long drive east, to a quiet bay ringed with mangrove trees. Their roots stand in the water like stilts. # clear # pic: bay
By day the water just looks green. "Come back at night," says Maritza, the kayak guide, "and every splash GLOWS."
{pet} sniffs the dock. The footprints are wet, and they go right to the edge.
-> choose

= choose
* [HELP MARITZA at the KAYAK HUT] -> hut
* [LOOK at the SIGN on the DOCK] -> dock
* -> leave

= hut
Maritza is stacking paddles and life jackets at her kayak hut.
"A little dragon? Something small slipped into the mangroves," she says. "Help me at the hut first, and I'll show you where." # slot: hut
+ [@pass] -> hut_pass
+ [@fail] -> hut_fail

= hut_pass
"¡Perfecto!" Maritza hangs up the last life jacket. # cue: find
She points at the mangrove roots, and {sibling} leans over the edge of the dock to look. # clue
-> choose

= hut_fail
Maritza works it out with you, one step at a time. The tide creeps up the dock while you think.
~ minutes += 15
Then she points at the mangrove roots, and {sibling} leans over the edge of the dock to look. # clue
-> choose

= dock
A sign on the dock tells why the bay glows. Beside it, Maritza keeps a box of picture cards for kids who are waiting for a kayak.
{pet} sniffs the sign and sneezes. Somebody small has been at this! # slot: dock
+ [@pass] -> dock_pass
+ [@fail] -> dock_fail

= dock_pass
{pet} wags. He noses at the post under the sign, down low where only a corgi would look. # cue: find
There's a little scorch mark on the wood. # digit
-> choose

= dock_fail
{pet} lets out a very big corgi sigh. You go over the whole thing again, slowly.
~ minutes += 15
Then {pet} noses at the post under the sign. There's a little scorch mark on the wood. # digit
-> choose

= leave
The wet footprints go back up the dock to the road. Into the van!
-> DONE
