import TileEyes from './TileEyes';
import { CLOUD_PATH } from './Scenery';

// The letters lean alternately on one baseline, exactly like the wordmark: cut out and
// pinned up by hand rather than set as type.
const LETTER_PLACEMENTS = Object.freeze([
  { lift: '-0.01em', tilt: '-4deg' },
  { lift: '-0.04em', tilt: '2.5deg' },
  { lift: '-0.01em', tilt: '-2deg' },
]);
const SEEN_LETTERS = Object.freeze(['a', 'b', 'c']);
const BLANK_TILES = Object.freeze([0, 1, 2]);

// One paper-cut object in the letters' own language — a flat horn with three arcs, given the
// same solid offset shade the glyphs carry. It sits centred in the sky slot above the tiles, so
// unlike the old inline icon it can never push the row sideways out of the card.
function SoundBurst() {
  return (
    <svg className="mode-card__sound" viewBox="0 0 46 26" focusable="false" aria-hidden="true">
      <path
        className="mode-card__sound-horn"
        d="M5 9h5.6L18.2 3.5a1.7 1.7 0 0 1 2.7 1.4v16.2a1.7 1.7 0 0 1-2.7 1.4L10.6 17H5a2.5 2.5 0 0 1-2.5-2.5v-3A2.5 2.5 0 0 1 5 9Z"
      />
      <g className="mode-card__sound-waves">
        <path d="M27 9.6a5.2 5.2 0 0 1 0 6.8" />
        <path d="M33.4 6.1a10.4 10.4 0 0 1 0 13.8" />
        <path d="M39.8 2.6a15.6 15.6 0 0 1 0 20.8" />
      </g>
    </svg>
  );
}

function SkyCloud() {
  return (
    <svg className="mode-card__cloud" viewBox="0 0 200 100" focusable="false" aria-hidden="true">
      <path d={CLOUD_PATH} />
    </svg>
  );
}

/**
 * Choosing how to play is starting the game. On a first play these are the whole action; for a
 * returning child `compact` renders the same two pictures beneath the one-tap Play slab, so
 * switching mode remains obvious without making the child re-answer the question every time.
 * Each card is a little window onto the screen the child is about to see: the game's own
 * sun-coloured sky with either coloured letters looking back at them, or blank cards and a sound
 * waiting to be heard. A pre-reader recognises the picture of what will happen; they cannot
 * decode an icon that stands for a setting, which is why the old toggle failed.
 *
 * Both stages share one grid — a sky row over a tile row of identical geometry — so the two
 * previews line up across the pair and only their contents differ.
 *
 * `currentMode` only marks the remembered choice in the compact pair. Both buttons still begin a
 * round immediately; this is never a settings form or a second confirmation step.
 */
export default function ModeCards({
  compact = false,
  currentMode = null,
  labels,
  onPlay,
  showEyes = true,
}) {
  return (
    <div className={`mode-cards${compact ? ' mode-cards--compact' : ''}`}>
      <button
        type="button"
        className={`mode-card mode-card--easy${
          compact && currentMode === 'easy' ? ' mode-card--current' : ''
        }`}
        aria-label={labels.easyAria}
        onClick={() => onPlay('easy')}
      >
        <span className="mode-card__stage" aria-hidden="true">
          <SkyCloud />
          <span className="mode-card__row">
            {SEEN_LETTERS.map((letter, index) => (
              <span
                className={`mode-card__tile mode-card__tile--c${index}`}
                key={letter}
                style={{
                  '--tile-lift': LETTER_PLACEMENTS[index].lift,
                  '--tile-tilt': LETTER_PLACEMENTS[index].tilt,
                }}
              >
                {/* Mirrors Letter's visual wrapper so the shared eye offsets land identically. */}
                <span className="mode-card__glyph">
                  {showEyes && <TileEyes letter={letter} />}
                  {letter}
                </span>
              </span>
            ))}
          </span>
        </span>
        <strong className="mode-card__title">{labels.easy}</strong>
      </button>

      <button
        type="button"
        className={`mode-card mode-card--normal${
          compact && currentMode === 'normal' ? ' mode-card--current' : ''
        }`}
        aria-label={labels.normalAria}
        onClick={() => onPlay('normal')}
      >
        <span className="mode-card__stage" aria-hidden="true">
          <SoundBurst />
          <span className="mode-card__row">
            {BLANK_TILES.map((index) => (
              <span className="mode-card__tile mode-card__tile--blank" key={index}>
                <span className="mode-card__glyph">
                  {/* Quiet faces waiting for the word, as the play screen draws a hidden letter. */}
                  {showEyes && <TileEyes neutral />}
                </span>
              </span>
            ))}
          </span>
        </span>
        <strong className="mode-card__title">{labels.normal}</strong>
      </button>
    </div>
  );
}
