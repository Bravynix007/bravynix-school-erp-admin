'use client';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'mr', name: 'मराठी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/**
 * The seven languages, each named in its own script (so a person who cannot
 * read the current one can still find theirs). The picker only reports the
 * choice; loading the strings and the per-script fonts is the i18n layer's job.
 */
export function LanguageSelect({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
}) {
  return (
    <select
      aria-label="Language"
      value={value}
      onChange={(event) => onChange(event.target.value as LanguageCode)}
      className="h-9 cursor-pointer rounded-md border border-field bg-surface px-2 text-label text-ink hover:border-ink-secondary"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}
