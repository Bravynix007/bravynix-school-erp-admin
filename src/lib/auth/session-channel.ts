/**
 * Tells the console's other tabs what happened to the shared session. The
 * access token and the query cache live in each tab's memory, so without this
 * a sign-out in one tab would leave another still showing the last
 * operator's data on a shared PC (API design 6.1).
 */
export type SessionMessage =
  { type: 'signed-in' } | { type: 'signed-out' } | { type: 'ended'; reason: string };

export interface SessionChannel {
  post(message: SessionMessage): void;
  close(): void;
}

export const SESSION_CHANNEL = 'bravynix-console-session';

function isSessionMessage(value: unknown): value is SessionMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { type, reason } = value as { type?: unknown; reason?: unknown };
  return type === 'signed-in' || type === 'signed-out' || (type === 'ended' && typeof reason === 'string');
}

/**
 * Opens the channel. Every browser the console supports has BroadcastChannel
 * (README, Supported browsers); without it each tab keeps to itself.
 */
export function openSessionChannel(onMessage: (message: SessionMessage) => void): SessionChannel {
  if (typeof BroadcastChannel === 'undefined') return { post: () => {}, close: () => {} };
  const channel = new BroadcastChannel(SESSION_CHANNEL);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (isSessionMessage(event.data)) onMessage(event.data);
  };
  return {
    post: (message) => channel.postMessage(message),
    close: () => channel.close(),
  };
}
