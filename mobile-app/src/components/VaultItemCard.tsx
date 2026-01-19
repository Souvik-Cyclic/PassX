import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { VaultItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getFaviconUrl, getFallbackFaviconUrl } from '../utils/favicon';

interface VaultItemCardProps {
  item: VaultItem;
  onPress: () => void;
}

export function VaultItemCard({ item, onPress }: VaultItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getColorClass = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'card':
        return 'card';
      case 'note':
        return 'document-text';
      default:
        return 'lock-closed';
    }
  };

  const getSubtitle = (item: VaultItem) => {
    if (item.type === 'login' && item.username) {
      return item.username;
    } else if (item.type === 'card' && item.cardNumber) {
      // Show last 4 digits of card
      const last4 = item.cardNumber.slice(-4);
      return `•••• ${last4}`;
    } else if (item.type === 'note' && item.notes) {
      // Show first 50 chars of note
      return item.notes.substring(0, 50) + (item.notes.length > 50 ? '...' : '');
    }
    return null;
  };

  const subtitle = getSubtitle(item);

  // Get favicon URL for login items with URL
  const faviconUrl = item.type === 'login' && item.url && !imageError
    ? (useFallback ? getFallbackFaviconUrl(item.url) : getFaviconUrl(item.url))
    : null;

  const handleImageError = () => {
    if (!useFallback) {
      // Try fallback first
      setUseFallback(true);
    } else {
      // Both failed, show default icon
      setImageError(true);
    }
  };

  const renderIcon = () => {
    // Show favicon for login items with URL
    if (faviconUrl && item.type === 'login') {
      return (
        <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 overflow-hidden border border-slate-600">
          <Image
            source={{ uri: faviconUrl }}
            className="w-6 h-6"
            onError={handleImageError}
          />
        </View>
      );
    }

    // Default colored icon
    return (
      <View className={`w-10 h-10 rounded-full ${getColorClass(item.name)} items-center justify-center mr-3`}>
        <Ionicons
          name={getTypeIcon(item.type) as any}
          size={18}
          color="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-slate-800 rounded-2xl p-4 mb-3 flex-row items-center border border-slate-700/50"
      activeOpacity={0.7}
    >
      {/* Icon */}
      {renderIcon()}

      {/* Content */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-white mb-0.5">
          {item.name}
        </Text>
        {subtitle && (
          <Text className="text-sm text-slate-400">
            {subtitle}
          </Text>
        )}
      </View>

      {/* Arrow */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color="#64748B"
      />
    </TouchableOpacity>
  );
}
