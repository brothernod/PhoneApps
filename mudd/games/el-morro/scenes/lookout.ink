// THE TOWER VIEW, EL YUNQUE. Slots: sky (the ranger's weather board), packs
// (a family of hikers and their game). The sky earns the clue and the packs
// earn the lock number. Tags are listed at the top of museum.ink.

The lookout deck, high in El Yunque. The whole rainforest rolls downhill from here, all the way to the sea. # clear # pic: lookout
Clouds slide by so low you could almost poke one. {pet} barks at a cloud. The cloud keeps going.
There are tiny wet footprints on the wooden rail.
-> choose

= choose
* [TALK to the RANGER with BINOCULARS] -> sky
* [SAY HELLO to the HIKERS] -> packs
* -> leave

= sky
A ranger with binoculars is watching the clouds roll in and writing on a weather board.
"A little dragon? Something small was up on this rail," he says. "Help me with my board, and I'll show you which way it went." # slot: sky
+ [@pass] -> sky_pass
+ [@fail] -> sky_fail

= sky_pass
"¡Exacto!" The ranger chalks it on his board. # cue: find
He points along the rail, and {sibling} stands on tiptoe to look. # clue
-> choose

= sky_fail
The ranger goes over his board with you, one row at a time. A cloud rolls right over the deck while you think.
~ minutes += 15
Then he points along the rail, and {sibling} stands on tiptoe to look. # clue
-> choose

= packs
A family of hikers is resting by the rail, with their backpacks in a row: big ones, small ones, every color.
The kids wave you over. "Estamos jugando," says the oldest. We're playing a game! "¿Quieres jugar?" # slot: packs
+ [@pass] -> packs_pass
+ [@fail] -> packs_fail

= packs_pass
"¡Muy bien!" The hikers clap, and the littlest one points under the bench. # cue: find
Something small was here before you, and it left a mark on the wood. # digit
-> choose

= packs_fail
The hikers play it again with you, slowly. Doña Luz helps. That takes a while.
~ minutes += 15
Then the littlest one points under the bench. Something small left a mark on the wood. # digit
-> choose

= leave
The footprints hop down off the rail and head for the trail. Down you go!
-> DONE
