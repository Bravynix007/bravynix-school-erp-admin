import type { ReactNode } from 'react';

/** Centred 400 px card on the paper canvas, wordmark above (STITCH_PROMPT 1 to 3). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="content" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <p className="mb-6 text-h2 font-semibold tracking-[-0.005em] text-ink">BravyNix</p>
      <div className="w-full max-w-[400px] rounded-xl border border-line bg-surface p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
