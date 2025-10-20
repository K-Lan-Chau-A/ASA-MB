// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Platform, ToastAndroid, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getUserId } from '../services/AuthStore';

type Staff = {
  userId: number;
  username: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  avatar?: string | null;
  role: number;
  createdAt?: string;
  citizenIdNumber?: string | null;
  status?: number | null;
};

const ManageAccount = () => {
  const navigation = useNavigation();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    citizenIdNumber: '',
    avatarUri: '',
  });
  const [creating, setCreating] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<Array<{ featureId: number; featureName: string }>>([]);
  const [createFeaturesSelected, setCreateFeaturesSelected] = useState<Record<number, boolean>>({});
  const [editFeaturesSelected, setEditFeaturesSelected] = useState<Record<number, boolean>>({});
  const [editVisible, setEditVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState<{ id?: number; fullName: string; phoneNumber: string; citizenIdNumber: string; status: number; avatarUri: string }>({ fullName: '', phoneNumber: '', citizenIdNumber: '', status: 1, avatarUri: '' });
  const [editOriginal, setEditOriginal] = useState<Staff | null>(null);

  const extractItems = (json: any): any[] => {
    if (!json) return [];
    if (Array.isArray(json.items)) return json.items;
    if (Array.isArray(json.data?.items)) return json.data.items;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  };

  const loadAvailableFeatures = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const ownerUserId = (await getUserId()) ?? 0; // userId của chủ shop (đang đăng nhập)
      if (!token || !(ownerUserId > 0)) { setAvailableFeatures([]); return; }
      const res = await fetch(`${API_URL}/api/userfeature?UserId=${ownerUserId}&page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      const items = extractItems(json);
      const mapped = items
        .map((f: any) => ({ featureId: Number(f?.featureId ?? 0), featureName: String(f?.featureName ?? '') }))
        .filter((f: any) => f.featureId > 0 && f.featureName);
      setAvailableFeatures(mapped);
      // default: all enabled for create modal
      const defaults: Record<number, boolean> = {};
      for (const f of mapped) defaults[f.featureId] = true;
      setCreateFeaturesSelected(defaults);
      try { console.log('[Features][load] count:', mapped.length, 'availableFeatures:', mapped); } catch {}
    } catch {
      setAvailableFeatures([]);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !(shopId > 0)) { setStaff([]); return; }
      const res = await fetch(`${API_URL}/api/users?ShopId=${shopId}&page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      const items = extractItems(json);
      const onlyStaff = items.filter((u: any) => Number(u?.role) === 2);
      const mapped: Staff[] = onlyStaff.map((u: any) => ({
        userId: Number(u?.userId ?? u?.id ?? 0),
        username: String(u?.username ?? ''),
        fullName: u?.fullName ?? null,
        phoneNumber: u?.phoneNumber ?? null,
        avatar: u?.avatar ?? null,
        role: Number(u?.role ?? 0),
        createdAt: u?.createdAt ?? undefined,
        citizenIdNumber: u?.citizenIdNumber ?? null,
        status: typeof u?.status === 'number' ? u.status : null,
      }));
      setStaff(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); loadAvailableFeatures(); }, [loadStaff, loadAvailableFeatures]);

  const onRefresh = useCallback(async () => {
    try { setRefreshing(true); await loadStaff(); } finally { setRefreshing(false); }
  }, [loadStaff]);

  const renderItem = ({ item }: { item: Staff }) => (
    <View style={styles.itemRow}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Icon name="account" size={22} color="#9AA0A6" />
        </View>
      )}
      <View style={{ flex: 1, paddingRight: 34 }}>
        <View style={styles.nameRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.fullName || 'Chưa có tên'}</Text>
          <View style={styles.inlineBadges}>
            <View style={[styles.statusBadge, (item.status ?? 0) === 1 ? styles.statusActive : styles.statusInactive]}>
              <Text style={[(item.status ?? 0) === 1 ? styles.statusActiveText : styles.statusInactiveText]}>
                {(item.status ?? 0) === 1 ? 'Hoạt động' : 'Không hoạt động'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.editInlineBtn}>
              <Icon name="pencil" size={16} color="#FF8A00" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.itemSub}>{item.phoneNumber || 'Chưa có số điện thoại'}</Text>
        <Text style={styles.itemSub}>CCCD: {item.citizenIdNumber || 'Chưa cập nhật'}</Text>
      </View>
    </View>
  );
  const filtered = staff.filter(s => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = (s.fullName || '').toLowerCase();
    const phone = (s.phoneNumber || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const openCreate = () => setCreateVisible(true);
  const closeCreate = () => setCreateVisible(false);

  const submitCreate = useCallback(async () => {
    try {
      setCreating(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !(shopId > 0)) return;
      const fd = new FormData();
      try { console.log('[CreateStaff] start payload build'); } catch {}
      fd.append('Username', createForm.username.trim());
      fd.append('Password', createForm.password);
      if (createForm.fullName.trim()) fd.append('FullName', createForm.fullName.trim());
      if (createForm.phoneNumber.trim()) fd.append('PhoneNumber', createForm.phoneNumber.trim());
      if (createForm.citizenIdNumber.trim()) fd.append('CitizenIdNumber', createForm.citizenIdNumber.trim());
      fd.append('ShopId', String(shopId));
      // AvatarFile có thể null: chỉ đính kèm nếu người dùng đã chọn ảnh từ thư viện
      if (createForm.avatarUri && (createForm.avatarUri.startsWith('file') || createForm.avatarUri.startsWith('content'))) {
        const uri = createForm.avatarUri;
        const name = uri.split('/').pop() || 'avatar.jpg';
        const file: any = { uri, name, type: 'image/jpeg' };
        try { console.log('[CreateStaff] attach AvatarFile:', { uri, name }); } catch {}
        fd.append('AvatarFile', file as any);
      }
      const res = await fetch(`${API_URL}/api/users/create-staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      try { console.log('[CreateStaff] HTTP status:', res.status, res.statusText); } catch {}
      // We don't strictly parse response here; assume success on 2xx
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const msg = (json && (json.message || json?.data?.message)) || 'Tạo tài khoản thành công';
        try { console.log('[CreateStaff] success response:', json); } catch {}
        // Lấy userId mới tạo
        const createdUserId = Number(
          (json?.data?.userId ?? json?.userId ?? json?.id ?? json?.data?.user?.userId ?? 0)
        ) || 0;
        // Cấp quyền mặc định dựa trên availableFeatures
        try {
          if (createdUserId > 0 && availableFeatures.length > 0) {
            const featuresToAssign = availableFeatures
              .filter(f => Boolean(createFeaturesSelected[f.featureId]))
              .map(f => ({ featureId: f.featureId, featureName: f.featureName, isEnabled: true, isEnable: true }));
            
            if (featuresToAssign.length > 0) {
              const payload = {
                userId: createdUserId,
                features: featuresToAssign,
              } as any;
              try { console.log('[UserFeature][assign] payload:', payload); } catch {}
              const featRes = await fetch(`${API_URL}/api/userfeature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
              });
              const featJson = await featRes.json().catch(() => null);
              try { console.log('[UserFeature][assign] status:', featRes.status, 'body:', featJson); } catch {}
            }
          }
        } catch {}
        closeCreate();
        setCreateForm({ username: '', password: '', fullName: '', phoneNumber: '', citizenIdNumber: '', avatarUri: '' });
        await loadStaff();
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Thành công', msg);
      } else {
        const text = await res.text().catch(() => '');
        const msg = text || 'Tạo tài khoản thất bại';
        try { console.log('[CreateStaff] failure body:', text); } catch {}
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Thất bại', msg);
      }
    } finally {
      setCreating(false);
    }
  }, [createForm, loadStaff]);

  const pickAvatar = useCallback(async () => {
    try {
      const ImagePicker = await import('react-native-image-picker');
      const { launchImageLibrary } = ImagePicker;
      const result: any = await new Promise((resolve) => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res: any) => resolve(res));
      });
      try { console.log('[PickAvatar] result:', result); } catch {}
      if (result?.assets?.length) {
        const asset = result.assets[0];
        const uri = asset.uri || '';
        if (uri) {
          try { console.log('[PickAvatar] chosen uri:', uri); } catch {}
          setCreateForm((f) => ({ ...f, avatarUri: uri }));
        }
      }
    } catch (e) {
      try { console.log('[PickAvatar] error:', e); } catch {}
    }
  }, []);

  const pickEditAvatar = useCallback(async () => {
    try {
      const ImagePicker = await import('react-native-image-picker');
      const { launchImageLibrary } = ImagePicker;
      const result: any = await new Promise((resolve) => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res: any) => resolve(res));
      });
      try { console.log('[PickAvatar(Edit)] result:', result); } catch {}
      if (result?.assets?.length) {
        const asset = result.assets[0];
        const uri = asset.uri || '';
        if (uri) {
          try { console.log('[PickAvatar(Edit)] chosen uri:', uri); } catch {}
          setEditForm((f) => ({ ...f, avatarUri: uri }));
        }
      }
    } catch (e) {
      try { console.log('[PickAvatar(Edit)] error:', e); } catch {}
    }
  }, []);

  const loadUserFeatures = useCallback(async (userId: number) => {
    try {
      const token = await getAuthToken();
      if (!token || !(userId > 0)) return {};
      const res = await fetch(`${API_URL}/api/userfeature?UserId=${userId}&page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      const items = extractItems(json);
      const userFeatures: Record<number, boolean> = {};
      for (const item of items) {
        const featureId = Number(item?.featureId ?? 0);
        const isEnabled = Boolean(item?.isEnabled);
        if (featureId > 0) {
          userFeatures[featureId] = isEnabled;
        }
      }
      try { console.log('[loadUserFeatures] userId:', userId, 'userFeatures:', userFeatures); } catch {}
      return userFeatures;
    } catch {
      return {};
    }
  }, []);

  const openEdit = useCallback(async (u: Staff) => {
    setEditVisible(true);
    setEditOriginal(u);
    setEditForm({ id: u.userId, fullName: u.fullName || '', phoneNumber: u.phoneNumber || '', citizenIdNumber: u.citizenIdNumber || '', status: typeof u.status === 'number' ? (u.status as number) : 1, avatarUri: '' });
    
    // Load user's current features
    const userFeatures = await loadUserFeatures(u.userId);
    setEditFeaturesSelected(userFeatures);
    try { console.log('[openEdit] setEditFeaturesSelected:', userFeatures); } catch {}
  }, [loadUserFeatures]);

  const submitUpdate = useCallback(async () => {
    try {
      if (!editOriginal?.userId) return;
      setUpdating(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !(shopId > 0)) return;
      const fd = new FormData();
      // Only append changed fields
      if ((editForm.fullName || '').trim() && editForm.fullName !== (editOriginal.fullName || '')) fd.append('FullName', editForm.fullName.trim());
      if ((editForm.phoneNumber || '').trim() && editForm.phoneNumber !== (editOriginal.phoneNumber || '')) fd.append('PhoneNumber', editForm.phoneNumber.trim());
      if ((editForm.citizenIdNumber || '').trim() && editForm.citizenIdNumber !== (editOriginal.citizenIdNumber || '')) fd.append('CitizenIdNumber', editForm.citizenIdNumber.trim());
      if (typeof editForm.status === 'number' && editForm.status !== (editOriginal.status ?? 1)) fd.append('Status', String(editForm.status));
      fd.append('ShopId', String(shopId));
      if (editForm.avatarUri && (editForm.avatarUri.startsWith('file') || editForm.avatarUri.startsWith('content'))) {
        const uri = editForm.avatarUri;
        const name = uri.split('/').pop() || 'avatar.jpg';
        const file: any = { uri, name, type: 'image/jpeg' };
        try { console.log('[UpdateStaff] attach AvatarFile:', { uri, name }); } catch {}
        fd.append('AvatarFile', file as any);
      }
      const url = `${API_URL}/api/users/${editOriginal.userId}`;
      const updateUserPromise = fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const updateFeaturesPromise = (async () => {
        if (availableFeatures.length === 0) return { ok: true, status: 200 } as any;
        // Only send features that the user actually has (from userFeatures)
        const userFeatureIds = Object.keys(editFeaturesSelected).map(Number);
        const featuresToUpdate = availableFeatures
          .filter(f => userFeatureIds.includes(f.featureId))
          .map(f => ({ featureId: f.featureId, isEnable: Boolean(editFeaturesSelected[f.featureId]) }));
        
        if (featuresToUpdate.length === 0) return { ok: true, status: 200 } as any;
        
        const payload = {
          userId: editOriginal.userId,
          features: featuresToUpdate,
        } as any;
        try { console.log('[UserFeature][update] payload:', payload); } catch {}
        const resp = await fetch(`${API_URL}/api/userfeature`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        try { console.log('[UserFeature][update] status:', resp.status); } catch {}
        return resp;
      })();

      const [res, featRes] = await Promise.allSettled([updateUserPromise, updateFeaturesPromise]).then((arr: any[]) => arr.map((r: any) => (r.status === 'fulfilled' ? r.value : { ok: false, status: 0 })));
      try { console.log('[UpdateStaff] HTTP status:', res.status, res.statusText); } catch {}
      try {
        if (featRes) {
          const featBody = await featRes.json?.().catch?.(() => null);
          console.log('[UserFeature][update] status:', featRes.status, 'body:', featBody);
        }
      } catch {}
      if (res.ok) {
        const json = await res.json().catch(() => null);
        try { console.log('[UpdateStaff] success response:', json); } catch {}
        setEditVisible(false);
        await loadStaff();
        const msg = (json && (json.message || json?.data?.message)) || 'Cập nhật nhân viên thành công';
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Thành công', msg);
      } else {
        const text = await res.text?.().catch?.(() => '') || '';
        try { console.log('[UpdateStaff] failure body:', text); } catch {}
        const msg = text || 'Cập nhật nhân viên thất bại';
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Thất bại', msg);
      }
    } finally {
      setUpdating(false);
    }
  }, [editOriginal, editForm, loadStaff]);
  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý nhân viên</Text>
        <TouchableOpacity onPress={openCreate} style={{ padding: 4 }}>
          <Icon name="account-plus" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.userId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={!loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666' }}>Chưa có nhân viên</Text>
            </View>
          ) : null}
        />
      </View>

      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Sửa thông tin nhân viên</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={{ padding: 6 }}>
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              <TextInput placeholder="Họ và tên" style={styles.input} value={editForm.fullName} onChangeText={(v) => setEditForm({ ...editForm, fullName: v })} />
              <TextInput placeholder="Số điện thoại" keyboardType="phone-pad" style={styles.input} value={editForm.phoneNumber} onChangeText={(v) => setEditForm({ ...editForm, phoneNumber: v })} />
              <TextInput placeholder="CCCD" style={styles.input} value={editForm.citizenIdNumber} onChangeText={(v) => setEditForm({ ...editForm, citizenIdNumber: v })} />

              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                <Text style={{ color: '#111' }}>Trạng thái</Text>
                <TouchableOpacity onPress={() => setEditForm((f) => ({ ...f, status: f.status === 1 ? 0 : 1 }))} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F0F9FA', borderRadius: 8 }}>
                  <Text style={{ color: '#007AFF', fontWeight: '600' }}>{editForm.status === 1 ? 'Hoạt động' : 'Không hoạt động'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={pickEditAvatar} style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}> 
                <Icon name="image" size={18} color="#666" />
                <Text style={{ marginLeft: 8, color: editForm.avatarUri ? '#111' : '#888' }}>
                  {editForm.avatarUri ? 'Ảnh đã chọn' : 'Chọn ảnh đại diện từ thư viện'}
                </Text>
              </TouchableOpacity>

              {!!availableFeatures.length && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>Quyền truy cập</Text>
                  {availableFeatures.map((f) => (
                    <TouchableOpacity
                      key={f.featureId}
                      style={styles.featureRow}
                      onPress={() => setEditFeaturesSelected(prev => ({ ...prev, [f.featureId]: !prev[f.featureId] }))}
                    >
                      <View style={[styles.checkbox, editFeaturesSelected[f.featureId] ? styles.checkboxChecked : undefined]}>
                        {editFeaturesSelected[f.featureId] && <Icon name="check" size={14} color="#fff" />}
                      </View>
                      <Text style={{ flex: 1 }}>{f.featureName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={[styles.primaryBtn, updating && { opacity: 0.7 }]} onPress={submitUpdate} disabled={updating}>
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={createVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Tạo tài khoản nhân viên</Text>
              <TouchableOpacity onPress={closeCreate} style={{ padding: 6 }}>
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              <TextInput placeholder="Username" style={styles.input} value={createForm.username} onChangeText={(v) => setCreateForm({ ...createForm, username: v })} />
              <TextInput placeholder="Password" secureTextEntry style={styles.input} value={createForm.password} onChangeText={(v) => setCreateForm({ ...createForm, password: v })} />
              <TextInput placeholder="Họ và tên" style={styles.input} value={createForm.fullName} onChangeText={(v) => setCreateForm({ ...createForm, fullName: v })} />
              <TextInput placeholder="Số điện thoại" keyboardType="phone-pad" style={styles.input} value={createForm.phoneNumber} onChangeText={(v) => setCreateForm({ ...createForm, phoneNumber: v })} />
              <TextInput placeholder="CCCD" style={styles.input} value={createForm.citizenIdNumber} onChangeText={(v) => setCreateForm({ ...createForm, citizenIdNumber: v })} />
              <TouchableOpacity onPress={pickAvatar} style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}> 
                <Icon name="image" size={18} color="#666" />
                <Text style={{ marginLeft: 8, color: createForm.avatarUri ? '#111' : '#888' }}>
                  {createForm.avatarUri ? 'Ảnh đã chọn' : 'Chọn ảnh đại diện từ thư viện'}
                </Text>
              </TouchableOpacity>

              {!!availableFeatures.length && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>Quyền truy cập</Text>
                  {availableFeatures.map((f) => (
                    <TouchableOpacity
                      key={f.featureId}
                      style={styles.featureRow}
                      onPress={() => setCreateFeaturesSelected(prev => ({ ...prev, [f.featureId]: !prev[f.featureId] }))}
                    >
                      <View style={[styles.checkbox, createFeaturesSelected[f.featureId] && styles.checkboxChecked]}>
                        {createFeaturesSelected[f.featureId] && <Icon name="check" size={14} color="#fff" />}
                      </View>
                      <Text style={{ flex: 1 }}>{f.featureName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={[styles.primaryBtn, creating && { opacity: 0.7 }]} onPress={submitCreate} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Tạo tài khoản</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  content: { flex: 1, backgroundColor: '#F5F5F5' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { marginLeft: 8, flex: 1, fontSize: 14, paddingVertical: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#EEE' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  itemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  roleBadge: { backgroundColor: '#E6F0FF', paddingHorizontal: 10, borderRadius: 12, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  roleText: { color: '#1769FF', fontSize: 12, fontWeight: '600' },
  badgeRow: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, borderRadius: 12, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  statusActive: { backgroundColor: '#E6FFEF' },
  statusInactive: { backgroundColor: '#FFECEC' },
  statusActiveText: { color: '#0B8A3E', fontSize: 12, fontWeight: '600' },
  statusInactiveText: { color: '#B00020', fontSize: 12, fontWeight: '600' },
  editIconBtn: { position: 'absolute', right: 12, top: 12, padding: 6, borderRadius: 16, backgroundColor: '#F0F9FA' },
  editInlineBtn: { marginLeft: 6, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#FFF7E8', alignSelf: 'center', height: 24, justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '80%' },
  input: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  primaryBtn: { backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  featureRowDisabled: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxLocked: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
});

export default ManageAccount;

