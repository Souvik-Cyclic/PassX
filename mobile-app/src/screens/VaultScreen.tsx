import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useAlert } from '../context/AlertContext';
import { VaultItemCard } from '../components';
import { VaultItemType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function VaultScreen() {
  const { user, signOut } = useAuth();
  const { vaultItems, isLoading, fetchVaultItems } = useVault();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortAscending, setSortAscending] = useState(true);
  const [filterType, setFilterType] = useState<VaultItemType | 'all'>('all');

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      await fetchVaultItems();
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'Failed to load vault items' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVault();
    setRefreshing(false);
  };

  const handleLogout = () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ],
    });
  };

  const handleItemPress = (itemId: string) => {
    router.push({ pathname: `/vault/[id]`, params: { id: itemId } } as any);
  };

  const handleTrashPress = () => {
    router.push('/vault/trash' as any);
  };

  const filteredAndSortedItems = useMemo(() => {
    // Filter out deleted items and apply search
    let filtered = vaultItems.filter(
      (item) =>
        !item.deletedAt &&
        (filterType === 'all' || item.type === filterType) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false))
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        // Sort by last updated date
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateB - dateA; // Newest first by default
      }
      return sortAscending ? comparison : -comparison;
    });
  }, [vaultItems, searchQuery, sortBy, sortAscending, filterType]);

  const favoriteItems = useMemo(() => {
    return filteredAndSortedItems.filter(item => item.isFavorite);
  }, [filteredAndSortedItems]);

  const allItems = filteredAndSortedItems;

  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-slate-800 pt-12 pb-2 px-6 border-b border-slate-700">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Image
              source={require('../../assets/images/passx-logo.png')}
              className="w-8 h-8 mr-2.5 rounded-lg"
              resizeMode="contain"
            />
            <View>
              <Text className="text-2xl font-bold text-white tracking-tight">Pass<Text className="text-blue-400">X</Text></Text>
              <Text className="text-xs text-slate-500 font-medium">Secure Vault</Text>
            </View>
          </View>
          <View className="flex-row gap-2 items-center">
            <TouchableOpacity onPress={handleTrashPress} className="p-1.5">
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} className="p-1.5">
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-slate-400 text-xs mt-0.5 ml-11">{user?.email}</Text>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-2.5 bg-slate-900">
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 py-2 border border-slate-700/50">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2.5 text-white text-sm"
            placeholder="Search vault..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Type Filter */}
        <View className="flex-row gap-2 mt-2.5">
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl flex-row items-center ${
              filterType === 'all' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <Ionicons name="apps" size={14} color={filterType === 'all' ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`ml-1.5 text-xs font-semibold ${
              filterType === 'all' ? 'text-white' : 'text-slate-400'
            }`}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilterType('login')}
            className={`px-4 py-2 rounded-xl flex-row items-center ${
              filterType === 'login' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <Ionicons name="lock-closed" size={14} color={filterType === 'login' ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`ml-1.5 text-xs font-semibold ${
              filterType === 'login' ? 'text-white' : 'text-slate-400'
            }`}>
              Logins
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilterType('card')}
            className={`px-4 py-2 rounded-xl flex-row items-center ${
              filterType === 'card' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <Ionicons name="card" size={14} color={filterType === 'card' ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`ml-1.5 text-xs font-semibold ${
              filterType === 'card' ? 'text-white' : 'text-slate-400'
            }`}>
              Cards
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilterType('note')}
            className={`px-4 py-2 rounded-xl flex-row items-center ${
              filterType === 'note' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <Ionicons name="document-text" size={14} color={filterType === 'note' ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`ml-1.5 text-xs font-semibold ${
              filterType === 'note' ? 'text-white' : 'text-slate-400'
            }`}>
              Notes
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="flex-row items-center justify-between mt-3">
          <TouchableOpacity
            onPress={() => setSortAscending(!sortAscending)}
            className="flex-row items-center"
          >
            <Ionicons
              name={sortAscending ? 'arrow-down' : 'arrow-up'}
              size={16}
              color="#94A3B8"
            />
            <Text className="text-slate-400 text-sm ml-2">
              {sortBy === 'name'
                ? `Sort: ${sortAscending ? 'A-Z' : 'Z-A'}`
                : `Sort: ${sortAscending ? 'Oldest' : 'Newest'}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
            className="flex-row items-center bg-slate-800 px-3 py-2 rounded-xl border border-slate-700/50"
          >
            <Ionicons
              name={sortBy === 'name' ? 'text' : 'time'}
              size={16}
              color="#94A3B8"
            />
            <Text className="text-slate-400 text-xs ml-2">
              {sortBy === 'name' ? 'Name' : 'Date'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 pt-4">
        {vaultItems.length === 0 && !isLoading ? (
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-32 h-32 bg-slate-800/50 rounded-full items-center justify-center mb-8 border-2 border-slate-700">
              <Ionicons name="lock-closed" size={64} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-white mb-3">
              Your vault is empty
            </Text>
            <Text className="text-base text-slate-400 text-center px-8">
              Add credentials, cards, or notes to get started
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} tintColor="#3B82F6" />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Favorites Section */}
            {favoriteItems.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="star" size={18} color="#FBBF24" />
                  <Text className="text-yellow-400 text-sm font-bold tracking-wide ml-2">
                    FAVORITES
                  </Text>
                </View>
                {favoriteItems.map((item, index) => (
                  <View key={item._id}>
                    <VaultItemCard
                      item={item}
                      onPress={() => handleItemPress(item._id)}
                    />
                    {index < favoriteItems.length - 1 && <View className="h-3" />}
                  </View>
                ))}
              </View>
            )}

            {/* All Items Section */}
            {allItems.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <Ionicons name="list" size={18} color="#94A3B8" />
                  <Text className="text-slate-400 text-sm font-bold tracking-wide ml-2">
                    ALL ITEMS
                  </Text>
                </View>
                {allItems.map((item, index) => (
                  <View key={item._id}>
                    <VaultItemCard
                      item={item}
                      onPress={() => handleItemPress(item._id)}
                    />
                    {index < allItems.length - 1 && <View className="h-3" />}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/vault/add' } as any)}
        className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
