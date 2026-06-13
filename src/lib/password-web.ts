/**
 * Web Crypto-compatible password hashing for Cloudflare Workers
 * Uses PBKDF2 instead of scrypt (which is not available in Workers)
 */

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;

function arrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArray(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    KEY_LENGTH * 8
  );
  const hashArray = new Uint8Array(derived);
  return `${arrayToHex(salt)}:${arrayToHex(hashArray)}`;
}

export async function verifyPassword(
  password: string,
  storedValue: string
): Promise<boolean> {
  const parts = storedValue.split(':');
  if (parts.length === 2 && parts[0].length === SALT_LENGTH * 2) {
    const [salt, storedHash] = parts;
    const saltArray = hexToArray(salt);
    const storedHashArray = hexToArray(storedHash);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltArray,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      key,
      KEY_LENGTH * 8
    );
    const hashArray = new Uint8Array(derived);
    if (hashArray.length !== storedHashArray.length) return false;
    let diff = 0;
    for (let i = 0; i < hashArray.length; i++) {
      diff |= hashArray[i] ^ storedHashArray[i];
    }
    return diff === 0;
  }
  return storedValue === password;
}

export function isHashed(storedValue: string): boolean {
  const parts = storedValue.split(':');
  return parts.length === 2 && parts[0].length === SALT_LENGTH * 2;
}
