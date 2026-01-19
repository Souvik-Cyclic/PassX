import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { scrypt } from '@noble/hashes/scrypt.js';

// Using scrypt for key derivation
const SCRYPT_N = 16; // CPU/memory cost parameter (2^4) - optimized for mobile
const SCRYPT_R = 8; // Block size parameter
const SCRYPT_P = 1; // Parallelization parameter
const KEY_LENGTH = 32; // 32 bytes = 256 bits

/**
 * Derives a master key from password and email using scrypt
 * @param masterPassword The user's master password
 * @param email The user's email (used as salt, lowercased)
 * @returns Promise<Uint8Array> 32-byte master key
 */
export async function deriveMasterKey(
  masterPassword: string,
  email: string
): Promise<Uint8Array> {
  try {
    const salt = email.toLowerCase();
    
    // Convert to Uint8Array
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(masterPassword);
    const saltBytes = encoder.encode(salt);
    
    const derivedKey = scrypt(passwordBytes, saltBytes, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      dkLen: KEY_LENGTH,
    });
    
    return derivedKey;
  } catch (error) {
    console.error('Error deriving master key:', error);
    throw new Error('Failed to derive master key');
  }
}

/**
 * Derives auth key from master key
 * Auth key is used for authentication only (not for encryption)
 */
export async function deriveAuthKey(masterKey: Uint8Array): Promise<Uint8Array> {
  const context = new TextEncoder().encode('bitwarden-auth-key');
  const combined = new Uint8Array(masterKey.length + context.length);
  combined.set(masterKey);
  combined.set(context, masterKey.length);
  
  return await hashKey(combined);
}

/**
 * Derives encryption key from master key
 * Encryption key is used for vault encryption only
 */
export async function deriveEncryptionKey(masterKey: Uint8Array): Promise<Uint8Array> {
  const context = new TextEncoder().encode('bitwarden-encryption-key');
  const combined = new Uint8Array(masterKey.length + context.length);
  combined.set(masterKey);
  combined.set(context, masterKey.length);
  
  return await hashKey(combined);
}

/**
 * Simple hash function for key derivation
 * Uses SHA-256
 */
async function hashKey(data: Uint8Array): Promise<Uint8Array> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Buffer.from(data).toString('hex')
  );
  
  // Convert hex to Uint8Array
  const bytes = new Uint8Array(
    hash.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );
  
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
export function arrayToBase64(array: Uint8Array): string {
  return Buffer.from(array).toString('base64');
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToArray(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Derive authKeyHash from authKey for sending to backend
 */
export async function deriveAuthKeyHash(authKey: Uint8Array): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    arrayToBase64(authKey)
  );
  return hash;
}

