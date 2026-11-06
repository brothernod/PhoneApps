// Corgidoku art: Cheddar (a tailless red-and-white Pembroke), paw marks, treats.
// All inline SVG strings so everything works offline.

const ORANGE = '#E98A3A', ORANGE_DK = '#C96A22', WHITE = '#FFF8F0', INK = '#3A2418', PINK = '#FF9EB8';

// Cheddar's head. Used on the board.
export function cheddarHead({ blink = false } = {}) {
  return `<svg viewBox="0 0 100 100" class="corgi" aria-label="corgi">
  <path d="M14 46 L22 6 Q26 2 31 6 L46 30 Z" fill="${ORANGE}" stroke="${ORANGE_DK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M86 46 L78 6 Q74 2 69 6 L54 30 Z" fill="${ORANGE}" stroke="${ORANGE_DK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M22 38 L26 14 L38 31 Z" fill="${PINK}"/>
  <path d="M78 38 L74 14 L62 31 Z" fill="${PINK}"/>
  <ellipse cx="50" cy="56" rx="36" ry="31" fill="${ORANGE}" stroke="${ORANGE_DK}" stroke-width="2"/>
  <path d="M50 27 C45 36 43 44 42 52 C34 58 30 66 32 74 C38 84 62 84 68 74 C70 66 66 58 58 52 C57 44 55 36 50 27 Z" fill="${WHITE}"/>
  ${blink
    ? `<path d="M31 52 Q36 56 41 52" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M59 52 Q64 56 69 52" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<circle cx="36" cy="52" r="5.5" fill="${INK}"/><circle cx="64" cy="52" r="5.5" fill="${INK}"/><circle cx="37.8" cy="50" r="1.8" fill="#fff"/><circle cx="65.8" cy="50" r="1.8" fill="#fff"/>`}
  <ellipse cx="50" cy="63" rx="6" ry="4.2" fill="${INK}"/>
  <path d="M50 67 Q50 72 44 73 M50 67 Q50 72 56 73" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="27" cy="64" r="5" fill="${PINK}" opacity=".55"/><circle cx="73" cy="64" r="5" fill="${PINK}" opacity=".55"/>
</svg>`;
}

// Full Cheddar in a loaf, for the home screen and celebrations.
export function cheddarLoaf({ hat = '' } = {}) {
  return `<svg viewBox="0 0 160 140" class="cheddar-loaf" aria-label="Cheddar the corgi">
  <ellipse cx="80" cy="132" rx="62" ry="7" fill="#000" opacity=".08"/>
  <path d="M20 112 C18 84 40 72 80 72 C120 72 142 84 140 112 C140 126 124 130 80 130 C36 130 20 126 20 112 Z" fill="${ORANGE}" stroke="${ORANGE_DK}" stroke-width="2.5"/>
  <path d="M56 80 C60 100 62 116 60 130 L100 130 C98 116 100 100 104 80 Z" fill="${WHITE}"/>
  <ellipse cx="58" cy="128" rx="14" ry="8" fill="${WHITE}" stroke="#E9D8C8" stroke-width="2"/>
  <ellipse cx="102" cy="128" rx="14" ry="8" fill="${WHITE}" stroke="#E9D8C8" stroke-width="2"/>
  <g transform="translate(30 0)">${cheddarHead().replace('<svg viewBox="0 0 100 100" class="corgi" aria-label="corgi">', '<svg x="0" y="0" width="100" height="100" viewBox="0 0 100 100">')}</g>
  ${hat}
</svg>`;
}

export const partyHat = `<g transform="translate(66 -6) rotate(12)"><path d="M14 30 L26 0 L38 30 Z" fill="#FF6FB5" stroke="#C93F86" stroke-width="2"/><circle cx="26" cy="0" r="5" fill="#FFE870"/><path d="M18 21 L34 21 M21 13 L31 13" stroke="#FFE870" stroke-width="3"/></g>`;

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
