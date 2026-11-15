// ON THE ROAD: things that can happen on a drive. Each "= part" named in
// on-the-road.yaml is one event, and the dealer picks which ones a run gets.
// An event ends with -> DONE, and then the run goes on to wherever it was
// headed. Slots: jam, lizard, hat. Tags are listed at the top of museum.ink.

-> DONE

= tapon
The van slows down... and stops. Cars and trucks, as far as you can see. # clear # pic: road-jam
"A TAPÓN," sighs Doña Luz. A traffic jam! "Well, detectives. Let's see how long we'll sit here." # slot: jam
+ [@pass] -> tapon_pass
+ [@fail] -> tapon_fail

= tapon_pass
"Right you are." Doña Luz taps the clock on the dashboard. # cue: find
The cars start to roll again. That was 20 minutes of sitting still.
~ minutes += 20
-> DONE

= tapon_fail
Doña Luz counts it out with you on the dashboard clock. By the time you have it, the cars are rolling. That was 25 minutes.
~ minutes += 25
-> DONE

= flat
Thump. Thump. Thump. The van wobbles to the side of the road. # clear # pic: road
"A flat tire!" Doña Luz opens the back door. {hero} rolls out the spare, {sibling} holds the bolts in his hat, and {pet} guards the jack.
~ minutes += 20
Twenty minutes later you're rolling again. Good team.
-> DONE

= rain
The sky goes gray, and then the rain comes down all at once. That's how it rains in a rainforest. # clear # pic: road-rain
Doña Luz pulls over until she can see the road. {pet} watches the wipers go back and forth, back and forth.
~ minutes += 10
Ten minutes later the sun is out, and the whole forest is dripping.
-> DONE

= lizard
Doña Luz stops for a red light. On a fence post right outside your window, a little lizard is doing push-ups. # clear # pic: road
Up, down. Up, down. {sibling} counts twelve. "Quick," says Doña Luz, "before the light turns green!" # slot: lizard
+ [@pass] -> lizard_pass
+ [@fail] -> lizard_fail

= lizard_pass
The light turns green. The lizard does one more push-up, just for you. # cue: find
-> DONE

= lizard_fail
The light turns green before you have it, and Doña Luz tells you the answer as she drives. The lizard keeps going.
-> DONE

= cat
You park and start to walk. A gray street cat is sitting in the middle of the blue cobblestones, right where you need to go. # clear # pic: houses
It puffs up and HISSES at {pet}. {pet} stops. The cat does not move.
* [GO AROUND the CAT]
    You take the long way around the block.
    ~ minutes += 10
    -> DONE
* [Let {pet} SAY HELLO]
    {pet} lies down flat and wags his stubby tail.
    The cat sniffs his nose... and purrs. A new friend! # cue: find
    -> DONE

= drip
Don Tito waves from his piragua cart, and {sibling} can't say no. Coconut, his favorite. # clear # pic: cart
It drips on his shirt, on his shoes, and on {pet}, who doesn't mind one bit.
~ minutes += 5
Five sticky minutes later, you're on your way.
-> DONE

= stop
"I have to go," says {sibling}. "Now." # clear # pic: road
Doña Luz finds a gas station. {pet} gets a drink of water, and everybody gets back in.
~ minutes += 10
That took 10 minutes. Worth it.
-> DONE

= hat
The wind off the sea grabs {hero}'s hat and sends it rolling across the grass! # clear # pic: lawn
"Send {pet}!" says Doña Luz. "But mind the puddles." # slot: hat
+ [@pass] -> hat_pass
+ [@fail] -> hat_fail

= hat_pass
{pet} trots back with the hat in his mouth. It's a little soggy. He's very proud. # cue: find
-> DONE

= hat_fail
{pet} gets there in the end, by way of two puddles. The hat is fine. {pet} needs a towel.
~ minutes += 5
-> DONE

= shark
"STOP! THE SHARK!" It's the giant shark statue from your trip, mouth wide open, right by the road. # clear # pic: road
{sibling} has to stand inside its mouth one more time. So does {hero}. So does {pet}, who is not sure about it.
~ minutes += 5
Five minutes. Totally worth it.
-> DONE
