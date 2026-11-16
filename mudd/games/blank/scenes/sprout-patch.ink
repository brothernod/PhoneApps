// THE SPROUT PATCH: Sprout's lair. Slot: count. Toy: leaf.

A patch of tiny green shoots. One of them is wiggling. # clear # pic: patch # toy: leaf
There it is: SPROUT! # cue: find
It will come out if you can help it count. # slot: count
+ [@pass] -> home
+ [@fail] -> slow

= slow
It hides for a bit, then peeks back out.
~ minutes += 10
-> home

= home
SPROUT hops into your hands. Time to go home.
-> DONE
