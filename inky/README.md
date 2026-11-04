# Inky's Word Reef

A reading game for a child moving from letter sounds to first words. He taps the letter blocks left to right; Inky the octopus jumps up to bonk each one and he hears its sound. He says the word fast, then picks the matching picture.

- Montessori pink-series words only: three sounds, a short vowel, and every letter makes its own sound. No sight words, blends, or silent letters.
- Letters use the classroom colors: pink consonants, blue vowels.
- 6 worlds, 24 levels: short a, i, o, u, e, then vowel switching (pan, pen, pin), then three-word sentences ("Pig on bus.").
- One build round per level: hear a word, tap its letters in order.
- Coins, a closet of colors and hats, a reef of sea friends, and Grumpy Puff at the end of each world.
- Grown-ups corner: press and hold the button on the title screen for 2 seconds. It shows words read, first-try accuracy, and words to practice, and has settings for the daily goal, print or cursive letters, volume, and unlocking every level.

Progress is saved in the browser on each device.

## Files

- `index.html`: the game (styles, markup, word lists, code)
- `voice.js`: the voice clips as base64 MP3, keyed `p_` letter sound, `w_` word, `s_` sentence, `l_` line, `f_` sea friend
- `apple-touch-icon.png`, `manifest.webmanifest`: home-screen icon and app settings

The voice was generated offline with [Kokoro-82M](https://github.com/hexgrad/kokoro) (Apache-2.0), voice `af_heart`. Letter sounds were cut from spoken words and stretched, so continuous sounds hold ("mmm") and stops stay short ("t", not "tuh"). Fonts come from Google Fonts: Andika, Lilita One, and Playwrite US Trad (SIL Open Font License).
