import type { Route } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { IconChevronRight } from '@tabler/icons-react';

export interface Crumb {
  label: string;
  /** Leave off for the current page. */
  href?: Route;
}

/** Societies › Sri Vidya Educational Society › Green Valley School (DESIGN.md 13). Names wrap, never truncate. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-ink-secondary">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${index}-${item.label}`}>
              <li>
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded-sm underline-offset-2 hover:text-ink hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {last ? null : (
                <li aria-hidden="true" className="text-ink-tertiary">
                  <IconChevronRight size={12} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
