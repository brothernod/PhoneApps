// THE BAY IN THE DARK: the glow dragon's lair. A lair belongs to one
// creature, so this card may name it. Slot: rescue. Toy: glow.
// Tags are listed at the top of museum.ink.

The van takes the long road east, to a quiet bay ringed with mangrove trees. # clear # pic: bay
"You want to see the glow? It only shows in the dark," says Maritza, the kayak guide. "I know a place." She pushes your kayak off the dock.
You paddle into a tunnel of mangroves. The branches close over your heads until it is as dark as dusk. # clear # pic: bay-dark
{pet} leans over the side and pats the water with one paw. Where he touched it, the water GLOWS.
Something is hiding down there. Light it up! # toy: glow
The glow runs together into one bright shape, and the shape has two eyes.
-> found

= found
A big blue dragon floats up out of the dark water, shining like a night-light. # clear # pic: bay-dragon # cue: hatch
It's smooth as jelly and soaking wet, and it leaves a sparkly trail behind it.
It's the GLOW DRAGON, just like your clues said!
But it looks scared, and it doesn't understand English.
"Hatchlings only know Spanish!" Doña Luz whispers. She opens the big travel basket. # slot: rescue
+ [@pass] -> rescue_pass
+ [@fail] -> rescue_fail

= rescue_pass
The dragon blinks... then swims right up to the kayak, and the water lights up all around it!
-> herd

= rescue_fail
The dragon dims like a lamp and sinks out of sight. You sit very still in the dark, until a faint glow comes back.
~ minutes += 10
Doña Luz helps you say it, and this time the dragon swims right up to the kayak.
-> herd

= herd
{pet} can't run a circle around it in a kayak. So he wags very hard, and the dragon hops into the basket by itself. # cue: find
-> DONE
