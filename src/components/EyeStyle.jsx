export const EYE_OFFSETS = Object.freeze({
  a: [[-0.105, -0.1], [0.105, -0.1]],
  b: [[-0.105, -0.26], [0.085, -0.26]],
  c: [[-0.06, -0.255], [0.07, -0.255]],
  d: [[-0.125, -0.26], [0.045, -0.26]],
  e: [[-0.085, -0.26], [0.085, -0.26]],
  f: [[-0.085, -0.26], [0.085, -0.26]],
  g: [[-0.06, -0.255], [0.075, -0.255]],
  h: [[-0.235, -0.09], [0.235, -0.09]],
  i: [[0, -0.12]],
  j: [[0.14, -0.12]],
  k: [[-0.2, -0.15], [0.09, -0.15]],
  l: [[-0.055, 0.29], [0.125, 0.29]],
  m: [[-0.255, -0.165], [0.255, -0.165]],
  n: [[-0.22, -0.11], [0.22, -0.11]],
  o: [[-0.235, -0.105], [0.235, -0.105]],
  p: [[-0.085, -0.26], [0.065, -0.26]],
  q: [[-0.235, -0.105], [0.235, -0.105]],
  r: [[-0.095, -0.26], [0.06, -0.26]],
  s: [[-0.055, -0.26], [0.06, -0.26]],
  t: [[-0.185, -0.26], [0.185, -0.26]],
  u: [[-0.215, 0.08], [0.215, 0.08]],
  v: [[-0.13, 0.055], [0.13, 0.055]],
  w: [[-0.3, 0.035], [0.3, 0.035]],
  x: [[-0.105, -0.105], [0.105, -0.105]],
  y: [[-0.16, -0.18], [0.16, -0.18]],
  z: [[-0.13, -0.26], [0.13, -0.26]],
});

const transform = ([x = 0, y = 0]) =>
  `translate(calc(-50% + ${x}em), calc(-50% + ${y}em))`;

// Raised fallback pair for hidden glyphs: per-letter offsets would leak the letter shape.
const NEUTRAL_OFFSETS = Object.freeze([[-0.08, -0.05], [0.08, -0.05]]);

export default function getEyeStyle(letter, { neutral = false } = {}) {
  if (neutral) return NEUTRAL_OFFSETS.map((offset) => ({ transform: transform(offset) }));
  const baseLetter = letter
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const offsets = EYE_OFFSETS[baseLetter] ?? [[-0.065, 0], [0.065, 0]];
  return offsets.map((offset) => ({ transform: transform(offset) }));
}
