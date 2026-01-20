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

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  const { signUp, isLoading } = useAuth();
  const router = useRouter();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!masterPassword) {
      newErrors.masterPassword = 'Master password is required';
    } else if (masterPassword.length < 8) {
      newErrors.masterPassword = 'Password must be at least 8 characters';
    } else if (masterPassword.length > 64) {
      newErrors.masterPassword = 'Password must not exceed 64 characters';
    }

    // Confirm password
    if (masterPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setGeneralError('');
    try {
      await signUp(email.toLowerCase(), masterPassword);
      router.replace({ pathname: '/vault' } as any);
    } catch (error: any) {
      setGeneralError(error.message || 'Signup failed');
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
              <Text className="text-3xl font-bold text-white mb-2 tracking-tight">Create <Text className="text-blue-400">PassX</Text> Account</Text>
              <Text className="text-slate-400 text-center">
                Secure your passwords with zero-knowledge encryption
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
                placeholder="Enter a strong master password"
                value={masterPassword}
                onChangeText={setMasterPassword}
                secureTextEntry
                showPasswordToggle
                autoCapitalize="none"
                maxLength={64}
                error={errors.masterPassword}
              />

              <Input
                label="Confirm Master Password"
                placeholder="Re-enter your master password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                showPasswordToggle
                autoCapitalize="none"
                maxLength={64}
                error={errors.confirmPassword}
              />

              {/* Warning */}
              <View className="bg-yellow-900/30 border-2 border-yellow-700 rounded-xl p-4 mb-6">
                <Text className="text-yellow-300 text-sm font-semibold mb-1.5">⚠️ Important</Text>
                <Text className="text-yellow-400 text-sm">
                  Your master password cannot be recovered. Make sure to remember it!
                </Text>
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                isLoading={isLoading}
                className="mt-2"
              />

              <View className="flex-row justify-center mt-6">
                <Text className="text-slate-400">
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/login' } as any)}>
                  <Text className="text-blue-500 font-semibold">Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}
