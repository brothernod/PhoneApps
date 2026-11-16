// OLD SAN JUAN STREETS. Slots: cart (Don Tito needs help), doors (the
// neighbor speaks Spanish).
// A place gives one clue and one lock number: here the cart earns the clue
// and the doors earn the number. Tags are listed at the top of museum.ink.

Old San Juan. Blue cobblestones, houses painted every color, and the smell of the sea. # clear # pic: old-san-juan
The footprints are faint here. {pet} pulls toward a little cart with a striped umbrella.
"¡Buenas tardes!" calls Don Tito, the piragua man. A piragua is shaved ice with sweet syrup poured on top.
-> choose

= choose
* [TALK to DON TITO] -> tito
* [CLIMB the STREET of COLORS] -> houses
* -> leave

= tito
"A little dragon? ¡Sí! It ran right past me," says Don Tito. "And look what happened!" # pic: cart
{pet} has his front paws, the white ones, up on the cart. Uh oh.
"Help me out," Don Tito laughs, "and I'll show you which way it went." # slot: cart
+ [@pass] -> tito_pass
+ [@fail] -> tito_fail

= tito_pass
"¡Perfecto! ¡Gracias!" Don Tito gives everyone a cherry piragua. # cue: find
He points behind his cart. "It stopped right there. Take a look!" # clue
-> choose

= tito_fail
Don Tito works it out with you, step by step. That takes a while.
~ minutes += 15
He points behind his cart. "Your dragon stopped right there. Take a look!" # clue
-> choose

= houses
The street of colors climbs uphill. Every house is painted a different color. # clear # pic: houses
{sibling} tugs your sleeve and points. "The footprints go to one of these doors!"
But which one? A neighbor leans out of her window to help. You'll need your Spanish. # slot: doors
+ [@pass] -> houses_pass
+ [@fail] -> houses_fail

= houses_pass
"¡Eso es!" The neighbor points, and a door creaks open onto a sunny courtyard. # cue: find
Muddy footprints cross the tiles and stop at the wall. # digit
-> choose

= houses_fail
The neighbor says it again, slowly, with her hands. A grandma next door gives {pet} a cookie. Nice, but slow.
~ minutes += 15
At last a door creaks open onto a courtyard. Footprints cross the tiles and stop at the wall. # digit
-> choose

= leave
The footprints head on, out of the old streets. {pet} is already pulling on the leash.
-> DONE
