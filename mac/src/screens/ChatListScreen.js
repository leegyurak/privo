import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Search, Plus, Settings, MoreVertical, MessageCircle, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WindowControls from '../components/WindowControls';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import UserSearchModal from '../components/UserSearchModal';
import { chatAPI } from '../services/api';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: #f0f2f5;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 360px;
  background: white;
  border-right: 1px solid #e1e8ed;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 1200px) {
    width: 320px;
  }
  
  @media (max-width: 900px) {
    width: 280px;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e1e8ed;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  min-height: 0;
  
  @media (max-width: 768px) {
    height: 50vh;
  }
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  padding-top: 2.5rem;
  background: white;
  -webkit-app-region: drag;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
    padding-top: 2.5rem;
  }
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
`;

const Title = styled.h1`
  font-size: 1.375rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.25rem;
  -webkit-app-region: no-drag;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #8b8b8b;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f2f5;
    color: #1a1a1a;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  -webkit-app-region: no-drag;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: none;
  border-radius: 22px;
  background: #f0f2f5;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    background: #e6e9ef;
  }

  &::placeholder {
    color: #8b8b8b;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: #8b8b8b;
  pointer-events: none;
`;

const ChatList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ChatItem = styled(motion.div)`
  padding: 0.875rem 1.5rem;
  cursor: pointer;
  background: white;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }

  &:active {
    background: #f0f2f5;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
  }
`;

const ChatItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 1.125rem;
  flex-shrink: 0;
`;

const ChatInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChatMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-shrink: 0;
`;

const ChatName = styled.div`
  font-weight: 500;
  color: #1a1a1a;
  font-size: 1rem;
  margin-bottom: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LastMessage = styled.div`
  color: #8b8b8b;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Timestamp = styled.div`
  color: #8b8b8b;
  font-size: 0.8125rem;
  margin-bottom: 0.25rem;
  text-align: right;
`;

const UnreadBadge = styled.div`
  background: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border-radius: 12px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  min-width: 18px;
  text-align: center;
`;

const OnlineStatus = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.status.online};
  border: 2px solid white;
  position: absolute;
  bottom: 2px;
  right: 2px;
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8b8b8b;
  text-align: center;
  padding: 2rem;
  height: 100%;
  background: #f0f2f5;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const EmptyStateIcon = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: white;
  
  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    margin-bottom: 1rem;
  }
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
`;

const EmptyStateText = styled.p`
  font-size: 0.9375rem;
  color: #8b8b8b;
  line-height: 1.5;
  max-width: 350px;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
    margin-bottom: 1rem;
    max-width: 280px;
  }
`;

const EmptyStateButton = styled.button`
  background: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border: none;
  padding: 0.875rem 1.75rem;
  border-radius: 24px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary.dark};
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
  }
`;

// Chat Interface Components
const ChatContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.main};
  min-height: 0; /* 플렉스 아이템 축소 허용 */
  
  @media (max-width: 768px) {
    height: 55vh;
  }
  
  @media (max-width: 600px) {
    height: 50vh;
  }
  
  @media (max-width: 480px) {
    height: 45vh;
  }
`;

const ChatHeader = styled.div`
  background: white;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 헤더 크기 고정 */
  
  @media (max-width: 1200px) {
    padding: 0.875rem 1rem;
    gap: 0.875rem;
  }
  
  @media (max-width: 900px) {
    padding: 0.75rem 0.875rem;
    gap: 0.75rem;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ChatAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  position: relative;
`;

const ChatInterfaceInfo = styled.div`
  flex: 1;
`;

const ChatInterfaceTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.125rem;
`;

const ChatInterfaceStatus = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ChatHeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ChatMessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0; /* 플렉스 아이템 축소 허용 */
  
  @media (max-width: 1200px) {
    padding: 0.875rem;
    gap: 0.375rem;
  }
  
  @media (max-width: 900px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.sent ? 'flex-end' : 'flex-start'};
  gap: 0.25rem;
`;

const Message = styled(motion.div)`
  padding: 0.75rem 1rem;
  border-radius: 18px;
  background: ${props => props.sent 
    ? props.theme.colors.chat.sent 
    : props.theme.colors.chat.received
  };
  color: ${props => props.sent 
    ? props.theme.colors.chat.sentText 
    : props.theme.colors.chat.receivedText
  };
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word;
  position: relative;
  
  ${props => props.sent && `
    border-bottom-right-radius: 4px;
  `}
  
  ${props => !props.sent && `
    border-bottom-left-radius: 4px;
  `}
`;

const MessageTime = styled.div.attrs({
  className: 'chat-list-message-time'
})`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.light};
  align-self: ${props => props.sent ? 'flex-end' : 'flex-start'};
  text-align: ${props => props.sent ? 'right' : 'left'};
  margin: 0 !important;
`;

const ChatInputContainer = styled.div`
  background: white;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-shrink: 0; /* 입력창 크기 고정 */
  
  @media (max-width: 1200px) {
    padding: 0.875rem 1rem;
    gap: 0.625rem;
  }
  
  @media (max-width: 900px) {
    padding: 0.75rem 0.875rem;
    gap: 0.5rem;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }
`;

const ChatInputArea = styled.div`
  flex: 1;
  position: relative;
`;

const ChatMessageInput = styled.textarea`
  width: 100%;
  min-height: 20px;
  max-height: 120px;
  padding: 0.75rem 1rem;
  padding-right: 3rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: none;
  background: ${({ theme }) => theme.colors.background.main};
  transition: all ${({ theme }) => theme.transitions.fast};
  overflow-y: hidden;
  line-height: 1.4;
  
  /* 스크롤바 숨기기 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: white;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.light};
  }
`;

const ChatSendButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border: none;
  background: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primary.dark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ChatAttachButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const MessageLoadingSpinner = styled(motion.div)`
  width: 16px;
  height: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: 50%;
  margin-bottom: 0.25rem;
`;

// ChatInterface Component
const ChatInterface = ({ chatId, chatData, onClose }) => {
  const { user } = useAuth();
  const { 
    sendMessage: sendChatMessage, 
    getChatMessages, 
    subscribeToChat, 
    unsubscribeFromChat,
    loadMessages,
    isConnected,
    chatRooms,
    clearUnreadCount, // unread count 초기화 함수 추가
    getUnreadCount, // unread count 가져오기 함수 추가
    loadedChatRooms // 캐시된 채팅방 목록
  } = useChat();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(chatData);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Load chat room info and messages
  useEffect(() => {
    if (chatId && user) {
      console.log('*** ChatInterface: Initializing chat and clearing unread count for room:', chatId);
      console.log('ChatInterface: Current unread count before clearing:', getUnreadCount ? getUnreadCount(chatId) : 'N/A');
      
      // 채팅방 입장 시 즉시 읽지 않은 카운트 초기화
      if (clearUnreadCount) {
        clearUnreadCount(chatId);
        console.log('ChatInterface: Called clearUnreadCount for room:', chatId);
      }
      
      initializeChat();
    }
    
    return () => {
      if (chatId) {
        console.log('ChatInterface: Cleanup - unsubscribing from chat room:', chatId);
        unsubscribeFromChat(chatId);
      }
    };
  }, [chatId, user]);

  // Subscribe to real-time messages  
  useEffect(() => {
    if (chatId) {
      const chatMessages = getChatMessages(chatId);
      setMessages(chatMessages || []);
      
      // 메시지 업데이트 시 unread count 초기화
      if (clearUnreadCount) {
        clearUnreadCount(chatId);
        console.log('ChatInterface: Cleared unread count for room:', chatId);
      }
    }
  }, [chatId, getChatMessages, clearUnreadCount]);

  // Update currentChat when chatData changes
  useEffect(() => {
    if (chatData) {
      setCurrentChat(chatData);
    }
  }, [chatData]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Use provided chatData or find from chatRooms
      const room = chatData || chatRooms.find(room => room.id === chatId);
      setCurrentChat(room);
      
      // 캐시 확인 로그
      const isCached = loadedChatRooms && loadedChatRooms.has(chatId);
      console.log(`ChatInterface: Initializing chat ${chatId}, cached: ${isCached}`);
      
      // Load messages (캐시된 경우 빠르게 로드)
      await loadMessages(chatId);
      
      // Subscribe to real-time updates
      subscribeToChat(chatId);
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 전역 스크롤 이벤트 리스너 추가 (메시지 로드 시 자동 스크롤)
  useEffect(() => {
    const handleScrollToBottom = (event) => {
      if (event.detail && event.detail.chatId === chatId) {
        console.log('ChatInterface: Received scrollToBottom event for current chat room');
        scrollToBottom();
      }
    };

    window.addEventListener('scrollToBottom', handleScrollToBottom);
    return () => {
      window.removeEventListener('scrollToBottom', handleScrollToBottom);
    };
  }, [chatId]);

  // 자동 높이 조절 함수
  const adjustTextareaHeight = () => {
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.style.height = '20px'; // 최소 높이로 초기화
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // max-height와 동일
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      
      // 최대 높이에 도달했을 때만 스크롤 활성화
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  // 메시지 입력 시 높이 자동 조절
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;

    const messageText = message;
    setMessage(''); // Clear input immediately

    try {
      await sendChatMessage(chatId, messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
        
        <ChatAvatar>
          {currentChat?.avatar || (currentChat?.name ? currentChat.name.substring(0, 2).toUpperCase() : 'CH')}
        </ChatAvatar>
        
        <ChatInterfaceInfo>
          <ChatInterfaceTitle>{currentChat?.name || 'Chat Room'}</ChatInterfaceTitle>
          <ChatInterfaceStatus>{isConnected ? '연결됨' : '연결 중...'}</ChatInterfaceStatus>
        </ChatInterfaceInfo>
        
        <ChatHeaderActions>
          <IconButton title="더 많은 옵션">
            <MoreVertical size={20} />
          </IconButton>
        </ChatHeaderActions>
      </ChatHeader>

      <ChatMessagesContainer>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div>메시지를 불러오는 중...</div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageGroup key={msg.id} sent={msg.sent}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexDirection: msg.sent ? 'row-reverse' : 'row' }}>
                {msg.isLoading && (
                  <MessageLoadingSpinner
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}
                <div>
                  <Message
                    sent={msg.sent}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ 
                      opacity: msg.isTemp ? 0.7 : 1,
                      borderColor: msg.isFailed ? '#ef4444' : undefined
                    }}
                  >
                    {msg.text}
                  </Message>
                  <MessageTime sent={msg.sent}>
                    {msg.timestamp}
                    {msg.isLoading && ' (전송 중...)'}
                    {msg.isFailed && ' (전송 실패)'}
                  </MessageTime>
                </div>
              </div>
            </MessageGroup>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </ChatMessagesContainer>

      <ChatInputContainer>
        <ChatInputArea>
          <ChatMessageInput
            ref={messageInputRef}
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows="1"
          />
        </ChatInputArea>
        
        <ChatSendButton
          onClick={handleSendMessage}
          disabled={!message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send size={18} />
        </ChatSendButton>
      </ChatInputContainer>
    </ChatContainer>
  );
};

const ChatListScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages: allMessages, getChatMessages, loadAllChatRoomsMessages, isConnected, getUnreadCount, unreadCounts, clearUnreadCount, chatListUpdateTrigger } = useChat(); // ChatContext에서 메시지 가져오기
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // 채팅방의 최신 메시지를 가져오는 함수 (메모이제이션)
  const getLastMessage = useCallback((chatId) => {
    const chatMessages = allMessages[chatId] || [];
    if (chatMessages.length === 0) {
      return 'No messages yet';
    }
    
    // 가장 최근 메시지 가져오기
    const lastMessage = chatMessages[chatMessages.length - 1];
    
    // 메시지 내용 반환 (전송 중인 메시지는 "전송 중..." 표시)
    if (lastMessage.isTemp) {
      return '전송 중...';
    }
    
    // 메시지 내용이 너무 길면 자르기
    const text = lastMessage.text || '';
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  }, [allMessages]);

  // 채팅방의 최신 메시지 시간을 가져오는 함수 (메모이제이션)
  const getLastMessageTime = useCallback((chatId) => {
    const chatMessages = allMessages[chatId] || [];
    if (chatMessages.length === 0) {
      return '';
    }
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    return formatTimestamp(lastMessage.originalTimestamp || lastMessage.timestamp);
  }, [allMessages]);

  // Load chat rooms from API
  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  // WebSocket 연결 시 모든 채팅방의 메시지를 로드
  useEffect(() => {
    if (isConnected && user && chats.length > 0) {
      console.log('ChatListScreen: WebSocket connected, messages should be loading automatically via ChatContext');
      // ChatContext에서 자동으로 loadAllChatRoomsMessages가 호출됨
    }
  }, [isConnected, user, chats.length]);

  // 메시지와 unread count 업데이트 (전체 업데이트, 단 변경 감지로 성능 최적화)
  useEffect(() => {
    if (chats.length > 0) {
      console.log('ChatListScreen: Checking for updates, trigger:', chatListUpdateTrigger);
      console.log('ChatListScreen: Current allMessages keys:', Object.keys(allMessages));
      console.log('ChatListScreen: Current unreadCounts:', unreadCounts);
      
      const updatedChats = chats.map(chat => {
        const newUnreadCount = getUnreadCount ? getUnreadCount(chat.id) : 0;
        const newLastMessage = getLastMessage(chat.id);
        const newTimestamp = getLastMessageTime(chat.id) || chat.timestamp;
        
        console.log(`ChatListScreen: Chat ${chat.id} - lastMessage: "${newLastMessage}", unreadCount: ${newUnreadCount}`);
        
        return {
          ...chat,
          lastMessage: newLastMessage,
          timestamp: newTimestamp,
          unreadCount: newUnreadCount
        };
      });
      
      // 실제 변경이 있는지 엄격하게 검사
      const hasChanged = updatedChats.some((chat, index) => {
        const oldChat = chats[index];
        const changed = !oldChat || 
               chat.lastMessage !== oldChat.lastMessage || 
               chat.timestamp !== oldChat.timestamp ||
               chat.unreadCount !== oldChat.unreadCount;
        
        if (changed) {
          console.log(`ChatListScreen: Chat ${chat.id} changed:`, {
            oldLastMessage: oldChat?.lastMessage,
            newLastMessage: chat.lastMessage,
            oldUnreadCount: oldChat?.unreadCount,
            newUnreadCount: chat.unreadCount
          });
        }
        
        return changed;
      });
      
      if (hasChanged) {
        console.log('ChatListScreen: Updating chat list with new data');
        setChats(updatedChats);
      } else {
        console.log('ChatListScreen: No changes detected, skipping update');
      }
    }
  }, [allMessages, unreadCounts, chatListUpdateTrigger, getLastMessage, getLastMessageTime, getUnreadCount]); // 메모이제이션된 함수들과 상태 변경 시 업데이트

  const loadChatRooms = async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getChatRooms();
      console.log('Chat rooms response:', response);
      
      // Backend returns array directly, not wrapped in chatRooms property
      const chatRoomsArray = Array.isArray(response) ? response : [];
      
      // Transform backend response to match frontend format
      const transformedChats = chatRoomsArray.map(room => ({
        id: room.id,
        name: room.name || 'Direct Message',
        lastMessage: getLastMessage(room.id),
        timestamp: getLastMessageTime(room.id) || formatTimestamp(room.createdAt),
        unreadCount: getUnreadCount ? getUnreadCount(room.id) : 0,
        isOnline: false, // TODO: Add online status from backend
        avatar: room.name ? room.name.substring(0, 2).toUpperCase() : 'DM',
        isDirectMessage: room.isDirectMessage,
        memberCount: room.memberCount
      }));
      
      console.log('Transformed chats:', transformedChats);
      setChats(transformedChats);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      // Fall back to empty list on error
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [selectedChatId, setSelectedChatId] = useState(null);

  const handleChatClick = (chatId) => {
    console.log('ChatListScreen: Chat clicked, selecting room:', chatId);
    console.log('ChatListScreen: Current unread count for room before selection:', getUnreadCount ? getUnreadCount(chatId) : 'N/A');
    
    setSelectedChatId(chatId);
    
    // 채팅방 선택 시 즉시 unread count 초기화
    setTimeout(() => {
      clearUnreadCount(chatId);
      console.log('ChatListScreen: Cleared unread count after chat selection for room:', chatId);
    }, 100);
  };

  return (
    <Container>
      <WindowControls />
      <Sidebar>
        <Header>
          <HeaderTop>
            <Title>채팅</Title>
            <HeaderActions>
              <IconButton title="새 채팅" onClick={() => setShowUserSearch(true)}>
                <Plus size={20} />
              </IconButton>
              <IconButton title="설정">
                <Settings size={20} />
              </IconButton>
              <IconButton title="더보기">
                <MoreVertical size={20} />
              </IconButton>
            </HeaderActions>
          </HeaderTop>
          
          <SearchContainer>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="대화 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchContainer>
        </Header>

        <ChatList>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              채팅방을 불러오는 중...
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              {searchQuery ? '검색 결과가 없습니다' : '채팅방이 없습니다'}
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                {chats.length > 0 ? `총 ${chats.length}개 채팅방 중 필터링됨` : '새 채팅을 시작해보세요'}
              </div>
            </div>
          ) : (
            filteredChats.map((chat, index) => (
            <ChatItem
              key={chat.id}
              onClick={() => handleChatClick(chat.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <ChatItemContent>
                <AvatarContainer>
                  <Avatar>{chat.avatar}</Avatar>
                  {chat.isOnline && <OnlineStatus />}
                </AvatarContainer>
                
                <ChatInfo>
                  <ChatName>{chat.name}</ChatName>
                  <LastMessage>{chat.lastMessage}</LastMessage>
                </ChatInfo>

                <ChatMeta>
                  <div>
                    <Timestamp>{chat.timestamp}</Timestamp>
                    {chat.unreadCount > 0 && (
                      <UnreadBadge>{chat.unreadCount}</UnreadBadge>
                    )}
                  </div>
                </ChatMeta>
              </ChatItemContent>
            </ChatItem>
            ))
          )}
        </ChatList>
      </Sidebar>

      <MainContent>
        {selectedChatId ? (
          <ChatInterface 
            key={selectedChatId} // key 추가로 React가 컴포넌트를 새로 마운트하도록 함
            chatId={selectedChatId} 
            chatData={chats.find(chat => chat.id === selectedChatId)}
            onClose={() => {
              console.log('ChatListScreen: Closing chat interface for room:', selectedChatId);
              setSelectedChatId(null);
            }} 
          />
        ) : (
          <EmptyState>
            <EmptyStateIcon>
              <MessageCircle size={60} />
            </EmptyStateIcon>
            <EmptyStateTitle>환영합니다!</EmptyStateTitle>
            <EmptyStateText>
              안전하고 프라이빗한 채팅을 시작해보세요.<br />
              기존 대화에서 선택하거나 새로운 대화를 시작할 수 있습니다.
            </EmptyStateText>
            <EmptyStateButton onClick={() => setShowUserSearch(true)}>
              새 채팅 시작하기
            </EmptyStateButton>
          </EmptyState>
        )}
      </MainContent>
      
      {showUserSearch && (
        <UserSearchModal 
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          onCreateChat={async (chatRoomId) => {
            setShowUserSearch(false);
            // Refresh chat rooms list
            await loadChatRooms();
            // Select the new chat
            setSelectedChatId(chatRoomId);
          }}
        />
      )}
    </Container>
  );
};

export default ChatListScreen;