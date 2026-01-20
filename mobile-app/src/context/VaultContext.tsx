import React, { createContext, useContext, useState, useCallback } from 'react';
import { VaultItem, EncryptedVaultItem } from '../types';
import * as vaultApi from '../api/vault';
import { encryptVaultItem, decryptVaultItem } from '../crypto';
import { useAuth } from './AuthContext';

interface VaultContextType {
  vaultItems: VaultItem[];
  isLoading: boolean;
  fetchVaultItems: () => Promise<void>;
  addVaultItem: (item: Omit<VaultItem, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVaultItem: (id: string, item: Partial<VaultItem>) => Promise<void>;
  deleteVaultItem: (id: string) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  permanentlyDeleteVaultItem: (id: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { encryptionKey } = useAuth();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVaultItems = useCallback(async () => {
    if (!encryptionKey) {
      console.warn('No encryption key available');
      return;
    }

    try {
      setIsLoading(true);
      const encryptedItems = await vaultApi.getVaultItems();

      // Decrypt all items
      const decryptedItems = await Promise.all(
        encryptedItems.map(async (item) => {
          try {
            return await decryptVaultItem(
              item.encryptedData,
              encryptionKey,
              item._id,
              item.createdAt,
              item.updatedAt
            );
          } catch (error) {
            console.error(`Failed to decrypt item ${item._id}:`, error);
            return null;
          }
        })
      );

      // Filter out failed decryptions
      setVaultItems(decryptedItems.filter((item) => item !== null) as VaultItem[]);
    } catch (error) {
      console.error('Error fetching vault items:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [encryptionKey]);

  const addVaultItem = async (
    item: Omit<VaultItem, '_id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!encryptionKey) {
      console.warn('No encryption key available. User may need to log in again.');
      throw new Error('Session expired. Please log in again.');
    }

    try {
      setIsLoading(true);

      // Create a temporary vault item for encryption
      const tempItem: VaultItem = {
        ...item,
        _id: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Encrypt the item
      const encryptedData = await encryptVaultItem(tempItem, encryptionKey);

      // Send to backend
      const created = await vaultApi.createVaultItem(encryptedData);

      // Decrypt and add to local state
      const decrypted = await decryptVaultItem(
        created.encryptedData,
        encryptionKey,
        created._id,
        created.createdAt,
        created.updatedAt
      );

      setVaultItems((prev) => [...prev, decrypted]);
    } catch (error) {
      console.error('Error adding vault item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateVaultItem = async (id: string, updates: Partial<VaultItem>) => {
    if (!encryptionKey) {
      console.warn('No encryption key available. User may need to log in again.');
      throw new Error('Session expired. Please log in again.');
    }

    try {
      setIsLoading(true);

      // Find existing item
      const existingItem = vaultItems.find((item) => item._id === id);
      if (!existingItem) {
        throw new Error('Vault item not found');
      }

      // Merge updates
      const updatedItem: VaultItem = {
        ...existingItem,
        ...updates,
        _id: existingItem._id,
        createdAt: existingItem.createdAt,
        updatedAt: new Date().toISOString(),
      };

      // Encrypt
      const encryptedData = await encryptVaultItem(updatedItem, encryptionKey);

      // Send to backend
      const updated = await vaultApi.updateVaultItem(id, encryptedData);

      // Decrypt and update local state
      const decrypted = await decryptVaultItem(
        updated.encryptedData,
        encryptionKey,
        updated._id,
        updated.createdAt,
        updated.updatedAt
      );

      setVaultItems((prev) =>
        prev.map((item) => (item._id === id ? decrypted : item))
      );
    } catch (error: any) {
      console.error('Error updating vault item:', error);
      if (error.response?.status === 404) {
        throw new Error('Item not found. It may have been deleted.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to update item. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVaultItem = async (id: string) => {
    // This is now an alias for moveToTrash for backward compatibility
    await moveToTrash(id);
  };

  const moveToTrash = async (id: string) => {
    if (!encryptionKey) {
      throw new Error('Session expired. Please log in again.');
    }

    try {
      setIsLoading(true);

      // Find existing item
      const existingItem = vaultItems.find((item) => item._id === id);
      if (!existingItem) {
        throw new Error('Vault item not found');
      }

      // Mark as deleted (soft delete)
      const updatedItem: VaultItem = {
        ...existingItem,
        deletedAt: new Date().toISOString(),
      };

      // Encrypt and update
      const encryptedData = await encryptVaultItem(updatedItem, encryptionKey);
      await vaultApi.updateVaultItem(id, encryptedData);

      // Update local state
      setVaultItems((prev) =>
        prev.map((item) => (item._id === id ? updatedItem : item))
      );
    } catch (error) {
      console.error('Error moving item to trash:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromTrash = async (id: string) => {
    if (!encryptionKey) {
      throw new Error('Session expired. Please log in again.');
    }

    try {
      setIsLoading(true);

      // Find existing item
      const existingItem = vaultItems.find((item) => item._id === id);
      if (!existingItem) {
        throw new Error('Vault item not found');
      }

      // Remove deletedAt (restore)
      const updatedItem: VaultItem = {
        ...existingItem,
        deletedAt: undefined,
      };

      // Encrypt and update
      const encryptedData = await encryptVaultItem(updatedItem, encryptionKey);
      await vaultApi.updateVaultItem(id, encryptedData);

      // Update local state
      setVaultItems((prev) =>
        prev.map((item) => (item._id === id ? updatedItem : item))
      );
    } catch (error) {
      console.error('Error restoring item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const permanentlyDeleteVaultItem = async (id: string) => {
    try {
      setIsLoading(true);
      await vaultApi.deleteVaultItem(id);
      setVaultItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error('Error permanently deleting vault item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VaultContext.Provider
      value={{
        vaultItems,
        isLoading,
        fetchVaultItems,
        addVaultItem,
        updateVaultItem,
        deleteVaultItem,
        moveToTrash,
        restoreFromTrash,
        permanentlyDeleteVaultItem,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
