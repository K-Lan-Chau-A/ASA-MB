// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getUserId } from '../services/AuthStore';
import { handle403Error } from '../utils/apiErrorHandler';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatbotScreen = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [currentShopId, setCurrentShopId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Cache functions
  const getCacheKey = (shopId: number, userId: number) => `chatbot_messages_${shopId}_${userId}`;
  
  const saveMessagesToCache = async (messages: Message[], shopId: number, userId: number) => {
    try {
      const cacheKey = getCacheKey(shopId, userId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages to cache:', error);
    }
  };

  const loadMessagesFromCache = async (shopId: number, userId: number): Promise<Message[]> => {
    try {
      const cacheKey = getCacheKey(shopId, userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading messages from cache:', error);
    }
    return [];
  };

  const clearCacheForShop = async (shopId: number, userId: number) => {
    try {
      const cacheKey = getCacheKey(shopId, userId);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing cache for shop:', error);
    }
  };

  const quickQuestions = [
    'Phân tích cửa hàng',
    'Phân tích khách hàng',
    'Phân tích kho hàng',
    'Phân tích doanh thu',
    'Phân tích sản phẩm',
  ];

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const mapServerMessageToLocal = (m: any): Message | null => {
    if (!m) return null;
    const id = String(m.chatMessageId ?? m.id ?? `${m.createdAt ?? Date.now()}-${Math.random()}`);
    const text = typeof m.content === 'string' ? m.content : '';
    const isUser = String(m.sender || '').toLowerCase() !== 'ai';
    const ts = m.createdAt ? new Date(m.createdAt) : new Date();
    return { id, text, isUser, timestamp: ts };
  };

  const extractItems = (json: any): any[] => {
    if (!json) return [];
    if (Array.isArray(json.items)) return json.items;
    if (Array.isArray(json.data?.items)) return json.data.items;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  };

  const fetchMessagesPage = async (targetPage: number, replace: boolean) => {
    try {
      if (replace) { setIsFetching(true); } else { setIsFetchingMore(true); }
      
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      const userId = (await getUserId()) ?? 0;
      if (!token || !(shopId > 0) || !(userId > 0)) return;

      // Load from cache first if replacing (initial load)
      if (replace) {
        const cachedMessages = await loadMessagesFromCache(shopId, userId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
          setIsFetching(false);
          scrollToBottom();
          return;
        }
      }

      const url = `${API_URL}/api/chat-messages?ShopId=${shopId}&UserId=${userId}&page=${targetPage}&pageSize=${pageSize}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (handle403Error(res, navigation)) return;
      const json = await res.json().catch(() => null);
      const items = extractItems(json);
      const mapped: Message[] = items.map(mapServerMessageToLocal).filter(Boolean) as Message[];
      // Ensure ascending by createdAt if possible
      mapped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setMessages(prev => {
        const base = replace ? [] : prev;
        const idSet = new Set(base.map(m => m.id));
        const merged = [...base];
        for (const m of mapped) {
          if (!idSet.has(m.id)) { merged.push(m); idSet.add(m.id); }
        }
        return merged;
      });

      // Save to cache
      if (replace) {
        const finalMessages = mapped;
        await saveMessagesToCache(finalMessages, shopId, userId);
      }

      setHasMore(mapped.length >= pageSize);
      setPage(targetPage);
      if (replace) scrollToBottom();
    } finally {
      if (replace) { setIsFetching(false); } else { setIsFetchingMore(false); }
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const token = await getAuthToken();
    const shopId = (await getShopId()) ?? 0;
    const userId = (await getUserId()) ?? 0;
    if (!token || !(shopId > 0) || !(userId > 0)) {
      Alert.alert('Lỗi', 'Thiếu thông tin đăng nhập hoặc shopId');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      saveMessagesToCache(newMessages, shopId, userId);
      return newMessages;
    });
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const userId = (await getUserId()) ?? 0;

      const res = await fetch(`${API_URL}/api/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, content: messageText.trim(), sender: 'user' }),
      });
      if (handle403Error(res, navigation)) return;
      const json: any = await res.json().catch(() => null);
      const aiRaw: string | null =
        (json && json.data && json.data.aiMessage && typeof json.data.aiMessage.content === 'string')
          ? json.data.aiMessage.content
          : formatAskResponse(json);

      // Beautify: convert markdown bullets to native bullets and trim
      const text: string = String(aiRaw || '')
        .replace(/^[\s]*\*[\s]+/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMessages = [...prev, aiResponse];
        saveMessagesToCache(newMessages, shopId, userId);
        return newMessages;
      });
    } catch (error: any) {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Không thể gửi câu hỏi. Vui lòng thử lại.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMessages = [...prev, aiResponse];
        saveMessagesToCache(newMessages, shopId, userId);
        return newMessages;
      });
      try { console.error('[Chatbot][sendMessage] error:', error); } catch {}
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const mapQuickQuestionToPath = (q: string): string => {
    const key = q.trim().toLowerCase();
    const mapping: Record<string, string> = {
      'phân tích cửa hàng': 'shop',
      'phân tích khách hàng': 'customers',
      'phân tích kho hàng': 'inventory',
      'phân tích doanh thu': 'revenue',
      'phân tích sản phẩm': 'products',
    };
    return mapping[key] ?? 'products';
  };

  const formatNumber = (n: any): string => {
    const num = Number(n ?? 0);
    try { return num.toLocaleString('vi-VN'); } catch { return String(num); }
  };

  const renderFormattedText = (text: string) => {
    const parts = String(text ?? '').split('**');
    return parts.map((seg, idx) => {
      const isBold = idx % 2 === 1;
      if (isBold) return <Text key={`b-${idx}`} style={styles.bold}>{seg}</Text>;
      return <Text key={`t-${idx}`}>{seg}</Text>;
    });
  };

  const pickString = (...vals: any[]): string | null => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v;
    }
    return null;
  };

  const tryParseJson = (s: string): any | null => {
    try { return JSON.parse(s); } catch { return null; }
  };

  const formatAskResponse = (payload: any): string => {
    if (typeof payload === 'string') {
      const parsed = tryParseJson(payload);
      if (parsed && typeof parsed === 'object') return formatAskResponse(parsed);
      return payload;
    }
    if (payload && typeof payload === 'object') {
      const answer = pickString(payload.answer, payload.message, payload.data, payload.content, payload.text);
      if (answer) return answer;
      if (payload.shopName || payload.totalRevenue || payload.totalProducts) {
        return [
          payload.shopName ? `**Cửa hàng**: ${payload.shopName}` : null,
          payload.totalProducts != null ? `**Sản phẩm**: ${formatNumber(payload.totalProducts)}` : null,
          payload.totalCustomers != null ? `**Khách hàng**: ${formatNumber(payload.totalCustomers)}` : null,
          payload.totalOrders != null ? `**Đơn hàng**: ${formatNumber(payload.totalOrders)}` : null,
          payload.totalRevenue != null ? `**Tổng doanh thu**: ${formatNumber(payload.totalRevenue)} đồng` : null,
        ].filter(Boolean).join('\n');
      }
    }
    return 'Tạm thời chưa có nội dung trả lời.';
  };

  const formatShopAnalytics = (d: any): string => {
    const name = d?.shopName || 'Cửa hàng';
    const totalProducts = formatNumber(d?.totalProducts);
    const totalCustomers = formatNumber(d?.totalCustomers);
    const totalOrders = formatNumber(d?.totalOrders);
    const totalRevenue = formatNumber(d?.totalRevenue) + ' đồng';
    const aov = formatNumber(d?.averageOrderValue);
    return `**Tổng quan cửa hàng**\n- **Cửa hàng**: ${name}\n- **Sản phẩm**: ${totalProducts}\n- **Khách hàng**: ${totalCustomers}\n- **Đơn hàng**: ${totalOrders}\n- **Tổng doanh thu**: ${totalRevenue}\n- **Giá trị đơn TB**: ${aov}`;
  };

  const formatCustomersAnalytics = (d: any): string => {
    const total = formatNumber(d?.totalCustomers);
    const members = formatNumber(d?.memberCustomers);
    const nonMembers = formatNumber(d?.nonMemberCustomers);
    const newMonth = formatNumber(d?.newCustomersThisMonth);
    const returning = formatNumber(d?.returningCustomers);
    const avgSpent = formatNumber(d?.averageCustomerSpent);
    return `**Phân tích khách hàng**\n- **Tổng khách**: ${total}\n- **Thành viên/Không thành viên**: ${members}/${nonMembers}\n- **Khách mới (tháng)**: ${newMonth}\n- **Khách quay lại**: ${returning}\n- **Chi tiêu TB/khách**: ${avgSpent}`;
  };

  const formatInventoryAnalytics = (d: any): string => {
    const totalProducts = formatNumber(d?.totalProducts);
    const inStock = formatNumber(d?.inStockProducts);
    const low = formatNumber(d?.lowStockProducts);
    const out = formatNumber(d?.outOfStockProducts);
    const value = formatNumber(d?.totalInventoryValue) + ' đồng';
    return `**Phân tích kho hàng**\n- **Tổng sản phẩm**: ${totalProducts}\n- **Còn hàng/Sắp hết/Hết hàng**: ${inStock}/${low}/${out}\n- **Giá trị tồn kho**: ${value}`;
  };

  const formatRevenueAnalytics = (d: any): string => {
    const totalRevenue = formatNumber(d?.totalRevenue) + ' đồng';
    const aov = formatNumber(d?.averageOrderValue);
    const totalOrders = formatNumber(d?.totalOrders);
    const thisWeek = formatNumber(d?.thisWeekRevenue) + ' đồng';
    const thisMonth = formatNumber(d?.thisMonthRevenue) + ' đồng';
    return `**Phân tích doanh thu**\n- **Tổng doanh thu**: ${totalRevenue}\n- **Tổng đơn**: ${totalOrders}\n- **Giá trị đơn TB**: ${aov}\n- **Tuần này/Tháng này**: ${thisWeek}/${thisMonth}`;
  };

  const formatProductsAnalytics = (d: any): string => {
    const top = Array.isArray(d?.topSellingProducts) ? d.topSellingProducts.slice(0, 5) : [];
    const worst = Array.isArray(d?.worstSellingProducts) ? d.worstSellingProducts.slice(0, 3) : [];
    const profitable = Array.isArray(d?.mostProfitableProducts) ? d.mostProfitableProducts.slice(0, 3) : [];
    const needAttention = Array.isArray(d?.productsNeedAttention) ? d.productsNeedAttention.slice(0, 3) : [];
    const cat = d?.categoryPerformance || {};

    const topText = top.length
      ? `**Bán chạy**\n- ${top.map((p: any) => `${p?.productName} (${formatNumber(p?.totalSold)} bán, DT ${formatNumber(p?.totalRevenue)}đ)`).join('\n- ')}`
      : 'Chưa có dữ liệu bán chạy.';

    const worstText = worst.length
      ? `**Bán chậm**\n- ${worst.map((p: any) => `${p?.productName} (${formatNumber(p?.totalSold)} bán)`).join('\n- ')}`
      : '';

    const profitText = profitable.length
      ? `**Lợi nhuận tốt**\n- ${profitable.map((p: any) => `${p?.productName} (biên ${Math.round(Number(p?.profitMargin ?? 0))}%)`).join('\n- ')}`
      : '';

    const attentionText = Array.isArray(d?.productsNeedAttention) && d.productsNeedAttention.length
      ? `**Cần chú ý**\n- ${formatNumber(d.productsNeedAttention.length)} sản phẩm bán chậm hoặc tồn kho cao`
      : '';

    const catKeys = Object.keys(cat);
    const catText = catKeys.length
      ? `**Hiệu suất danh mục**\n- ${catKeys.map((k) => {
          const c = cat[k];
          return `${c?.categoryName ?? k}: SP ${formatNumber(c?.productCount)}, DT ${formatNumber(c?.totalRevenue)}đ`;
        }).join('\n- ')}`
      : '';

    return [topText, worstText, profitText, attentionText, catText].filter(Boolean).join('\n');
  };

  const formatAnalytics = (path: string, json: any): string => {
    switch (path) {
      case 'shop':
        return formatShopAnalytics(json);
      case 'customers':
        return formatCustomersAnalytics(json);
      case 'inventory':
        return formatInventoryAnalytics(json);
      case 'revenue':
        return formatRevenueAnalytics(json);
      case 'products':
      default:
        return formatProductsAnalytics(json);
    }
  };

  const handleQuickQuestion = async (question: string) => {
    const token = await getAuthToken();
    const shopId = (await getShopId()) ?? 0;
    const userId = (await getUserId()) ?? 0;
    if (!token || !(shopId > 0) || !(userId > 0)) {
      Alert.alert('Lỗi', 'Thiếu thông tin đăng nhập hoặc shopId');
      return;
    }

    // Add user message locally (do NOT POST when using quick questions)
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      saveMessagesToCache(newMessages, shopId, userId);
      return newMessages;
    });
    scrollToBottom();
    setIsLoading(true);
    try {
      const path = mapQuickQuestionToPath(question);
      const res = await fetch(`${API_URL}/api/Chatbot/${shopId}/analytics/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handle403Error(res, navigation)) return;
      const json: any = await res.json().catch(() => null);
      const text: string = json ? formatAnalytics(path, json) : 'Không có dữ liệu';
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMessages = [...prev, aiResponse];
        saveMessagesToCache(newMessages, shopId, userId);
        return newMessages;
      });
    } catch (error: any) {
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Không thể tải phân tích. Vui lòng thử lại.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMessages = [...prev, aiResponse];
        saveMessagesToCache(newMessages, shopId, userId);
        return newMessages;
      });
      try { console.error('[Chatbot][quick] error:', error); } catch {}
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleImagePick = () => {
    Alert.alert('Chọn ảnh', 'Tính năng chọn ảnh sẽ được triển khai sớm!');
  };

  const handleVoiceInput = () => {
    Alert.alert('Ghi âm', 'Tính năng ghi âm sẽ được triển khai sớm!');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.aiText
        ]}>
          {renderFormattedText(item.text)}
        </Text>
        <Text style={styles.timeText}>
          {item.timestamp.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  const renderQuickQuestion = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.quickQuestionButton}
      onPress={() => handleQuickQuestion(item)}
    >
      <Text style={styles.quickQuestionText}>{item}</Text>
    </TouchableOpacity>
  );

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    // Load cached messages first, then fetch from server if needed
    const loadInitialMessages = async () => {
      const shopId = (await getShopId()) ?? 0;
      const userId = (await getUserId()) ?? 0;
      if (shopId > 0 && userId > 0) {
        setCurrentShopId(shopId);
        setCurrentUserId(userId);
        const cachedMessages = await loadMessagesFromCache(shopId, userId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
          scrollToBottom();
        }
        // Still fetch from server to get latest messages
        fetchMessagesPage(1, true);
      }
    };
    loadInitialMessages();
  }, []);

  // Watch for shop or user changes and reload if needed
  useEffect(() => {
    const checkIdentityChange = async () => {
      const shopId = (await getShopId()) ?? 0;
      const userId = (await getUserId()) ?? 0;
      const shopChanged = shopId > 0 && currentShopId !== null && currentShopId !== shopId;
      const userChanged = userId > 0 && currentUserId !== null && currentUserId !== userId;
      if (shopChanged || userChanged) {
        setMessages([]);
        setCurrentShopId(shopId);
        setCurrentUserId(userId);
        const cachedMessages = await loadMessagesFromCache(shopId, userId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
          scrollToBottom();
        }
        fetchMessagesPage(1, true);
      }
    };

    const interval = setInterval(checkIdentityChange, 1000); // Check every second
    return () => clearInterval(interval);
  }, [currentShopId, currentUserId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat với AI</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="dots-horizontal" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

             <KeyboardAvoidingView 
         style={styles.content}
         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
         enabled={true}
       >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (!isFetchingMore && hasMore) {
              fetchMessagesPage(page + 1, false);
            }
          }}
          refreshing={isFetching}
          onRefresh={() => fetchMessagesPage(1, true)}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBubble}>
              <Text style={styles.loadingText}>AI đang trả lời...</Text>
            </View>
          </View>
        )}

        {/* Quick Questions - Only show when keyboard is not visible */}
        {!keyboardVisible && (
          <View style={styles.quickQuestionsContainer}>
            <FlatList
              data={quickQuestions}
              renderItem={renderQuickQuestion}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickQuestionsContent}
            />
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhắn tin nhắn"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={handleImagePick}
            >
              <Icon name="image-outline" size={24} color="#666666" />
            </TouchableOpacity>
          </View>
          
          {inputText.trim() ? (
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => sendMessage(inputText)}
            >
              <Icon name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.voiceButton}
              onPress={handleVoiceInput}
            >
              <Icon name="microphone" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#E5E5E7',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#000000',
  },
  timeText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  loadingBubble: {
    backgroundColor: '#E5E5E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
  quickQuestionsContainer: {
    paddingVertical: 12,
  },
  quickQuestionsContent: {
    paddingHorizontal: 16,
  },
  quickQuestionButton: {
    backgroundColor: '#E5E5E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    maxWidth: 280,
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    minHeight: 56,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 32,
    color: '#000000',
    textAlignVertical: 'center',
  },
  attachButton: {
    padding: 6,
    marginLeft: 6,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatbotScreen;
