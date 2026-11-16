// THE CLUBHOUSE: the hub. A run starts at the top of this card, comes back
// to "= casefile" after the last place, ends at "= home", and plays a finale
// (see finales: in game.yaml) the first time one is earned.
//
// Tags (after a #) tell the engine what to do:
//   # slot: <name>   the dealer's puzzle for that slot (see the .yaml),
//                    followed by [@pass] and [@fail] choices
//   # clue           reveal the next clue about this run's creature
//   # digit          reveal the next lock number (one per place)
//   # toy: <name>    play a toy from the .yaml
//   # caught         add the creature to the Field Guide
//   # rate           count up the run and give its egg
//   # clear  # pic: <name>  # tune: <name>  # cue: <name>
// The engine sets {hero} {sibling} {pet}, and minutes, sunset, clues, stars,
// detours, egg, runs, and caught. End each card with -> DONE.

Welcome to the clubhouse, {hero}! # clear # pic: clubhouse
{sibling} points at the open box. "Something got out!"
+ [LOOK in the BOX] -> box

= box
Inside there is a little nest, and nothing else. {pet} sniffs it. # clue
"Let's follow the trail," says {sibling}.
-> DONE

= casefile
Back in the clubhouse, you spread your clues on the table. # clear # pic: clubhouse
"Which critter got out?" asks {sibling}.
-> DONE

= home
Home at the clubhouse, with the critter in your arms. # clear # pic: clubhouse
But the box has a LOCK on it now. # slot: lock
+ [@pass] -> open
+ [@fail] -> slow

= slow
{sibling} reads the lock numbers out loud, one at a time.
~ minutes += 5
-> open

= open
The box opens, and the critter curls up inside. # caught # cue: hatch
{ minutes > sunset: It's dark out, but it's home. }
You count up the day. # rate # tune: ending
-> DONE

= all_found
Every box in the clubhouse is full! # clear # pic: clubhouse
{hero}, {sibling}, and {pet} found every critter. THE END... for now.
-> DONE
