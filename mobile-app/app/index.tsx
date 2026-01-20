import "../global.css";
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/vault');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
      <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
        <Text className="text-white text-4xl font-bold">P</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        PassX
      </Text>
      <ActivityIndicator size="large" color="#3B82F6" className="mt-4" />
    </View>
  );
}