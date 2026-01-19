// Vault Item Types
export type VaultItemType = 'login' | 'card' | 'note';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners-club' | 'rupay';

export interface VaultItem {
  _id: string;
  type: VaultItemType;
  name: string;
  // Login fields
  username?: string;
  password?: string;
  url?: string;
  // Card fields
  cardHolderName?: string;
  cardNumber?: string;
  cardBrand?: CardBrand;
  expirationMonth?: string;
  expirationYear?: string;
  cvv?: string;
  // Common fields
  notes?: string;
  isFavorite?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedVaultItem {
  _id: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface User {
  _id: string;
  email: string;
}

export interface SignupRequest {
  email: string;
  authKeyHash: string;
  encryptedMasterKey: string;
}

export interface LoginRequest {
  email: string;
  authKeyHash: string;
}

export interface AuthResponse {
  accessToken: string;
  encryptedMasterKey: string;
  user: User;
}

// Crypto Types
export interface DerivedKeys {
  masterKey: Uint8Array;
  authKey: Uint8Array;
  encryptionKey: Uint8Array;
}

export interface EncryptedData {
  iv: string;
  ciphertext: string;
  tag: string;
}
