// The paper-cut kit (design guidelines §6, roadmap F3). Every shape is a closed blob path with
// no strokes, filled from a token, drawn inline — no raster, no external SVG, no icon font.
// Everything here is decor: aria-hidden and pointer-events: none.
//
// The meadow is alive: clouds cross the sky, the sun breathes, and everything planted on the rise
// sways (owner call, 2026-07-25 — it replaced F3's static decor). All of that lives in `App.scss`
// as transform/opacity loops keyed off the class names below, because motion is styling here, not
// state — no timers, no re-renders, and `prefers-reduced-motion` parks every shape at the resting
// position these compositions place it in.
//
// New shapes join this kit; they never get pasted straight into a screen. Compositions live in
// COMPOSITIONS at the bottom, one per phase, and are held to the §6 density budgets.

// Exported so the mode cards can cut their sky from the same silhouette as the page behind them.
export const CLOUD_PATH =
  'M30 85 C 8 85 2 68 12 56 C 6 40 22 26 38 32 C 44 12 74 8 86 24 C 98 10 126 14 130 32 C 150 26 168 40 162 58 C 176 64 174 84 154 85 Z';
const TUFT_PATH = 'M10 40 Q14 18 22 40 Q28 12 36 40 Q44 20 50 40 Z';
// Two stacked paper-cut rises give the welcome, greeting and complete screens a floor to stand on.
const HILL_BACK_PATH =
  'M0 74 C 140 26 268 88 420 58 C 566 30 690 82 838 52 C 966 26 1090 62 1200 34 L1200 200 L0 200 Z';
const HILL_FRONT_PATH =
  'M0 122 C 132 92 240 132 392 112 C 548 92 660 128 812 108 C 952 90 1082 122 1200 100 L1200 200 L0 200 Z';

const SPARKLE_PATH = 'M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z';
const SPROUT_STEM_PATH = 'M17 60 C17 42 19 30 19 16 L23 16 C23 30 22 42 23 60 Z';
const SPROUT_LEAF_PATH =
  'M19 36 C9 36 3 27 5 18 C14 17 21 25 19 36 Z M23 29 C23 18 30 11 38 13 C39 23 32 30 23 29 Z';
const BUTTERFLY_WING_PATH =
  'M29 25 C20 10 6 6 3 15 C0 25 13 31 29 27 Z M29 27 C20 30 10 37 13 45 C19 50 27 40 29 29 Z ' +
  'M31 25 C40 10 54 6 57 15 C60 25 47 31 31 27 Z M31 27 C40 30 50 37 47 45 C41 50 33 40 31 29 Z';
const BUTTERFLY_BODY_PATH =
  'M30 18 C32 18 33 23 33 29 C33 36 32 41 30 41 C28 41 27 36 27 29 C27 23 28 18 30 18 Z';
const BIRD_BODY_PATH =
  'M10 25 C10 14 19 7 30 7 C41 7 49 13 51 20 L59 23 L50 26 C48 33 39 37 29 37 C17 37 10 32 10 25 Z';
const BIRD_WING_PATH = 'M21 21 C27 19 36 21 40 26 C34 31 24 30 21 21 Z';

const rad = (deg) => (deg * Math.PI) / 180;
const polar = (r, deg) => `${(r * Math.cos(rad(deg))).toFixed(1)} ${(r * Math.sin(rad(deg))).toFixed(1)}`;

// A quarter disc in the corner plus five stubby triangle rays, built once at module load so the
// sun stays a two-node shape instead of a dozen hand-typed coordinates.
const SUN_DISC_PATH = 'M0 0 L96 0 A96 96 0 0 1 0 96 Z';
const SUN_RAYS_PATH = [10, 30, 50, 70, 86]
  .map((deg) => `M${polar(99, deg - 4.5)}L${polar(126, deg)}L${polar(99, deg + 4.5)}Z`)
  .join('');

// A circle written as a path, so a flower is one petal path plus one centre instead of six nodes.
const disc = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
const FLOWER_PETALS_PATH = [
  [30, 14],
  [46, 26],
  [40, 44],
  [20, 44],
  [14, 26],
]
  .map(([cx, cy]) => disc(cx, cy, 10))
  .join('');

// --- the kit -------------------------------------------------------------------------------
// Each shape takes the placement class its composition assigns. Colour comes from a token name
// so the peach and mint grounds keep working with no extra code (see _tokens.scss).

// `item` marks a shape as one element against the density budget. The parts of the ground band
// pass item={false}: the band is a single piece of scenery, however many blades it is cut from.
function Svg({ children, className, item = true, tone, viewBox }) {
  return (
    <svg
      className={item ? `scenery__item ${className}` : className}
      viewBox={viewBox}
      style={
        tone
          ? { '--shape-fill': `var(--ps-${tone})`, '--shape-shade': `var(--ps-${tone}-shade)` }
          : undefined
      }
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Sun({ className, ...rest }) {
  return (
    <Svg className={`scenery__sun ${className}`} viewBox="0 0 140 140" {...rest}>
      <path className="scenery__sun-disc" d={SUN_DISC_PATH} />
      <path className="scenery__sun-rays" d={SUN_RAYS_PATH} />
    </Svg>
  );
}

function Cloud({ className, ...rest }) {
  return (
    <Svg className={`scenery__cloud ${className}`} viewBox="0 0 200 100" {...rest}>
      <path d={CLOUD_PATH} />
    </Svg>
  );
}

function Hill({ className }) {
  return (
    <svg
      className={`scenery__hill ${className}`}
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={className.includes('back') ? HILL_BACK_PATH : HILL_FRONT_PATH} />
    </svg>
  );
}

function Tuft({ className, ...rest }) {
  return (
    <Svg className={`scenery__tuft ${className}`} viewBox="0 0 100 40" {...rest}>
      <path d={TUFT_PATH} />
    </Svg>
  );
}

function Flower({ className, ...rest }) {
  return (
    <Svg className={`scenery__flower ${className}`} viewBox="0 0 60 60" {...rest}>
      <path className="scenery__flower-petals" d={FLOWER_PETALS_PATH} />
      <path className="scenery__flower-eye" d={disc(30, 30, 9)} />
    </Svg>
  );
}

function Sprout({ className, ...rest }) {
  return (
    <Svg className={`scenery__sprout ${className}`} viewBox="0 0 44 60" {...rest}>
      <path className="scenery__sprout-stem" d={SPROUT_STEM_PATH} />
      <path className="scenery__sprout-leaves" d={SPROUT_LEAF_PATH} />
    </Svg>
  );
}

function Butterfly({ className, ...rest }) {
  return (
    <Svg className={`scenery__butterfly ${className}`} viewBox="0 0 60 52" {...rest}>
      <path className="scenery__butterfly-wings" d={BUTTERFLY_WING_PATH} />
      <path className="scenery__butterfly-body" d={BUTTERFLY_BODY_PATH} />
    </Svg>
  );
}

function Bird({ className, ...rest }) {
  return (
    <Svg className={`scenery__bird ${className}`} viewBox="0 0 62 40" {...rest}>
      <path className="scenery__bird-body" d={BIRD_BODY_PATH} />
      <path className="scenery__bird-wing" d={BIRD_WING_PATH} />
      <path className="scenery__bird-eye" d={disc(26, 17, 2)} />
    </Svg>
  );
}

function Sparkle({ className, ...rest }) {
  return (
    <Svg className={`scenery__sparkle ${className}`} viewBox="0 0 24 24" {...rest}>
      <path d={SPARKLE_PATH} />
    </Svg>
  );
}

// The shared floor of the welcome, greeting and complete screens: two hill layers with a little
// planting on top. It counts as ONE element against the density budget, which is why its parts
// are not marked as items — it reads as a single band of cut paper.
function GroundBand() {
  return (
    <div className="scenery__item scenery__ground">
      <Hill className="scenery__hill--back" />
      <Hill className="scenery__hill--front" />
      <Tuft className="scenery__tuft--one" item={false} />
      <Tuft className="scenery__tuft--two" item={false} />
      <Flower className="scenery__flower--one" item={false} tone="coral" />
      <Flower className="scenery__flower--two" item={false} tone="berry" />
      <Sprout className="scenery__sprout--one" item={false} />
    </div>
  );
}

// --- compositions --------------------------------------------------------------------------
// One recipe per screen, inside the §6 budget (welcome and greeting ≤ 7, complete ≤ 5, play ≤ 5,
// book/settings 1–2 — the book's croc peek already covers it and settings stays clean). The centre
// of every screen belongs to content, so everything here hugs an edge or a corner. Those numbers
// live in `Scenery.test.jsx`, which fails if a composition outgrows its budget.

// Welcome and greeting share one composition on purpose: the ground band has to survive the cut
// between the two screens, so the world feels continuous rather than redrawn.
function Meadow() {
  return (
    <>
      <Sun className="scenery__sun--corner" />
      <Cloud className="scenery__cloud--high" />
      <Cloud className="scenery__cloud--low" />
      <GroundBand />
      <Butterfly className="scenery__butterfly--wordmark" tone="sky" />
    </>
  );
}

const COMPOSITIONS = {
  // Ground band, a bird sitting on the hill, and gold sparkles beside the ceremony stars. The
  // third sparkle is revealed by CSS on super rounds only, so the count stays inside the budget.
  complete: () => (
    <>
      <GroundBand />
      <Bird className="scenery__bird--hill" tone="coral" />
      <Sparkle className="scenery__sparkle--left" />
      <Sparkle className="scenery__sparkle--right" />
      <Sparkle className="scenery__sparkle--super" />
    </>
  ),
  greeting: Meadow,
  // The play screen's calm is still load-bearing — no ground, nothing planted, nothing near the
  // word — but two clouds at 0.3 opacity read as an empty sky rather than a calm one (owner call,
  // 2026-07-25; D-019). It keeps the meadow's corner sun so the world survives the cut from the
  // greeting, and adds a cloud and a bird that actually travel. Both travellers are confined to
  // the band between the star trail and the word: §7's rule that nothing moves behind the word a
  // child is reading is the reason this screen is allowed to be alive at all.
  play: () => (
    <>
      <Sun className="scenery__sun--play" />
      <Cloud className="scenery__cloud--edge-left" />
      <Cloud className="scenery__cloud--edge-right" />
      <Cloud className="scenery__cloud--drift" />
      <Bird className="scenery__bird--sky" tone="coral" />
    </>
  ),
  welcome: Meadow,
};

export default function Scenery({ phase = 'welcome' }) {
  const variant = phase === 'playing' ? 'play' : phase;
  const Composition = COMPOSITIONS[variant] ?? COMPOSITIONS.welcome;
  return (
    <div className={`scenery scenery--${variant}`} aria-hidden="true">
      <Composition />
    </div>
  );
}
