// YOKAHÚ TOWER, EL YUNQUE. Slots: stairs (halfway up), top (the ranger at
// the top). The stairs earn the clue and the top earns the lock number.
// Tags are listed at the top of museum.ink.

El Yunque, the rainforest. Everything drips, and everything is green. # clear # pic: yokahu
A tall stone tower pokes up out of the trees. It's Yokahú Tower, and the footprints go right in the door.
"That is a LOT of stairs," says Doña Luz. "I'll wait down here with the snacks."
-> choose

= choose
* [CLIMB the STAIRS] -> stairs
* {stairs} [LOOK OUT from the TOP] -> top
* -> leave

= stairs
The stairs wind up and up inside the tower. {pet}'s short legs are working hard.
Halfway up, {sibling} stops. "Wait. Look at this." # slot: stairs
+ [@pass] -> stairs_pass
+ [@fail] -> stairs_fail

= stairs_pass
You've got it! Up you go. # cue: find
On the next landing, {pet} stops to sniff, and {sibling} crouches down beside him. # clue
-> choose

= stairs_fail
You work it out together, one step at a time. That takes a while.
~ minutes += 15
On the next landing, {pet} stops to sniff, and {sibling} crouches down beside him. # clue
-> choose

= top
The top of the tower! You can see the whole green forest, and far away, the sea.
A ranger with binoculars is up here, with a clipboard and a big sign about the forest. "You look like sharp kids," she says. "Try this one." # slot: top
+ [@pass] -> top_pass
+ [@fail] -> top_fail

= top_pass
"Sharp kids!" The ranger grins and points at the railing. # cue: find
"Somebody small was up here before you. It left a mark." # digit
-> choose

= top_fail
The ranger goes through it with you, slowly. A cloud rolls past while you think.
~ minutes += 15
Then she points at the railing. "Somebody small was up here before you. It left a mark." # digit
-> choose

= leave
The footprints go back down the stairs and off into the trees. Everybody back to the van!
-> DONE
