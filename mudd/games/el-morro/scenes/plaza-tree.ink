// THE BIG PLAZA TREE: the iguana dragon's lair. A lair belongs to one
// creature, so this card may name it. Tags are listed at the top of museum.ink.

At the top of the hill is a little plaza with a big shady tree. # clear # pic: plaza
A street cat on the bench puffs up and HISSES at {pet}.
* [GO AROUND the CAT]
    You take the long way around the plaza.
    ~ minutes += 10
* [Let {pet} SAY HELLO]
    {pet} lies down flat and wags his stubby tail.
    The cat sniffs his nose... and purrs. A new friend!
- Something rustles high in the tree. Leaves drift down. A long tail swishes.
{pet} sits, stares up, and looks very serious. He has something to tell you. # slot: sniff
+ [@pass] -> sniff_pass
+ [@fail] -> sniff_fail

= sniff_pass
"Good boy!" {pet} was right, and now you know what kind of animal to look for. # cue: find
-> found

= sniff_fail
{pet} lets out a very big corgi sigh.
~ minutes += 15
-> found

= found
You look up. Way, way up. # clear # pic: dragon
On a sunny branch sits a little green dragon with spikes down its back.
It bobs its head and does three tiny push-ups.
Green scales. Sunny treetops. Nibbled flowers. It's an IGUANA DRAGON!
It looks scared, and it doesn't seem to understand English.
"Hatchlings only know Spanish!" Doña Luz calls from the van. "Call it down!"
-> call

= call
+ [Say "¡VEN!"] -> ven
+ [Say "¡DUERME!"] -> duerme
+ [Say "¡VUELA!"] -> vuela

= duerme
DUERME means SLEEP. The dragon yawns, curls up on the branch, and snores. # cue: miss
{sibling} giggles. You wait for it to wake up.
~ minutes += 10
-> call

= vuela
VUELA means FLY. The dragon flaps its tiny wings, loops once around the tree, and lands on the very same branch. Show-off. # cue: miss
~ minutes += 5
-> call

= ven
VEN means COME. The dragon tilts its head... then scrambles down the trunk! # cue: right
{pet} trots in a careful circle around it and herds it to the van, just like corgis herd cows.
-> DONE
