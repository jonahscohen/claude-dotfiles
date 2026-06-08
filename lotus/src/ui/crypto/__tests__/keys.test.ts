import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, isEncrypted } from '../keys';

describe('API key encryption', () => {
  it('encrypts and decrypts a key round-trip', async () => {
    const original = 'sk-ant-api03-test-key-1234567890';
    const encrypted = await encryptApiKey(original, 'anthropic');
    expect(encrypted).not.toBe(original);
    const decrypted = await decryptApiKey(encrypted, 'anthropic');
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertext for the same input (random salt/IV)', async () => {
    const key = 'sk-test-key';
    const enc1 = await encryptApiKey(key, 'openai');
    const enc2 = await encryptApiKey(key, 'openai');
    expect(enc1).not.toBe(enc2);
  });

  it('handles empty string', async () => {
    const encrypted = await encryptApiKey('', 'google');
    const decrypted = await decryptApiKey(encrypted, 'google');
    expect(decrypted).toBe('');
  });

  it('handles long keys', async () => {
    const longKey = 'x'.repeat(1000);
    const encrypted = await encryptApiKey(longKey, 'anthropic');
    const decrypted = await decryptApiKey(encrypted, 'anthropic');
    expect(decrypted).toBe(longKey);
  });

  it('handles unicode characters', async () => {
    const unicodeKey = 'key-with-unicode-\u00e9\u00e8\u00ea-\u4e16\u754c';
    const encrypted = await encryptApiKey(unicodeKey, 'anthropic');
    const decrypted = await decryptApiKey(encrypted, 'anthropic');
    expect(decrypted).toBe(unicodeKey);
  });

  it('encrypts with userId and decrypts with same userId (v2)', async () => {
    const original = 'sk-user-derived-key-test';
    const userId = 'user-12345';
    const encrypted = await encryptApiKey(original, 'anthropic', userId);
    expect(encrypted).not.toBe(original);
    const decrypted = await decryptApiKey(encrypted, 'anthropic', userId);
    expect(decrypted).toBe(original);
  });

  it('decrypts with userId falls back to v1 when key was encrypted without userId', async () => {
    const original = 'sk-v1-encrypted-key';
    // Encrypt without userId (v1)
    const encrypted = await encryptApiKey(original, 'openai');
    // Decrypt with userId should fall back to v1 and succeed
    const decrypted = await decryptApiKey(encrypted, 'openai', 'user-67890');
    expect(decrypted).toBe(original);
  });

  it('encrypts without userId still works (backwards compatible)', async () => {
    const original = 'sk-backwards-compat';
    const encrypted = await encryptApiKey(original, 'google');
    const decrypted = await decryptApiKey(encrypted, 'google');
    expect(decrypted).toBe(original);
  });

  it('cannot decrypt v2-encrypted key with wrong userId', async () => {
    const original = 'sk-secret-key';
    const encrypted = await encryptApiKey(original, 'anthropic', 'user-aaa');
    // Decrypt with a different userId and no v1 fallback should fail
    // Since decryptApiKey tries v2 first then v1, and neither matches, it should throw
    await expect(decryptApiKey(encrypted, 'anthropic', 'user-bbb')).rejects.toThrow();
  });

  it('cannot decrypt v2-encrypted key without userId (v1 only)', async () => {
    const original = 'sk-secret-key';
    const encrypted = await encryptApiKey(original, 'anthropic', 'user-ccc');
    // Decrypt without userId only tries v1, which should fail for a v2 blob
    await expect(decryptApiKey(encrypted, 'anthropic')).rejects.toThrow();
  });
});

describe('isEncrypted', () => {
  it('returns true for encrypted values', async () => {
    const encrypted = await encryptApiKey('test-key', 'anthropic');
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it('returns false for plain text API keys', () => {
    expect(isEncrypted('sk-ant-api03-plain-key')).toBe(false);
  });

  it('returns false for short strings', () => {
    expect(isEncrypted('abc')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false);
  });
});
