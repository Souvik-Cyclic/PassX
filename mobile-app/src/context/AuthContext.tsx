import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import * as authApi from '../api/auth';
import {
  deriveMasterKey,
  deriveAuthKey,
  deriveEncryptionKey,
  deriveAuthKeyHash,
  encryptMasterKey,
  decryptMasterKey,
} from '../crypto';

interface AuthContextType {
  user: User | null;
  encryptionKey: Uint8Array | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, masterPassword: string) => Promise<void>;
  signIn: (email: string, masterPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authApi.isAuthenticated();
      if (authenticated && !encryptionKey) {
        // User has valid JWT but no encryption key - they need to log in again
        console.log('User authenticated but missing encryption key - logging out');
        await signOut();
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(authenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, masterPassword: string) => {
    try {
      setIsLoading(true);

      // 1. Derive master key from password + email
      const masterKey = await deriveMasterKey(masterPassword, email);

      // 2. Derive auth key and encryption key
      const authKey = await deriveAuthKey(masterKey);
      const encKey = await deriveEncryptionKey(masterKey);

      // 3. Create auth key hash for backend
      const authKeyHash = await deriveAuthKeyHash(authKey);

      // 4. Encrypt master key with password (for storage on backend)
      const encryptedMasterKey = await encryptMasterKey(masterKey, masterPassword);

      // 5. Send to backend
      const response = await authApi.signup({
        email,
        authKeyHash,
        encryptedMasterKey,
      });

      // 6. Store encryption key in memory (never in persistent storage)
      setEncryptionKey(encKey);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, masterPassword: string) => {
    try {
      setIsLoading(true);

      // 1. Derive master key from password + email
      const masterKey = await deriveMasterKey(masterPassword, email);

      // 2. Derive auth key
      const authKey = await deriveAuthKey(masterKey);

      // 3. Create auth key hash
      const authKeyHash = await deriveAuthKeyHash(authKey);

      // 4. Send login request
      const response = await authApi.login({
        email,
        authKeyHash,
      });

      // 5. Verify we can decrypt the master key
      // This ensures the password is correct
      try {
        const decryptedMasterKey = await decryptMasterKey(
          response.encryptedMasterKey,
          masterPassword
        );

        // 6. Derive encryption key from decrypted master key
        const encKey = await deriveEncryptionKey(decryptedMasterKey);
        
        // 7. Store in memory only
        setEncryptionKey(encKey);
        setUser(response.user);
        setIsAuthenticated(true);
      } catch (decryptError) {
        throw new Error('Invalid master password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Invalid master password') {
        throw new Error('Invalid email or password');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      
      // Clear all sensitive data from memory
      setEncryptionKey(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        encryptionKey,
        isLoading,
        isAuthenticated,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
