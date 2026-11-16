// THE PEBBLE PILE: Pebble's lair. Slot: count.

A pile of wet, round stones by the water. One of them blinks. # clear # pic: pile
There it is: PEBBLE! # cue: find
It will come out if you can help it count. # slot: count
+ [@pass] -> home
+ [@fail] -> slow

= slow
It rolls under the others, then rolls back out.
~ minutes += 10
-> home

= home
PEBBLE rolls into your hands. Time to go home.
-> DONE
