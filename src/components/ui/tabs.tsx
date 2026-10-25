'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  value: string;
  label: string;
  /** Caption beside the label, e.g. "2/3" for Owners (DESIGN.md 9). */
  count?: string;
}

export const tabId = (idPrefix: string, value: string) => `${idPrefix}-tab-${value}`;
export const panelId = (idPrefix: string, value: string) => `${idPrefix}-panel-${value}`;

/**
 * Text tabs with a 2 px primary underline. Arrow keys, Home and End move
 * between tabs (WAI-ARIA tabs); labels wrap instead of truncating (DESIGN.md 16).
 * Put the content in a `TabPanel` with the same `idPrefix`.
 */
export function Tabs({
  idPrefix,
  label,
  items,
  value,
  onChange,
}: {
  idPrefix: string;
  label: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((i) => i.value === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    const target = items[next]!;
    onChange(target.value);
    refs.current.get(target.value)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={move}
      className="flex flex-wrap gap-x-6 border-b border-line"
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              if (node) refs.current.set(item.value, node);
              else refs.current.delete(item.value);
            }}
            id={tabId(idPrefix, item.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, item.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex items-baseline gap-1.5 border-b-2 py-3 text-left text-label font-medium transition-colors',
              selected ? 'border-primary text-ink' : 'border-transparent text-ink-secondary hover:text-ink',
            )}
          >
            {item.label}
            {item.count ? <span className="text-caption text-ink-tertiary tabular">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idPrefix,
  value,
  active,
  children,
}: {
  idPrefix: string;
  value: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, value)}
      aria-labelledby={tabId(idPrefix, value)}
      hidden={!active}
      tabIndex={0}
      className="pt-6"
    >
      {active ? children : null}
    </div>
  );
}
