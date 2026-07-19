import { StarIcon } from './Icons';
import { StickerPicture } from './StickerBook';
import { hashCode } from '../stickers/map';

export default function BookTab({ ariaLabel, bounce = false, onClick, recentSticker = null }) {
  const stickerId = recentSticker?.id ?? recentSticker?.codepoint ?? 'star';
  const rotation = (hashCode(stickerId) % 9) - 4;

  return (
    <button
      type="button"
      className={`book-tab${bounce ? ' book-tab--new' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="book-tab__spine" aria-hidden="true" />
      <span className="book-tab__eyes" aria-hidden="true"><i /><i /></span>
      <span className="book-tab__picture" aria-hidden="true">
        {recentSticker?.codepoint ? (
          <StickerPicture
            codepoint={recentSticker.codepoint}
            className="die-cut"
            style={{ '--sticker-rotation': `${rotation}deg` }}
          />
        ) : (
          <StarIcon filled />
        )}
      </span>
    </button>
  );
}
