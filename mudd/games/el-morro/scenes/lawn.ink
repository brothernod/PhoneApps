// EL MORRO'S LAWN. Slots: ranger (the kite ranger needs help), stand (the
// kite seller's game). The ranger earns the clue and the stand earns the
// lock number. Tags are listed at the top of museum.ink.

The big green lawn in front of El Morro. The wind never stops here, and the sky is full of kites. # clear # pic: lawn
In Puerto Rico a kite is a CHIRINGA. Long ago, soldiers marched across this grass. Today it belongs to kids and kites.
{pet} sniffs a line of tiny footprints pressed into the grass.
-> choose

= choose
* [TALK to the RANGER with the WHISTLE] -> ranger
* [VISIT the KITE STAND] -> stand
* -> leave

= ranger
A ranger with a whistle is trying to keep a hundred kite strings from tangling.
"A little dragon? Something small ran under the kites," she says. "Help me with one thing, and I'll show you where." # slot: ranger
+ [@pass] -> ranger_pass
+ [@fail] -> ranger_fail

= ranger_pass
"¡Eso es!" That's it! The ranger gives her whistle a happy toot. # cue: find
She points at a patch of flat grass, and {sibling} drops to his knees beside it. # clue
-> choose

= ranger_fail
The ranger works it out with you, one step at a time. Three kites tangle while you think.
~ minutes += 15
Then she points at a patch of flat grass, and {sibling} drops to his knees beside it. # clue
-> choose

= stand
At the edge of the lawn is a kite stand. Chiringas flutter on a line: big ones, small ones, every color, each with something painted on it.
The kite seller grins under his straw hat. "Want to play my game?" # slot: stand
+ [@pass] -> stand_pass
+ [@fail] -> stand_fail

= stand_pass
"¡Ganaste!" You won! The kite seller tips his hat. # cue: find
{pet} has his nose under the stand. There's a little scorch mark on one wooden leg. # digit
-> choose

= stand_fail
The kite seller plays it again with you, slowly, until you get it. That takes a while.
~ minutes += 15
{pet} has his nose under the stand. There's a little scorch mark on one wooden leg. # digit
-> choose

= leave
The footprints run off the grass and back toward the old city. Hold on to your hat!
-> DONE
