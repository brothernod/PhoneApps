// Corgidoku art: Cheddar (a tailless red-and-white Pembroke), paw marks, treats.
// All inline SVG strings so everything works offline.

const RED = '#DE9A52', LINE = '#7A4A22', CREAM = '#FFF9F1', EYE = '#2B1A10', EAR_IN = '#FBEFE4', EAR_PINK = '#F4CFC6', TONGUE = '#FF8AA5', NOSE_SPOT = '#B98C88';

// Ear pieces in head space (200x200). Mirrored for the right ear.
const earL = `<path d="M50 98 C40 72 32 44 36 22 C38 12 47 9 54 15 C68 28 82 50 90 68 Z" fill="${RED}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M54 86 C48 66 44 46 46 31 C49 26 54 27 58 32 C67 44 75 57 80 68 Z" fill="${EAR_IN}"/>
  <path d="M58 76 C54 62 52 48 53 38 C57 44 63 54 68 64 Z" fill="${EAR_PINK}"/>
  <path d="M50 70 L57 74 M48 60 L55 66 M47 50 L53 57" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
const mirror = (svg) => `<g transform="translate(200 0) scale(-1 1)">${svg}</g>`;

// Face pieces in head space.
function face({ blink = false, happy = false } = {}) {
  const eyes = blink
    ? `<path d="M64 112 Q74 120 84 112" stroke="${EYE}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M116 112 Q126 120 136 112" stroke="${EYE}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="74" cy="112" rx="9.5" ry="11" fill="${EYE}"/><ellipse cx="126" cy="112" rx="9.5" ry="11" fill="${EYE}"/>
       <circle cx="77.5" cy="107.5" r="3.8" fill="#fff"/><circle cx="129.5" cy="107.5" r="3.8" fill="#fff"/>
       <circle cx="71" cy="116.5" r="1.7" fill="#fff"/><circle cx="123" cy="116.5" r="1.7" fill="#fff"/>`;
  const mouth = happy
    ? `<path d="M88 141 C90 156 110 156 112 141 Z" fill="${TONGUE}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>`
    : `<path d="M95 144 C95 152 105 152 105 144 Z" fill="${TONGUE}"/>`;
  return `
  <path d="M96 59 L104 59 C105 74 107 88 111 99 C124 106 138 118 152 136 C140 160 120 170 100 170 C80 170 60 160 48 136 C62 118 76 106 89 99 C93 88 95 74 96 59 Z" fill="${CREAM}"/>
  <ellipse cx="80" cy="99" rx="8" ry="4.5" fill="${CREAM}" transform="rotate(-25 80 99)"/>
  <ellipse cx="120" cy="99" rx="8" ry="4.5" fill="${CREAM}" transform="rotate(25 120 99)"/>
  ${eyes}
  <ellipse cx="57" cy="134" rx="10" ry="6" fill="#FF9DB5" opacity=".35"/><ellipse cx="143" cy="134" rx="10" ry="6" fill="#FF9DB5" opacity=".35"/>
  ${mouth}
  <path d="M100 136 L100 141 M100 141 C97 147 90 147 87 142 M100 141 C103 147 110 147 113 142" stroke="${LINE}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M91 128 C91 122 109 122 109 128 C109 133 104 137 100 137 C96 137 91 133 91 128 Z" fill="${EYE}"/>
  <ellipse cx="100" cy="125.5" rx="5" ry="2.6" fill="${NOSE_SPOT}"/><ellipse cx="94.5" cy="128" rx="1.6" ry="1.1" fill="#fff" opacity=".5"/>`;
}

const headShape = `<path d="M100 58 C128 58 150 70 160 92 C166 104 172 112 181 121 L167 126 L175 138 L158 140 C146 160 124 171 100 171 C76 171 54 160 42 140 L25 138 L33 126 L19 121 C28 112 34 104 40 92 C50 70 72 58 100 58 Z" fill="${RED}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>`;

const headGroup = (opts) => `${earL}${mirror(earL)}${headShape}${face(opts)}`;

// Cheddar's head. Used on the board and as the little helper face.
export function cheddarHead(opts = {}) {
  return `<svg viewBox="12 6 176 172" class="corgi" aria-label="corgi">${headGroup(opts)}</svg>`;
}

// Full Cheddar sitting, for the home screen and celebrations.
export function cheddarLoaf({ hat = '', happy = true } = {}) {
  return `<svg viewBox="4 4 192 250" class="cheddar-loaf" aria-label="Cheddar the corgi">
  <ellipse cx="100" cy="244" rx="80" ry="8" fill="#5B2A6E" opacity=".10"/>
  <ellipse cx="44" cy="214" rx="32" ry="26" fill="${RED}" stroke="${LINE}" stroke-width="3.5"/>
  <ellipse cx="156" cy="214" rx="32" ry="26" fill="${RED}" stroke="${LINE}" stroke-width="3.5"/>
  <ellipse cx="30" cy="236" rx="18" ry="9" fill="${CREAM}" stroke="${LINE}" stroke-width="3"/>
  <ellipse cx="170" cy="236" rx="18" ry="9" fill="${CREAM}" stroke="${LINE}" stroke-width="3"/>
  <path d="M60 150 C42 172 44 220 58 238 L142 238 C156 220 158 172 140 150 Z" fill="${RED}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M62 150 L54 170 L66 168 L58 190 L70 188 L66 214 L134 214 L130 188 L142 190 L134 168 L146 170 L138 150 Z" fill="${CREAM}"/>
  <path d="M70 200 C70 192 92 192 92 200 L92 232 C92 240 70 240 70 232 Z" fill="${CREAM}" stroke="${LINE}" stroke-width="3"/>
  <path d="M108 200 C108 192 130 192 130 200 L130 232 C130 240 108 240 108 232 Z" fill="${CREAM}" stroke="${LINE}" stroke-width="3"/>
  <path d="M77 231 L77 237 M85 231 L85 237 M115 231 L115 237 M123 231 L123 237" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>
  ${headGroup({ happy })}
  ${hat}
</svg>`;
}

export const partyHat = `<g transform="translate(118 2) rotate(18)"><path d="M0 52 L22 0 L44 52 Z" fill="#FF6FB5" stroke="#C93F86" stroke-width="3" stroke-linejoin="round"/><circle cx="22" cy="0" r="8" fill="#FFE870" stroke="#E0B92E" stroke-width="2"/><path d="M9 36 L35 36 M14 22 L30 22" stroke="#FFE870" stroke-width="5" stroke-linecap="round"/></g>`;

export function paw(auto = false) {
  return `<svg viewBox="0 0 40 40" class="paw${auto ? ' auto' : ''}" aria-label="paw mark">
  <ellipse cx="20" cy="26" rx="8.5" ry="7"/><circle cx="10" cy="17" r="3.6"/><circle cx="16.5" cy="11" r="3.6"/><circle cx="23.5" cy="11" r="3.6"/><circle cx="30" cy="17" r="3.6"/>
</svg>`;
}

export function treat(full = true) {
  return `<svg viewBox="0 0 48 24" class="treat${full ? '' : ' gone'}" aria-label="${full ? 'treat' : 'eaten treat'}">
  <rect x="10" y="8" width="28" height="8" rx="3"/><circle cx="10" cy="7.5" r="5"/><circle cx="10" cy="16.5" r="5"/><circle cx="38" cy="7.5" r="5"/><circle cx="38" cy="16.5" r="5"/>
</svg>`;
}
