import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

function decodeBase32(text: string): Buffer {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/**
 * The authenticator code (RFC 6238, SHA-1, six digits, 30-second steps) for
 * the step `offset` steps from now. The API accepts one step either side of
 * the current one and never takes a step twice, so a second sign-in with the
 * same secret uses the next step.
 */
export function authenticatorCode(secret: string, offset = 0): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / STEP_SECONDS) + offset));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const start = digest[digest.length - 1]! & 0x0f;
  const number = digest.readUInt32BE(start) & 0x7fffffff;
  return String(number % 1_000_000).padStart(6, '0');
}
