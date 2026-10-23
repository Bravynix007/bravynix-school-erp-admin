import Link from 'next/link';

/** DESIGN.md 16: never a blank page; a link back. */
export default function NotFound() {
  return (
    <main id="content" className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center">
        <h1 className="text-h2 font-semibold">Page not found</h1>
        <p className="mt-2 text-body text-ink-secondary">This page doesn&apos;t exist or was moved.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-label font-medium text-primary hover:underline"
        >
          Go to the dashboard
        </Link>
      </div>
    </main>
  );
}
