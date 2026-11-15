// THE BIG PLAZA TREE: the iguana dragon's lair. A lair belongs to one
// creature, so this card may name it. Slot: rescue. Toy: tail.
// Tags are listed at the top of museum.ink.

The van stops at a little plaza with a big shady tree. # clear # pic: plaza
A street cat is asleep on the bench. {pet} tiptoes past it. Corgis are not good at tiptoeing.
Leaves drift down, but there is no wind. Something is up in that tree. # toy: tail
A long green TAIL swishes between the leaves. You spotted it! # cue: find
-> found

= found
You look up. Way, way up. # clear # pic: dragon # cue: hatch
On a sunny branch sits a little green dragon with spikes down its back. It nods its head: yes, yes, yes.
It's the IGUANA DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon tilts its head... then scrambles down the trunk!
-> herd

= rescue_fail
The dragon darts back into the leaves to hide. You wait, very quietly, until it peeks out again.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon scrambles down the trunk.
-> herd

= herd
{pet} trots in a careful circle around it and herds it into the basket, just like corgis herd cows. # cue: find
-> DONE
