import { buildPreviewRows } from '../keyboard';

// The preview canvas, in its own coordinate space. A picture rather than a live miniature: an SVG
// cannot overflow its card the way a percentage-sized grid of tiny divs can, and it scales with the
// panel for free.
const VIEW = Object.freeze({ width: 100, height: 76 });
const PAD = 5;
const GAP = 1.6;
const BOARD_BOTTOM = 5;
const WORD_TILES = 3;
const WORD_WIDTH = 14;
const WORD_HEIGHT = 19;
const WORD_GAP = 3.5;

// A key is never wider than it is tall, exactly as on the real board.
const KEY_ASPECT = 1.05;

// Board height is fixed per row count so the previews sit on one baseline: three cramped rows and
// two roomy ones both end at the same place, which is what makes the pair comparable at a glance.
function boardGeometry(rows) {
  const units = rows.reduce((widest, row) => Math.max(widest, row.count + row.offset), 0);
  const boardHeight = rows.length === 2 ? 27 : 34;
  const keyHeight = (boardHeight - (rows.length - 1) * GAP) / rows.length;
  const available = VIEW.width - 2 * PAD;
  const keyWidth = Math.min((available - (units - 1) * GAP) / units, keyHeight * KEY_ASPECT);
  const span = units * keyWidth + (units - 1) * GAP;

  return {
    keyHeight,
    keyWidth,
    left: (VIEW.width - span) / 2,
    top: VIEW.height - BOARD_BOTTOM - boardHeight,
  };
}

function Preview({ rows }) {
  const board = rows.length ? boardGeometry(rows) : null;
  // With no board the word owns the whole stage and sits in its middle; with one it lifts clear.
  const wordTop = board ? 10 : (VIEW.height - WORD_HEIGHT) / 2;
  const wordSpan = WORD_TILES * WORD_WIDTH + (WORD_TILES - 1) * WORD_GAP;

  return (
    <svg
      className="keyboard-choice__stage"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      focusable="false"
      aria-hidden="true"
    >
      {Array.from({ length: WORD_TILES }, (unused, index) => (
        <rect
          key={index}
          className={`keyboard-choice__tile keyboard-choice__tile--c${index}`}
          x={(VIEW.width - wordSpan) / 2 + index * (WORD_WIDTH + WORD_GAP)}
          y={wordTop}
          width={WORD_WIDTH}
          height={WORD_HEIGHT}
          rx="3.5"
        />
      ))}
      {board
        && rows.map((row, rowIndex) => (
          Array.from({ length: row.count }, (unused, keyIndex) => (
            <rect
              className="keyboard-choice__key"
              key={`${rowIndex}-${keyIndex}`}
              x={board.left + (row.offset + keyIndex) * (board.keyWidth + GAP)}
              y={board.top + rowIndex * (board.keyHeight + GAP)}
              width={board.keyWidth}
              height={board.keyHeight}
              rx="1.6"
            />
          ))
        ))}
    </svg>
  );
}

/**
 * The three-way keyboard choice as three pictures (owner request, 2026-07-26).
 *
 * A parent picking between "off", "all letters" and "a few letters" from a dropdown has to imagine
 * the result; three miniature play screens show it. The same reasoning as the mode cards on the
 * welcome screen, one audience up: the picture carries the meaning and the label confirms it.
 *
 * Real radios under the pictures, so the group keeps arrow-key navigation and a real checked state;
 * the border and the tick are both driven by `:checked`, so colour is never the only signal.
 */
export default function KeyboardChoice({ value, locale, labels, onChange }) {
  return (
    <div className="keyboard-choice" role="radiogroup" aria-label={labels.heading}>
      {['system', 'full', 'simple'].map((mode) => (
        <label className="keyboard-choice__option" key={mode}>
          <input
            className="sr-only"
            type="radio"
            name="keyboard"
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          <Preview rows={buildPreviewRows(mode, locale)} />
          <span className="keyboard-choice__title">
            {/* The chosen card is marked by a shape as well as by its colour (§11). */}
            <span className="keyboard-choice__tick" aria-hidden="true" />
            {labels[mode]}
          </span>
        </label>
      ))}
    </div>
  );
}
