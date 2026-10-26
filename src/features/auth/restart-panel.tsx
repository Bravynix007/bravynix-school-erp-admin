import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';

/**
 * What a sign-in shows once its code or token is dead: the reason and one way back.
 * The step it replaces is gone, so focus moves to the button (WCAG 2.4.3).
 */
export function RestartPanel({ message, onRestart }: { message: string; onRestart(): void }) {
  return (
    <div className="flex flex-col gap-5">
      <InlineAlert tone="error">{message}</InlineAlert>
      <Button className="w-full" onClick={onRestart} autoFocus>
        Start again
      </Button>
    </div>
  );
}
