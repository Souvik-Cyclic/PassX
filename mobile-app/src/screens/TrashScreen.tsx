import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVault } from '../context/VaultContext';
import { useAlert } from '../context/AlertContext';
import { VaultItemCard } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function TrashScreen() {
  const { vaultItems, restoreFromTrash, permanentlyDeleteVaultItem, isLoading } = useVault();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const deletedItems = useMemo(() => {
    return vaultItems.filter((item) => item.deletedAt);
  }, [vaultItems]);

  const handleRestore = async (itemId: string) => {
    try {
      await restoreFromTrash(itemId);
      showAlert({ title: 'Success', message: 'Item restored to vault' });
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'Failed to restore item' });
    }
  };

  const handlePermanentDelete = async (itemId: string) => {
    showAlert({
      title: 'Permanently Delete',
      message: 'This item will be permanently deleted and cannot be recovered. Are you sure?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await permanentlyDeleteVaultItem(itemId);
              showAlert({ title: 'Success', message: 'Item permanently deleted' });
            } catch (error: any) {
              showAlert({ title: 'Error', message: 'Failed to delete item' });
            }
          },
        },
      ],
    });
  };

  const handleEmptyTrash = () => {
    if (deletedItems.length === 0) return;

    showAlert({
      title: 'Empty Trash',
      message: `Permanently delete ${deletedItems.length} item(s)? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                deletedItems.map((item) => permanentlyDeleteVaultItem(item._id))
              );
              showAlert({ title: 'Success', message: 'Trash emptied' });
            } catch (error: any) {
              showAlert({ title: 'Error', message: 'Failed to empty trash' });
            }
          },
        },
      ],
    });
  };

  const renderItem = ({ item }: any) => (
    <View className="mb-3">
      <VaultItemCard item={item} onPress={() => {}} />
      <View className="flex-row gap-3 mt-3">
        <TouchableOpacity
          onPress={() => handleRestore(item._id)}
          className="flex-1 bg-blue-600 py-3.5 rounded-xl flex-row items-center justify-center"
        >
          <Ionicons name="arrow-undo" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold ml-2">Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePermanentDelete(item._id)}
          className="flex-1 bg-red-600 py-3.5 rounded-xl flex-row items-center justify-center"
        >
          <Ionicons name="trash" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold ml-2">Delete Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="bg-slate-800 pt-12 pb-2 px-6 border-b border-slate-700">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>
            <Image
              source={require('../../assets/images/passx-logo.png')}
              className="w-8 h-8 mr-2.5 rounded-lg"
              resizeMode="contain"
            />
            <View>
              <Text className="text-xl font-bold text-white tracking-tight">Pass<Text className="text-blue-400">X</Text> Trash</Text>
              <Text className="text-slate-400 text-xs">
                {deletedItems.length} item{deletedItems.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {deletedItems.length > 0 && (
            <TouchableOpacity onPress={handleEmptyTrash} className="p-1.5">
              <Text className="text-red-400 font-semibold text-sm">Empty Trash</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 pt-6">
        {deletedItems.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="trash-outline" size={64} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4">Trash is empty</Text>
            <Text className="text-slate-500 text-sm mt-2 text-center">
              Deleted items will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={deletedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
