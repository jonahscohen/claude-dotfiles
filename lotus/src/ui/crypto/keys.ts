// AES-256-GCM encryption for API keys using Web Crypto API.
// Keys are encrypted at rest in figma.clientStorage.

const SALT_PREFIX = 'lotus-key-salt-';
const ITERATIONS = 100_000;

async function deriveKey(salt: Uint8Array, userId?: string): Promise<CryptoKey> {
  // Use a deterministic passphrase derived from the plugin context.
  // When a userId is available, derive a user-specific key (v2).
  // Otherwise fall back to the original hardcoded passphrase (v1).
  const passphrase = userId ? `lotus-${userId}-v2` : 'lotus-local-encryption-v1';
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(plaintext: string, provider: string, userId?: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt, userId);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Pack: salt (16) + iv (12) + ciphertext
  const packed = new Uint8Array(16 + 12 + encrypted.byteLength);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(new Uint8Array(encrypted), 28);

  // Base64 encode for storage
  return btoa(String.fromCharCode(...packed));
}

async function decryptWithKey(encoded: string, userId?: string): Promise<string> {
  const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));

  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);

  const key = await deriveKey(salt, userId);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export async function decryptApiKey(encoded: string, provider: string, userId?: string): Promise<string> {
  // Try v2 (user-derived) first
  if (userId) {
    try {
      return await decryptWithKey(encoded, userId);
    } catch {
      // Fall through to v1
    }
  }
  // Fall back to v1 (hardcoded)
  return await decryptWithKey(encoded);
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    // Encrypted values are at least 28 bytes (16 salt + 12 iv)
    return decoded.length >= 28;
  } catch {
    return false;
  }
}
