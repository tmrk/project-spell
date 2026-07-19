import { useState } from 'react';
import NameField from './NameField';
import { MAX_NAME_LENGTH, normaliseProfileName } from '../profiles';

/**
 * One field, and the field itself is made of the game's letters — the child types straight
 * into the coloured tiles rather than filling in a box and seeing a copy of it elsewhere.
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
  const cleanName = normaliseProfileName(name);

  const save = () => {
    if (cleanName) onSave(cleanName);
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
        <NameField
          value={name}
          onChange={setName}
          onSubmit={save}
          label={copy.nameLabel}
          showEyes={showEyes}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
        />
        <div className="confirmation-dialog__actions">
          <button type="button" className="text-button" onClick={onCancel}>
            {copy.cancelName}
          </button>
          <button
            type="button"
            className="primary-button primary-button--small"
            onClick={save}
            disabled={!cleanName}
          >
            {copy.saveName}
          </button>
        </div>
      </section>
    </div>
  );
}
