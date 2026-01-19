import api from './client';
import { SignupRequest, LoginRequest, AuthResponse } from '../types';
import * as SecureStore from 'expo-secure-store';

/**
 * Sign up a new user
 * @param data Signup data (email, authKeyHash, encryptedMasterKey)
 * @returns AuthResponse with accessToken and encryptedMasterKey
 */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/signup', data);
  
  // Store JWT token securely
  await SecureStore.setItemAsync('accessToken', response.data.accessToken);
  
  return response.data;
}

/**
 * Log in an existing user
 * @param data Login credentials (email, authKeyHash)
 * @returns AuthResponse with accessToken and encryptedMasterKey
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  
  // Store JWT token securely
  await SecureStore.setItemAsync('accessToken', response.data.accessToken);
  
  return response.data;
}

/**
 * Log out the current user
 * Clears stored tokens
 */
export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('accessToken');
}

/**
 * Check if user is authenticated
 * @returns boolean indicating if user has valid token
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('accessToken');
  return !!token;
}
