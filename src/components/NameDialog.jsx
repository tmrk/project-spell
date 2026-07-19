import { useEffect, useRef, useState } from 'react';
import NameTag from './NameTag';
import { MAX_NAME_LENGTH, normaliseProfileName } from '../profiles';

/**
 * One field, one name. The live preview above the input is the point: the child watches their
 * own letters appear in the game's colours as they type, so entering a name is part of the
 * game rather than a form to get past.
 */
export default function NameDialog({
  copy,
  title,
  initialName = '',
  showEyes = true,
  onCancel,
  onSave,
}) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);
  const preview = normaliseProfileName(name);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = () => {
    if (preview) onSave(preview);
  };

  return (
    <div
      className="confirmation-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <section
        className="confirmation-dialog name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-dialog-title"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="name-dialog-title">{title}</h3>
        <div className="name-dialog__preview" aria-hidden="true">
          <NameTag name={preview} showEyes={showEyes} size="chip" />
        </div>
        <label className="stacked-field">
          <span>{copy.nameLabel}</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
            placeholder={copy.namePlaceholder}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
          />
        </label>
        <div className="confirmation-dialog__actions">
          <button type="button" className="text-button" onClick={onCancel}>
            {copy.cancelName}
          </button>
          <button
            type="button"
            className="primary-button primary-button--small"
            onClick={save}
            disabled={!preview}
          >
            {copy.saveName}
          </button>
        </div>
      </section>
    </div>
  );
}
