// THE MEADOW. Slot: snack. A place gives one clue and one lock number.

Tall grass and buttercups. # clear # pic: meadow
{pet} stops at a picnic blanket. Someone left snacks out. # slot: snack
+ [@pass] -> pass
+ [@fail] -> fail

= pass
"That's it!" Under the blanket is a clue. # clue
-> lock

= fail
You count them up together. It takes a while.
~ minutes += 15
Under the blanket is a clue. # clue
-> lock

= lock
Someone scratched a number on a stone. # digit
-> DONE
