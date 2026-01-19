import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  isLoading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-transparent border-2 border-slate-600';
      case 'danger':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getTextClass = () => {
    return variant === 'secondary' ? 'text-slate-200' : 'text-white';
  };

  return (
    <TouchableOpacity
      className={`py-4 px-6 rounded-xl items-center justify-center shadow-lg ${
        getVariantClass()
      } ${(disabled || isLoading) && 'opacity-50'} ${className || ''}`}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`text-base font-semibold text-center tracking-wide ${getTextClass()}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
