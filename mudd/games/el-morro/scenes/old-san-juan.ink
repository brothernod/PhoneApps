// OLD SAN JUAN STREETS. Slots: cart (Don Tito needs help), doors (which door?).
// Tags are listed at the top of museum.ink.

Old San Juan. Blue cobblestones, houses painted every color, and the smell of the sea. # clear # pic: old-san-juan
The footprints are faint here. {pet} pulls toward a little cart with a striped umbrella.
"¡Buenos días!" calls Don Tito, the piragua man. A piragua is shaved ice with sweet syrup poured on top.
-> choose

= choose
* [TALK to DON TITO] -> tito
* [CLIMB the STREET of COLORS] -> houses
* -> leave

= tito
"A little dragon? ¡Sí! It ran right past me," says Don Tito. "And look what happened!" # pic: cart
{pet} has his front paws, the white ones, up on the cart. Uh oh.
"Help me out," Don Tito laughs, "and I'll show you what your dragon left behind." # slot: cart
+ [@pass] -> tito_pass
+ [@fail] -> tito_fail

= tito_pass
"¡Perfecto! ¡Gracias!" Don Tito gives everyone a cherry piragua. # cue: find
"Your hatchling hopped up on my cart," he says, "and it dropped this." # clue
-> choose

= tito_fail
Don Tito works it out with you, step by step. That takes a while.
~ minutes += 15
"Your hatchling hopped up on my cart," he says, "and it dropped this." # clue
-> choose

= houses
The street of colors climbs uphill. Every house is painted a different color. # clear # pic: houses
{sibling} tugs your sleeve and points. "The footprints go to one of these doors!"
But which one? You'll need your Spanish. # slot: doors
+ [@pass] -> houses_pass
+ [@fail] -> houses_fail

= houses_pass
The door creaks open onto a sunny courtyard. # cue: find
Muddy footprints cross the tiles, and {sibling} picks something up. # clue
-> choose

= houses_fail
You knock on the wrong doors. A grandma gives {pet} a cookie. Nice, but slow.
~ minutes += 15
At last you find the right door. In the courtyard, {sibling} picks something up. # clue
-> choose

= leave
The footprints head on up the hill. {pet} is already pulling on the leash.
-> DONE
