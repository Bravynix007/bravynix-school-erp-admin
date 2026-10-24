'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '@/config/navigation';
import { cn } from '@/lib/cn';

/** `/societies/` and `/societies/workspace/` both light up Societies. */
function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '');
  return path === href || path.startsWith(`${href}/`);
}

/** Ink sidebar, 248 px (DESIGN.md 8, 9). */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="on-frame hidden w-62 shrink-0 flex-col bg-frame px-3 py-5 text-on-frame lg:flex"
    >
      <div className="mb-6 px-3 text-h3 font-semibold text-white">BravyNix Console</div>
      <div className="flex flex-1 flex-col gap-5">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-overline font-semibold tracking-[0.06em] text-on-frame-muted uppercase">
              {group.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const ItemIcon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex h-10 items-center gap-3 rounded-md px-3 text-body transition-colors',
                        active
                          ? 'bg-frame-active text-white before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary-tint'
                          : 'hover:bg-frame-active/60 hover:text-white',
                      )}
                    >
                      <ItemIcon size={20} stroke={1.5} aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
