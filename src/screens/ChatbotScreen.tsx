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
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatbotScreen = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Chào bạn! Tôi có thể giúp bạn phân tích dữ liệu bán hàng, quản lý kho và nhiều vấn đề khác. Bạn cần hỗ trợ gì?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickQuestions = [
    'Phân tích bán hàng trong tháng qua',
    'Chiến dịch kinh doanh',
    'Gợi ý nhập hàng',
    'Báo cáo doanh thu',
    'Dự báo doanh thu',
  ];

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    // Simulate AI response - Replace with actual Gemini API call
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(messageText),
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
      scrollToBottom();
    }, 1500);
  };

  const getAIResponse = (userMessage: string): string => {
    // Simulate different responses based on message content
    if (userMessage.toLowerCase().includes('phân tích') || userMessage.toLowerCase().includes('bán chạy')) {
      return `📊 Phân tích bán hàng

Dựa trên dữ liệu bán hàng 30 ngày qua, các mặt hàng có số lượng bán cao và tốc độ xoay vòng tồn kho nhanh nhất là:

• Áo thun basic: 320 đơn/tháng → bán mạnh.
• Quần jean skinny: 240 đơn → gần hết hàng.
• Giày sneaker trắng: 190 đơn → đánh giá cao.

✅ Khuyến nghị nhập hàng
✅ Tăng nhập áo thun và quần jean gấp 1.5~2 lần.
✅ Bổ sung 50~100 đôi sneaker trắng.
✅ Giảm nhập hoodie dày vì bán chậm.`;
    }
    
    if (userMessage.toLowerCase().includes('chiến dịch') || userMessage.toLowerCase().includes('kinh doanh')) {
      return 'Tôi có thể giúp bạn lập kế hoạch chiến dịch kinh doanh hiệu quả. Bạn muốn tập trung vào sản phẩm nào và trong thời gian nào?';
    }
    
    if (userMessage.toLowerCase().includes('báo cáo') || userMessage.toLowerCase().includes('doanh thu')) {
      return 'Báo cáo doanh thu đang được tạo. Bạn muốn xem báo cáo theo ngày, tuần, tháng hay quý?';
    }
    
    return 'Cảm ơn bạn đã gửi tin nhắn! Tôi đang xử lý yêu cầu của bạn và sẽ phản hồi sớm nhất có thể.';
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
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
          {item.text}
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
