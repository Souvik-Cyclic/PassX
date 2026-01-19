import api from './client';
import { EncryptedVaultItem } from '../types';

/**
 * Get all vault items for the authenticated user
 * @returns Array of encrypted vault items
 */
export async function getVaultItems(): Promise<EncryptedVaultItem[]> {
  const response = await api.get<EncryptedVaultItem[]>('/vault');
  return response.data;
}

/**
 * Get a single vault item by ID
 * @param id Vault item ID
 * @returns Encrypted vault item
 */
export async function getVaultItem(id: string): Promise<EncryptedVaultItem> {
  const response = await api.get<EncryptedVaultItem>(`/vault/${id}`);
  return response.data;
}

/**
 * Create a new vault item
 * @param encryptedData Encrypted vault data as base64 string
 * @returns Created encrypted vault item
 */
export async function createVaultItem(
  encryptedData: string
): Promise<EncryptedVaultItem> {
  const response = await api.post<EncryptedVaultItem>('/vault', {
    encryptedData,
  });
  return response.data;
}

/**
 * Update an existing vault item
 * @param id Vault item ID
 * @param encryptedData Updated encrypted vault data
 * @returns Updated encrypted vault item
 */
export async function updateVaultItem(
  id: string,
  encryptedData: string
): Promise<EncryptedVaultItem> {
  const response = await api.put<EncryptedVaultItem>(`/vault/${id}`, {
    encryptedData,
  });
  return response.data;
}

/**
 * Delete a vault item
 * @param id Vault item ID
 */
export async function deleteVaultItem(id: string): Promise<void> {
  await api.delete(`/vault/${id}`);
}
