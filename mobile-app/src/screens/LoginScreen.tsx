import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button } from '../components';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  const { signIn, isLoading } = useAuth();
  const router = useRouter();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!masterPassword) {
      newErrors.masterPassword = 'Master password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setGeneralError('');
    try {
      await signIn(email.toLowerCase(), masterPassword);
      router.replace({ pathname: '/vault' } as any);
    } catch (error: any) {
      setGeneralError(error.message || 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-slate-900"
      keyboardVerticalOffset={0}
    >
      <StatusBar style="light" />
      <ScrollView
        className="flex-1 bg-slate-900"
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-8">
            {/* Logo/Header */}
            <View className="items-center mb-10">
              <Image
                source={require('../../assets/images/passx-logo.png')}
                className="w-32 h-32 mb-6 rounded-3xl"
                resizeMode="contain"
              />
              <Text className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to <Text className="text-blue-400">PassX</Text></Text>
              <Text className="text-slate-400 text-center">
                Sign in to access your vault
              </Text>
            </View>

            {/* Form */}
            <View className="w-full">
              {generalError && (
                <View className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 mb-4 flex-row items-start">
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text className="text-red-400 text-sm ml-3 flex-1">
                    {generalError}
                  </Text>
                </View>
              )}
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Input
                label="Master Password"
                placeholder="Enter your master password"
                value={masterPassword}
                onChangeText={setMasterPassword}
                secureTextEntry
                showPasswordToggle
                autoCapitalize="none"
                maxLength={64}
                error={errors.masterPassword}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                isLoading={isLoading}
                className="mt-2"
              />

              <View className="flex-row justify-center mt-6">
                <Text className="text-slate-400">
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/signup' } as any)}>
                  <Text className="text-blue-500 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}
