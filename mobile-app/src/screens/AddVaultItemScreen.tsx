import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input, Button } from '../components';
import { useVault } from '../context/VaultContext';
import { useAlert } from '../context/AlertContext';
import { VaultItemType, CardBrand } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function AddVaultItemScreen() {
  const params = useLocalSearchParams();
  const isCloning = params.clone === 'true';
  
  const [type, setType] = useState<VaultItemType>((params.type as VaultItemType) || 'login');
  const [name, setName] = useState((params.name as string) || '');
  
  // Login fields
  const [username, setUsername] = useState((params.username as string) || '');
  const [password, setPassword] = useState((params.password as string) || '');
  const [url, setUrl] = useState((params.url as string) || '');
  
  // Card fields
  const [cardHolderName, setCardHolderName] = useState((params.cardHolderName as string) || '');
  const [cardNumber, setCardNumber] = useState((params.cardNumber as string) || '');
  const [cardBrand, setCardBrand] = useState<CardBrand>((params.cardBrand as CardBrand) || 'visa');
  const [expirationMonth, setExpirationMonth] = useState((params.expirationMonth as string) || '');
  const [expirationYear, setExpirationYear] = useState((params.expirationYear as string) || '');
  const [cvv, setCvv] = useState((params.cvv as string) || '');
  
  // Common fields
  const [notes, setNotes] = useState((params.notes as string) || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const { addVaultItem, isLoading } = useVault();
  const { showAlert } = useAlert();
  const router = useRouter();

  const generatePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(password);
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
      };

      let item;
      if (type === 'login') {
        item = {
          ...baseItem,
          username: username.trim() || undefined,
          password: password || undefined,
          url: url.trim() || undefined,
        };
      } else if (type === 'card') {
        item = {
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
        item = baseItem;
      }

      await addVaultItem(item);

      showAlert({
        title: 'Success',
        message: 'Vault item added',
        buttons: [{ text: 'OK', onPress: () => router.back() }],
      });
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'Failed to add vault item' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <StatusBar style="light" />
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="bg-slate-800 pt-12 pb-6 px-6 border-b border-slate-700">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white">
              {isCloning ? 'Clone Item' : 'Add Item'}
            </Text>
          </View>
        </View>

        {/* Form */}
        <ScrollView className="flex-1 px-6 pt-6">
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
            placeholder={type === 'login' ? 'e.g., Gmail, Facebook' : type === 'card' ? 'e.g., Chase Visa' : 'e.g., Important Notes'}
            value={name}
            onChangeText={setName}
          />

          {/* Login-specific fields */}
          {type === 'login' && (
            <>
              <Input
                label="Username"
                placeholder="your@email.com"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-slate-200">
                    Password
                  </Text>
                  <TouchableOpacity onPress={generatePassword}>
                    <Text className="text-blue-600 text-sm font-medium">
                      Generate
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="relative">
                  <Input
                    placeholder="Enter password"
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
                placeholder="https://example.com"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </>
          )}

          {/* Card-specific fields */}
          {type === 'card' && (
            <>
              <Input
                label="Cardholder Name"
                placeholder="John Doe"
                value={cardHolderName}
                onChangeText={setCardHolderName}
                autoCapitalize="words"
              />

              <Input
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                maxLength={19}
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
                    placeholder="MM"
                    value={expirationMonth}
                    onChangeText={setExpirationMonth}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Exp. Year"
                    placeholder="YYYY"
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
                    placeholder="123"
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
            placeholder="Additional notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            className="h-24"
          />

          <Button
            title="Save"
            onPress={handleSave}
            isLoading={isLoading}
            className="mt-4 mb-8"
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
