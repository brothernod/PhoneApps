// THE SENTRY BOX, EL MORRO. Slots: cannon (the spilled cannonballs), sign
// (the scratched sign). The cannonballs earn the clue and the sign earns the
// lock number. Tags are listed at the top of museum.ink.

El Morro, the old fort at the edge of the sea. The wind smells like salt. # clear # pic: garita
A little stone tower sticks out from the corner of the wall. It's a sentry box. In Spanish: la GARITA.
Long ago a soldier stood inside and watched for ships. Today the footprints go right up to it.
-> choose

= choose
* [FOLLOW the wall to the CANNONBALLS] -> cannon
* [READ the SIGN by the garita] -> sign
* -> leave

= cannon
A stack of old cannonballs has tumbled across the path. Something small knocked it over on the way past.
"We can't leave them like this," says Doña Luz. "Let's set them right." # slot: cannon
+ [@pass] -> cannon_pass
+ [@fail] -> cannon_fail

= cannon_pass
Clunk. The last cannonball rolls back into place. # cue: find
{sibling} is on his hands and knees behind the stack. "Look! Look!" # clue
-> choose

= cannon_fail
You stack them, and count, and stack them again. That takes a while.
~ minutes += 15
{sibling} is on his hands and knees behind the stack. "Look! Look!" # clue
-> choose

= sign
A sign by the garita tells about the fort. But someone with tiny claws has scratched an extra line into it.
{pet} sniffs the sign and sneezes. One of these lines doesn't belong! # slot: sign
+ [@pass] -> sign_pass
+ [@fail] -> sign_fail

= sign_pass
{pet} wags. You rub the scratched line with your thumb, and something is hiding under the dust. # cue: find
It leads to a black scorch mark inside the garita, no bigger than your hand. # digit
-> choose

= sign_fail
{pet} lets out a very big corgi sigh. You read the whole sign again, slowly.
~ minutes += 15
Then {sibling} peeks inside the garita and finds a black scorch mark, no bigger than your hand. # digit
-> choose

= leave
The footprints hop down from the wall and head back toward the road. Off you go!
-> DONE
