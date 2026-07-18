const OFFSETS = {
  c: [[0, -0.265], [0.14, -0.27]],
  e: [[-0.06, -0.265], [0.06, -0.265]],
  g: [[0.06, -0.27], [0.2, -0.252]],
  h: [[-0.08, 0.015], [0.08, 0.015]],
  m: [[-0.28, -0.25], [0.28, -0.25]],
  o: [[-0.225, -0.15], [0.225, -0.15]],
  p: [[-0.06, -0.26], [0.06, -0.26]],
  r: [[-0.06, -0.265], [0.06, -0.265]],
  t: [[-0.19, -0.265], [0.19, -0.265]],
  u: [[-0.218, -0.26], [0.218, -0.26]],
};

const transform = ([x = 0, y = 0]) =>
  `translate(calc(-50% + ${x}em), calc(-50% + ${y}em))`;

export default function getEyeStyle(letter) {
  const [left = [-0.065, 0], right = [0.065, 0]] = OFFSETS[letter.toLowerCase()] ?? [];
  return {
    left: { transform: transform(left) },
    right: { transform: transform(right) },
  };
}
