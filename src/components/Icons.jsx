const sharedProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function MusicIcon({ muted = false }) {
  return (
    <svg {...sharedProps}>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
      {muted && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg {...sharedProps}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...sharedProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...sharedProps}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function StarIcon({ filled = false }) {
  return (
    <svg
      {...sharedProps}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 1.5 : sharedProps.strokeWidth}
    >
      <path d="m12 2.8 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8Z" />
    </svg>
  );
}

export function StickerIcon() {
  return (
    <svg {...sharedProps}>
      <path d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v12.5H7.5A2.5 2.5 0 0 1 5 16V3.5Z" />
      <path d="M8.5 3.5v15" />
      <path d="m13.7 7 .9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3.9-1.8Z" />
    </svg>
  );
}

export function ChevronIcon({ direction = 'next' }) {
  return (
    <svg {...sharedProps}>
      <path d={direction === 'previous' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}
