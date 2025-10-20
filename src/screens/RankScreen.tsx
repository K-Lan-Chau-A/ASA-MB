import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';

type Rank = {
  rankId: number;
  rankName: string;
  benefit: number;
  threshold: number | null;
  shopId: number;
};

type RanksResponse = {
  items: Rank[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const fetchRanks = async (params: {
  shopId: number;
  page: number;
  pageSize: number;
}): Promise<RanksResponse> => {
  const { shopId, page, pageSize } = params;
  const token = await getAuthToken();
  const url = `${API_URL}/api/ranks?ShopId=${encodeURIComponent(shopId)}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch ranks: ${response.status} ${text}`);
  }
  return (await response.json()) as RanksResponse;
};

const createRank = async (data: {
  rankName: string;
  benefit: number;
  threshold: number | null;
  shopId: number;
}): Promise<boolean> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/ranks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  return response.ok;
};

const deleteRank = async (rankId: number): Promise<boolean> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/ranks/${rankId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return response.ok;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const RankItem = ({ item, onDelete, onEdit }: { item: Rank; onDelete: (rankId: number) => void; onEdit: (item: Rank) => void }) => {
  // Rank color logic removed: rank names will be rendered in default text color

  return (
    <TouchableOpacity style={styles.rankItem}>
      <View style={styles.rankContent}>
        <View style={styles.rankHeader}>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{item.rankName}</Text>
            <Text style={styles.rankBadge}>{formatPercentage(item.benefit)} chiết khấu</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={() => onEdit(item)} 
              style={styles.editButton}
            >
              <Icon name="pencil" size={16} color="#009DA5" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onDelete(item.rankId)} 
              style={styles.deleteButton}
            >
              <Icon name="delete" size={16} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.rankDetails}>
          <View style={styles.detailItem}>
            <Icon name="cash" size={14} color="#666" />
            <Text style={styles.detailText}>
              Ngưỡng: {item.threshold ? formatCurrency(item.threshold) : 'Chưa có'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const RankScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const PAGE_SIZE = 10;
  const [shopId, setShopId] = useState<number | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [createForm, setCreateForm] = useState({
    rankName: '',
    benefit: '',
    threshold: '',
  });
  const [editForm, setEditForm] = useState({
    rankName: '',
    benefit: '',
    threshold: '',
  });

  useEffect(() => {
    let mounted = true;
    getShopId().then((id) => {
      if (mounted) setShopId(id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['ranks', shopId],
    queryFn: ({ pageParam = 1 }) =>
      fetchRanks({ shopId: shopId as number, page: pageParam as number, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    enabled: typeof shopId === 'number' && shopId > 0,
  });

  const createRankMutation = useMutation({
    mutationFn: createRank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks', shopId] });
      setCreateModalVisible(false);
      setCreateForm({ rankName: '', benefit: '', threshold: '' });
      Alert.alert('Thành công', 'Tạo xếp hạng thành công');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Tạo xếp hạng thất bại');
    },
  });

  const deleteRankMutation = useMutation({
    mutationFn: deleteRank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks', shopId] });
      Alert.alert('Thành công', 'Xóa xếp hạng thành công');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Xóa xếp hạng thất bại');
    },
  });

  const updateRank = async (rankId: number, data: {
    rankName: string;
    benefit: number;
    threshold: number | null;
    shopId: number;
  }): Promise<boolean> => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/ranks/${rankId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    return response.ok;
  };

  const updateRankMutation = useMutation({
    mutationFn: ({ rankId, data }: { rankId: number; data: any }) => updateRank(rankId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks', shopId] });
      setEditModalVisible(false);
      setEditingRank(null);
      setEditForm({ rankName: '', benefit: '', threshold: '' });
      Alert.alert('Thành công', 'Cập nhật xếp hạng thành công');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Cập nhật xếp hạng thất bại');
    },
  });

  const flatData = useMemo(() => {
    const items = data?.pages?.flatMap(p => p.items) ?? [];
    return items;
  }, [data]);

  const handleEdit = useCallback((item: Rank) => {
    setEditingRank(item);
    setEditForm({
      rankName: item.rankName,
      benefit: (item.benefit * 100).toString(),
      threshold: item.threshold ? item.threshold.toString() : '',
    });
    setEditModalVisible(true);
  }, []);

  const renderItem = useCallback(({ item }: { item: Rank }) => (
    <RankItem item={item} onDelete={deleteRankMutation.mutate} onEdit={handleEdit} />
  ), [deleteRankMutation, handleEdit]);

  const keyExtractor = useCallback((item: Rank) => String(item.rankId), []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreateRank = useCallback(async () => {
    if (!shopId) return;
    
    const rankName = createForm.rankName.trim();
    const benefitValue = parseFloat(createForm.benefit);
    const thresholdValue = createForm.threshold.trim() ? parseFloat(createForm.threshold) : null;

    if (!rankName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên xếp hạng');
      return;
    }

    if (isNaN(benefitValue) || benefitValue <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập phần trăm chiết khấu hợp lệ');
      return;
    }

    if (thresholdValue !== null && (isNaN(thresholdValue) || thresholdValue <= 0)) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngưỡng tiêu dùng hợp lệ');
      return;
    }

    // Convert percentage to decimal (e.g., 1% -> 0.01)
    const benefitDecimal = benefitValue / 100;

    createRankMutation.mutate({
      rankName,
      benefit: benefitDecimal,
      threshold: thresholdValue,
      shopId,
    });
  }, [createForm, shopId, createRankMutation]);

  const handleUpdateRank = useCallback(async () => {
    if (!shopId || !editingRank) return;
    
    const rankName = editForm.rankName.trim();
    const benefitValue = parseFloat(editForm.benefit);
    const thresholdValue = editForm.threshold.trim() ? parseFloat(editForm.threshold) : null;

    if (!rankName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên xếp hạng');
      return;
    }

    if (isNaN(benefitValue) || benefitValue <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập phần trăm chiết khấu hợp lệ');
      return;
    }

    if (thresholdValue !== null && (isNaN(thresholdValue) || thresholdValue <= 0)) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngưỡng tiêu dùng hợp lệ');
      return;
    }

    // Convert percentage to decimal (e.g., 1% -> 0.01)
    const benefitDecimal = benefitValue / 100;

    updateRankMutation.mutate({
      rankId: editingRank.rankId,
      data: {
        rankName,
        benefit: benefitDecimal,
        threshold: thresholdValue,
        shopId,
      },
    });
  }, [editForm, shopId, editingRank, updateRankMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý xếp hạng</Text>
        <TouchableOpacity 
          onPress={() => setCreateModalVisible(true)} 
          style={{ padding: 4 }}
        >
          <Icon name="plus" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        data={flatData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={(typeof shopId !== 'number' || shopId <= 0) ? true : (isLoading || isRefetching)}
        onRefresh={refetch}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text>Đang tải thêm...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text>Chưa có xếp hạng nào</Text>
            </View>
          ) : null
        }
      />

      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo xếp hạng mới</Text>
              <TouchableOpacity 
                onPress={() => setCreateModalVisible(false)} 
                style={{ padding: 6 }}
              >
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <TextInput
                placeholder="Tên xếp hạng (VD: Vàng, Bạc, Kim Cương)"
                style={styles.input}
                value={createForm.rankName}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, rankName: text }))}
              />
              
              <TextInput
                placeholder="Phần trăm chiết khấu (VD: 5 cho 5%)"
                style={styles.input}
                value={createForm.benefit}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, benefit: text }))}
                keyboardType="numeric"
              />
              
              <TextInput
                placeholder="Ngưỡng tiêu dùng (VNĐ) - để trống nếu không giới hạn"
                style={styles.input}
                value={createForm.threshold}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, threshold: text }))}
                keyboardType="numeric"
              />
              
              <TouchableOpacity 
                style={[styles.createButton, createRankMutation.isPending && { opacity: 0.7 }]} 
                onPress={handleCreateRank}
                disabled={createRankMutation.isPending}
              >
                {createRankMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Tạo xếp hạng</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa xếp hạng</Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)} 
                style={{ padding: 6 }}
              >
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <TextInput
                placeholder="Tên xếp hạng (VD: Vàng, Bạc, Kim Cương)"
                style={styles.input}
                value={editForm.rankName}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, rankName: text }))}
              />
              
              <TextInput
                placeholder="Phần trăm chiết khấu (VD: 5 cho 5%)"
                style={styles.input}
                value={editForm.benefit}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, benefit: text }))}
                keyboardType="numeric"
              />
              
              <TextInput
                placeholder="Ngưỡng tiêu dùng (VNĐ) - để trống nếu không giới hạn"
                style={styles.input}
                value={editForm.threshold}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, threshold: text }))}
                keyboardType="numeric"
              />
              
              <TouchableOpacity 
                style={[styles.createButton, updateRankMutation.isPending && { opacity: 0.7 }]} 
                onPress={handleUpdateRank}
                disabled={updateRankMutation.isPending}
              >
                {updateRankMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Cập nhật xếp hạng</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  content: { flex: 1 },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  rankContent: {
    flex: 1,
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  rankDetails: {
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  formContainer: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#009DA5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RankScreen;
