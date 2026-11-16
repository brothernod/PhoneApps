// THE POND. Slot: snack.

A still pond with lily pads. # clear # pic: pond
{sibling} finds a lunch box on the dock. # slot: snack
+ [@pass] -> pass
+ [@fail] -> fail

= pass
"Got it!" A clue is stuck to the lid. # clue
-> lock

= fail
You work it out together. It takes a while.
~ minutes += 15
A clue is stuck to the lid. # clue
-> lock

= lock
A number is painted on the dock. # digit
-> DONE
