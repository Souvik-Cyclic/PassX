import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export function Input({ label, error, className, showPasswordToggle, secureTextEntry, ...props }: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldShowToggle = showPasswordToggle && secureTextEntry;

  return (
    <View className="mb-5">
      {label && (
        <Text className="text-sm font-semibold text-slate-200 mb-2 tracking-wide">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          className={`w-full px-4 py-3.5 bg-slate-800 border-2 ${
            error ? 'border-red-500' : 'border-slate-700'
          } rounded-xl text-white text-base ${shouldShowToggle ? 'pr-12' : ''}`}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={shouldShowToggle ? !isPasswordVisible : secureTextEntry}
          {...props}
        />
        {shouldShowToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-3.5"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View className="flex-row items-center mt-2 bg-red-900/20 px-3 py-2 rounded-xl border border-red-800/50">
          <Text className="text-sm text-red-400 flex-1">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
