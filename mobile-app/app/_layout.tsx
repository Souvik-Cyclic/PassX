import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { VaultProvider } from "../src/context/VaultContext";
import { AlertProvider } from "../src/context/AlertContext";
import { Buffer } from 'buffer';
import 'expo-standard-web-crypto';
import '../global.css';
import { LogBox } from 'react-native';

// Polyfill Buffer for crypto
global.Buffer = Buffer;

// Disable all error overlays and logs
LogBox.ignoreAllLogs();
if ((global as any).ErrorUtils) {
  const originalHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
    console.log('Error caught:', error);
    // Prevent default error screen
  });
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <VaultProvider>
          <Stack screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: '#0f172a' }
          }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="login" />
            <Stack.Screen name="vault/index" />
            <Stack.Screen name="vault/add" />
            <Stack.Screen name="vault/[id]" />
            <Stack.Screen name="vault/trash" />
          </Stack>
        </VaultProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
