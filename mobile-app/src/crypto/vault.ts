import { VaultItem, EncryptedData } from '../types';
import { encrypt, decrypt } from './encryption';

/**
 * Encrypts a vault item for storage on backend
 * @param vaultItem The plaintext vault item
 * @param encryptionKey The encryption key derived from master key
 * @returns Encrypted data as base64 string
 */
export async function encryptVaultItem(
  vaultItem: VaultItem,
  encryptionKey: Uint8Array
): Promise<string> {
  const plaintext = JSON.stringify({
    type: vaultItem.type,
    name: vaultItem.name,
    // Login fields
    username: vaultItem.username,
    password: vaultItem.password,
    url: vaultItem.url,
    // Card fields
    cardHolderName: vaultItem.cardHolderName,
    cardNumber: vaultItem.cardNumber,
    cardBrand: vaultItem.cardBrand,
    expirationMonth: vaultItem.expirationMonth,
    expirationYear: vaultItem.expirationYear,
    cvv: vaultItem.cvv,
    // Common fields
    notes: vaultItem.notes,
    isFavorite: vaultItem.isFavorite,
    deletedAt: vaultItem.deletedAt,
  });
  
  const encrypted = await encrypt(plaintext, encryptionKey);
  return JSON.stringify(encrypted);
}

/**
 * Decrypts a vault item received from backend
 * @param encryptedDataStr The encrypted data string from backend
 * @param encryptionKey The encryption key derived from master key
 * @param id The vault item ID
 * @param createdAt Creation timestamp
 * @param updatedAt Update timestamp
 * @returns Decrypted VaultItem
 */
export async function decryptVaultItem(
  encryptedDataStr: string,
  encryptionKey: Uint8Array,
  id: string,
  createdAt: string,
  updatedAt: string
): Promise<VaultItem> {
  const encryptedData: EncryptedData = JSON.parse(encryptedDataStr);
  const decrypted = await decrypt(encryptedData, encryptionKey);
  
  const data = JSON.parse(decrypted);
  
  return {
    _id: id,
    type: data.type || 'login',
    name: data.name,
    // Login fields
    username: data.username,
    password: data.password,
    url: data.url,
    // Card fields
    cardHolderName: data.cardHolderName,
    cardNumber: data.cardNumber,
    cardBrand: data.cardBrand,
    expirationMonth: data.expirationMonth,
    expirationYear: data.expirationYear,
    cvv: data.cvv,
    // Common fields
    notes: data.notes,
    isFavorite: data.isFavorite,
    deletedAt: data.deletedAt,
    createdAt,
    updatedAt,
  };
}
