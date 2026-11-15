// JUAN DIEGO FALLS, EL YUNQUE. Slots: rocks (getting across the stream),
// hiker (a hiker who speaks Spanish). The rocks earn the clue and the hiker
// earns the lock number. Tags are listed at the top of museum.ink.

A short, muddy trail winds through the rainforest to JUAN DIEGO FALLS. # clear # pic: juan-diego
The waterfall drops into a green pool. Everything here is dripping: the leaves, the rocks, and now {pet}.
The footprints go down to the stream.
-> choose

= choose
* [CROSS the STREAM on the ROCKS] -> rocks
* [SAY HELLO to the HIKER] -> hiker
* -> leave

= rocks
Wet rocks stick up out of the stream like a path. {pet} puts one paw on the first rock, then sits down.
He will NOT budge. "Getting a corgi across a stream is a puzzle," says Doña Luz. # slot: rocks
+ [@pass] -> rocks_pass
+ [@fail] -> rocks_fail

= rocks_pass
That did it! {pet} hops from rock to rock, and everybody gets across with dry socks. # cue: find
On the far bank, {sibling} points at the mud. # clue
-> choose

= rocks_fail
You work it out together, and Doña Luz carries {pet} over the slippery part. That takes a while.
~ minutes += 15
On the far bank, {sibling} points at the mud. # clue
-> choose

= hiker
A hiker with a big backpack is resting on a rock by the pool. She waves at you.
"She only speaks Spanish," Doña Luz whispers. "Go on. You can do it!" # slot: hiker
+ [@pass] -> hiker_pass
+ [@fail] -> hiker_fail

= hiker_pass
"¡Qué bien hablas!" The hiker laughs and points behind the rock she is sitting on. # cue: find
Something small scratched the stone back there. # digit
-> choose

= hiker_fail
The hiker says it again, slowly, and Doña Luz helps you answer. That takes a while.
~ minutes += 15
Then the hiker points behind the rock she is sitting on. Something small scratched the stone back there. # digit
-> choose

= leave
The footprints go back up the muddy trail. {pet} needs a towel. Everybody into the van!
-> DONE
