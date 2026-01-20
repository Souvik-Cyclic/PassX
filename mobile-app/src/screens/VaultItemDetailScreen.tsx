import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input, Button } from '../components';
import { useVault } from '../context/VaultContext';
import { useAlert } from '../context/AlertContext';
import { VaultItem, VaultItemType, CardBrand } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { getFaviconUrl } from '../utils/favicon';

export default function VaultItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaultItems, updateVaultItem, deleteVaultItem, isLoading } = useVault();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [item, setItem] = useState<VaultItem | null>(null);
  const [type, setType] = useState<VaultItemType>('login');
  const [name, setName] = useState('');
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  
  // Card fields
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardBrand, setCardBrand] = useState<CardBrand>('visa');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Common fields
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const foundItem = vaultItems.find((i) => i._id === id);
    if (foundItem) {
      setItem(foundItem);
      setType(foundItem.type || 'login');
      setName(foundItem.name);
      setUsername(foundItem.username || '');
      setPassword(foundItem.password || '');
      setUrl(foundItem.url || '');
      setCardHolderName(foundItem.cardHolderName || '');
      setCardNumber(foundItem.cardNumber || '');
      setCardBrand(foundItem.cardBrand || 'visa');
      setExpirationMonth(foundItem.expirationMonth || '');
      setExpirationYear(foundItem.expirationYear || '');
      setCvv(foundItem.cvv || '');
      setNotes(foundItem.notes || '');
    }
  }, [id, vaultItems]);

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    showAlert({ title: 'Copied', message: `${label} copied to clipboard` });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({ title: 'Error', message: 'Please enter a name' });
      return;
    }

    try {
      const baseItem = {
        type,
        name: name.trim(),
        notes: notes.trim() || undefined,
        isFavorite: item?.isFavorite,
      };

      let updatedData;
      if (type === 'login') {
        updatedData = {
          ...baseItem,
          username: username.trim() || undefined,
          password: password || undefined,
          url: url.trim() || undefined,
        };
      } else if (type === 'card') {
        updatedData = {
          ...baseItem,
          cardHolderName: cardHolderName.trim() || undefined,
          cardNumber: cardNumber.trim() || undefined,
          cardBrand: cardBrand,
          expirationMonth: expirationMonth.trim() || undefined,
          expirationYear: expirationYear.trim() || undefined,
          cvv: cvv.trim() || undefined,
        };
      } else {
        // note type
        updatedData = baseItem;
      }

      await updateVaultItem(id, updatedData);

      setIsEditing(false);
      showAlert({ title: 'Success', message: 'Vault item updated' });
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'Failed to update vault item' });
    }
  };

  const handleDelete = () => {
    showAlert({
      title: 'Move to Trash',
      message: 'This item will be moved to trash. You can restore it later or delete it permanently.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVaultItem(id);
              showAlert({
                title: 'Success',
                message: 'Item moved to trash',
                buttons: [{ text: 'OK', onPress: () => router.back() }],
              });
            } catch (error) {
              showAlert({ title: 'Error', message: 'Failed to move item to trash' });
            }
          },
        },
      ],
    });
  };

  const handleClone = () => {
    if (!item) return;
    
    // Navigate to add screen with all current item data
    const params: any = {
      clone: 'true',
      type: item.type,
      name: `${item.name} (Copy)`,
      notes: item.notes || '',
    };

    if (item.type === 'login') {
      params.username = item.username || '';
      params.password = item.password || '';
      params.url = item.url || '';
    } else if (item.type === 'card') {
      params.cardHolderName = item.cardHolderName || '';
      params.cardNumber = item.cardNumber || '';
      params.cardBrand = item.cardBrand || 'visa';
      params.expirationMonth = item.expirationMonth || '';
      params.expirationYear = item.expirationYear || '';
      params.cvv = item.cvv || '';
    }

    router.push({ pathname: '/vault/add', params } as any);
  };

  const handleToggleFavorite = async () => {
    try {
      await updateVaultItem(id, { isFavorite: !item?.isFavorite });
      showAlert({ 
        title: 'Success', 
        message: item?.isFavorite ? 'Removed from favorites' : 'Added to favorites' 
      });
    } catch (error) {
      showAlert({ title: 'Error', message: 'Failed to update favorite status' });
    }
  };

  if (!item) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <Text className="text-slate-400">Item not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1"
      keyboardVerticalOffset={0}
    >
      <StatusBar style="light" />
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="bg-slate-800 pt-12 pb-6 px-6 border-b border-slate-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              {/* Show favicon for login items with URL */}
              {item.type === 'login' && item.url && (
                <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-3 overflow-hidden">
                  <Image
                    source={{ uri: getFaviconUrl(item.url) || '' }}
                    className="w-5 h-5"
                  />
                </View>
              )}
              <Text className="text-2xl font-bold text-white flex-1">
                {item.name}
              </Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity onPress={handleToggleFavorite} className="mr-4">
                <Ionicons 
                  name={item.isFavorite ? "star" : "star-outline"} 
                  size={24} 
                  color={item.isFavorite ? "#FBBF24" : "white"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClone} className="mr-4">
                <Ionicons name="copy-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)} className="mr-4">
                <Ionicons
                  name={isEditing ? 'close' : 'create-outline'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 pt-6">
          {isEditing ? (
            <>
              {/* Type Selector */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-slate-200 mb-3 tracking-wide">
                  Type
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setType('login')}
                    className={`flex-1 p-3.5 rounded-xl border-2 flex-row items-center justify-center ${
                      type === 'login' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={type === 'login' ? '#3B82F6' : '#94A3B8'}
                    />
                    <Text className={`ml-2 font-semibold ${
                      type === 'login' ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                      Login
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setType('card')}
                    className={`flex-1 p-3.5 rounded-xl border-2 flex-row items-center justify-center ${
                      type === 'card' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Ionicons
                      name="card"
                      size={18}
                      color={type === 'card' ? '#3B82F6' : '#94A3B8'}
                    />
                    <Text className={`ml-2 font-semibold ${
                      type === 'card' ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                      Card
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setType('note')}
                    className={`flex-1 p-3.5 rounded-xl border-2 flex-row items-center justify-center ${
                      type === 'note' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Ionicons
                      name="document-text"
                      size={18}
                      color={type === 'note' ? '#3B82F6' : '#94A3B8'}
                    />
                    <Text className={`ml-2 font-semibold ${
                      type === 'note' ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                      Note
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Input
                label="Name *"
                value={name}
                onChangeText={setName}
              />
              
              {/* Login-specific fields */}
              {type === 'login' && (
                <>
                  <Input
                    label="Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                  <View>
                    <Text className="text-sm font-semibold text-slate-200 mb-2">
                      Password
                    </Text>
                    <View className="relative">
                      <Input
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3"
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Input
                    label="Website URL"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                  />
                </>
              )}
              
              {/* Card-specific fields */}
              {type === 'card' && (
                <>
                  <Input
                    label="Cardholder Name"
                    value={cardHolderName}
                    onChangeText={setCardHolderName}
                    autoCapitalize="words"
                  />
                  <Input
                    label="Card Number"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="number-pad"
                  />
                  
                  {/* Card Brand Dropdown */}
                  <View className="mb-5">
                    <Text className="text-sm font-semibold text-slate-200 mb-2 tracking-wide">
                      Brand
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowBrandDropdown(!showBrandDropdown)}
                      className="w-full px-4 py-3.5 bg-slate-800 border-2 border-slate-700 rounded-xl flex-row justify-between items-center"
                    >
                      <Text className="text-white text-base capitalize">
                        {cardBrand.replace('-', ' ')}
                      </Text>
                      <Ionicons 
                        name={showBrandDropdown ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </TouchableOpacity>
                    {showBrandDropdown && (
                      <View className="mt-2 bg-slate-800 border-2 border-slate-700 rounded-xl overflow-hidden">
                        {(['visa', 'mastercard', 'amex', 'diners-club', 'rupay'] as CardBrand[]).map((brand) => (
                          <TouchableOpacity
                            key={brand}
                            onPress={() => {
                              setCardBrand(brand);
                              setShowBrandDropdown(false);
                            }}
                            className={`px-4 py-3 border-b border-slate-700 ${
                              cardBrand === brand ? 'bg-blue-600/20' : ''
                            }`}
                          >
                            <Text className={`text-base capitalize ${
                              cardBrand === brand ? 'text-blue-400 font-semibold' : 'text-white'
                            }`}>
                              {brand.replace('-', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="Exp. Month"
                        value={expirationMonth}
                        onChangeText={setExpirationMonth}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Exp. Year"
                        value={expirationYear}
                        onChangeText={setExpirationYear}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <View>
                    <View className="relative">
                      <Input
                        label="CVV"
                        value={cvv}
                        onChangeText={setCvv}
                        secureTextEntry={!showCvv}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCvv(!showCvv)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        <Ionicons
                          name={showCvv ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
              
              <Input
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                className="h-24"
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                isLoading={isLoading}
                className="mt-4 mb-8"
              />
            </>
          ) : (
            <>
              {/* Login fields */}
              {type === 'login' && (
                <>
                  {username && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Username
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center justify-between">
                        <Text className="text-white flex-1">
                          {username}
                        </Text>
                        <TouchableOpacity onPress={() => handleCopy(username, 'Username')}>
                          <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {password && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Password
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center justify-between">
                        <Text className="text-white flex-1">
                          {showPassword ? password : '••••••••'}
                        </Text>
                        <View className="flex-row">
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="mr-4">
                            <Ionicons
                              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleCopy(password, 'Password')}>
                            <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {url && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Website URL
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <Text className="text-blue-400">{url}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Card fields */}
              {type === 'card' && (
                <>
                  {cardHolderName && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Cardholder Name
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center justify-between">
                        <Text className="text-white flex-1">
                          {cardHolderName}
                        </Text>
                        <TouchableOpacity onPress={() => handleCopy(cardHolderName, 'Cardholder Name')}>
                          <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {cardNumber && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Card Number
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center justify-between">
                        <Text className="text-white flex-1 font-mono">
                          {cardNumber}
                        </Text>
                        <TouchableOpacity onPress={() => handleCopy(cardNumber, 'Card Number')}>
                          <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {cardBrand && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Brand
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <Text className="text-white capitalize">{cardBrand.replace('-', ' ')}</Text>
                      </View>
                    </View>
                  )}

                  {(expirationMonth || expirationYear) && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        Expiration Date
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <Text className="text-white">{expirationMonth}/{expirationYear}</Text>
                      </View>
                    </View>
                  )}

                  {cvv && (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-slate-200 mb-2">
                        CVV
                      </Text>
                      <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center justify-between">
                        <Text className="text-white flex-1 font-mono">
                          {showCvv ? cvv : '•••'}
                        </Text>
                        <View className="flex-row">
                          <TouchableOpacity onPress={() => setShowCvv(!showCvv)} className="mr-4">
                            <Ionicons
                              name={showCvv ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleCopy(cvv, 'CVV')}>
                            <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}

              {notes && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-slate-200 mb-2">
                    Notes
                  </Text>
                  <View className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <Text className="text-white">{notes}</Text>
                  </View>
                </View>
              )}

              <View className="mt-6 pt-6 border-t border-slate-700">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text className="text-xs text-slate-400 ml-2 font-medium">
                    TIMESTAMPS
                  </Text>
                </View>
                <View className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-xs text-slate-500">Created</Text>
                    <Text className="text-sm text-slate-300">
                      {new Date(item.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-slate-500">Last Updated</Text>
                    <Text className="text-sm text-slate-300">
                      {new Date(item.updatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
