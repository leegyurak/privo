import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import WindowControls from '../components/WindowControls';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

// 메시지 표시용: 로컬 파일 경로 대신 파일명만 보여주도록 처리
const getDisplayText = (text) => {
  if (typeof text === 'string') {
    const lower = text.toLowerCase();
    const exts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.txt', '.pdf', '.doc', '.docx'];
    if (exts.some(ext => lower.endsWith(ext)) && (text.includes('/') || text.includes('\\'))) {
      const parts = text.split(/[\/\\]/);
      return parts[parts.length - 1];
    }
  }
  return text;
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.main};
`;

const Header = styled.div`
  background: white;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem 1.25rem;
  padding-top: 2.5rem; /* Space for window controls */
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  -webkit-app-region: drag;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: all ${({ theme }) => theme.transitions.fast};
  -webkit-app-region: no-drag;

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Avatar = styled.div`
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

const OnlineStatus = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.status.online};
  border: 2px solid white;
  position: absolute;
  bottom: -2px;
  right: -2px;
`;

const ChatInfo = styled.div`
  flex: 1;
`;

const ChatName = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.125rem;
`;

const ChatStatus = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  -webkit-app-region: no-drag;
`;

const IconButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 0.5rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.sent ? 'flex-end' : 'flex-start'};
  gap: 0.25rem;
`;

const Message = styled(motion.div).attrs({
  className: 'chat-message-bubble-v2'
})`
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
  word-break: break-all;
  position: relative;
  
  ${props => props.sent && `
    border-bottom-right-radius: 4px;
  `}
  
  ${props => !props.sent && `
    border-bottom-left-radius: 4px;
  `}
`;

const MessageTime = styled.div.attrs({
  className: 'message-time-v2'
})`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.light};
  align-self: ${props => props.sent ? 'flex-end' : 'flex-start'};
  text-align: ${props => props.sent ? 'right' : 'left'};
`;

const TypingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.chat.received};
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 2px;
`;

const Dot = styled(motion.div)`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.text.light};
`;


const LoadingSpinner = styled(motion.div)`
  width: 16px;
  height: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: 50%;
  margin-bottom: 0.25rem;
`;

const InputContainer = styled.div`
  background: white;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
`;

const InputArea = styled.div`
  flex: 1;
  position: relative;
`;

const MessageInput = styled.textarea`
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

const SendButton = styled(motion.button)`
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

const AttachButton = styled.button`
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

const ChatScreen = () => {
  console.log('*** ChatScreen component rendering ***');
  
  const navigate = useNavigate();
  const { id: chatRoomId } = useParams();
  const { user } = useAuth();
  
  console.log('ChatScreen: chatRoomId from URL:', chatRoomId);
  const chatContextValue = useChat();
  console.log('ChatScreen: useChat() returned:', chatContextValue);
  console.log('ChatScreen: allMessages from context:', chatContextValue.messages);
  
  const { 
    sendMessage: sendChatMessage, 
    getChatMessages, 
    subscribeToChat, 
    unsubscribeFromChat,
    loadMessages,
    loadChatRooms,
    isConnected,
    isSendingMessage, // 메시지 전송 중 상태
    currentSendingMessage, // 현재 전송 중인 메시지 정보
    chatRooms,
    messages: allMessages,
    clearUnreadCount, // 읽지 않은 카운트 초기화 함수
    getUnreadCount, // 읽지 않은 카운트 가져오기 함수
    sendTypingIndicator,
    hasTypingUsers,
    getTypingUsersNames,
    loadedChatRooms // 캐시된 채팅방 목록
  } = chatContextValue;
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messageInputRef = useRef(null);
  
  // 타이핑 인디케이터 상태 (ChatContext에서 관리하는 다른 사용자들의 타이핑 상태 사용)
  const isOthersTyping = hasTypingUsers(chatRoomId);
  const typingUsersNames = getTypingUsersNames(chatRoomId);
  
  // 타이핑 중인 사용자들의 표시 텍스트 생성
  const getTypingText = () => {
    if (typingUsersNames.length === 0) return '';
    if (typingUsersNames.length === 1) return `${typingUsersNames[0]}님이 입력 중입니다`;
    if (typingUsersNames.length === 2) return `${typingUsersNames[0]}님과 ${typingUsersNames[1]}님이 입력 중입니다`;
    return `${typingUsersNames[0]}님 외 ${typingUsersNames.length - 1}명이 입력 중입니다`;
  };
  
  // 타이핑 상태 디버깅
  useEffect(() => {
    console.log('*** ChatScreen: Typing state changed ***');
    console.log('ChatScreen: chatRoomId:', chatRoomId);
    console.log('ChatScreen: hasTypingUsers result:', isOthersTyping);
  }, [isOthersTyping, chatRoomId]);
  
  // Debug: 로컬 messages 상태 변경 감지
  useEffect(() => {
    console.log('ChatScreen: Local messages state changed!');
    console.log('ChatScreen: Local messages:', messages);
    console.log('ChatScreen: Local messages count:', messages.length);
  }, [messages]);
  
  // Debug: unread count 변경 감지
  useEffect(() => {
    if (chatRoomId && getUnreadCount) {
      const currentCount = getUnreadCount(chatRoomId);
      console.log(`*** ChatScreen: UNREAD COUNT CHANGED for room ${chatRoomId}: ${currentCount} ***`);
    }
  }, [chatRoomId, getUnreadCount]);
  const [currentChat, setCurrentChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Load chat room info and messages
  useEffect(() => {
    if (chatRoomId && user) {
      console.log('*** ChatScreen: MAIN EFFECT - Initializing chat and clearing unread count for room:', chatRoomId);
      console.log('ChatScreen: Current unread count before clearing:', getUnreadCount ? getUnreadCount(chatRoomId) : 'N/A');
      
      // 채팅방 입장 시 즉시 읽지 않은 카운트 초기화
      clearUnreadCount(chatRoomId);
      console.log('ChatScreen: Called clearUnreadCount, new count should be 0');
      
      initializeChat();
    }
    
    return () => {
      if (chatRoomId) {
        console.log('ChatScreen: Cleanup - unsubscribing from chat room:', chatRoomId);
        unsubscribeFromChat(chatRoomId);
      }
    };
  }, [chatRoomId, user, clearUnreadCount, getUnreadCount]);

  // Subscribe to real-time messages - directly use allMessages from context
  useEffect(() => {
    console.log('*** ChatScreen: MESSAGE UPDATE EFFECT [chatRoomId, allMessages] triggered ***');
    console.log('ChatScreen: useEffect triggered - chatRoomId:', chatRoomId);
    console.log('ChatScreen: allMessages object reference:', allMessages);
    console.log('ChatScreen: allMessages type:', typeof allMessages);
    console.log('ChatScreen: allMessages is null/undefined:', allMessages == null);
    console.log('ChatScreen: Available chat rooms in allMessages:', Object.keys(allMessages || {}));
    console.log('ChatScreen: useEffect dependency values changed');
    
    if (chatRoomId) {
      const roomMessages = allMessages[chatRoomId] || [];
      console.log('ChatScreen: Updating messages for room', chatRoomId, 'count:', roomMessages.length);
      console.log('ChatScreen: Room messages:', roomMessages);
      console.log('ChatScreen: Setting messages to local state...');
      setMessages(roomMessages);
      console.log('ChatScreen: Local state updated with', roomMessages.length, 'messages');
      
      // 채팅방에 입장했으므로 읽지 않은 메시지 카운트 초기화
      console.log('ChatScreen: Current unread count before MESSAGE EFFECT clearing:', getUnreadCount ? getUnreadCount(chatRoomId) : 'N/A');
      clearUnreadCount(chatRoomId);
      console.log('ChatScreen: Cleared unread count for room from MESSAGE EFFECT:', chatRoomId);
      console.log('ChatScreen: New unread count after MESSAGE EFFECT clearing:', getUnreadCount ? getUnreadCount(chatRoomId) : 'N/A');
      
      // 추가로 한 번 더 확실히 초기화 (지연 실행)
      setTimeout(() => {
        console.log('ChatScreen: Timeout clearing - current count:', getUnreadCount ? getUnreadCount(chatRoomId) : 'N/A');
        clearUnreadCount(chatRoomId);
        console.log('ChatScreen: Double-cleared unread count for room:', chatRoomId);
        console.log('ChatScreen: Final unread count after timeout:', getUnreadCount ? getUnreadCount(chatRoomId) : 'N/A');
      }, 100);
      
      // Check if we're getting the right chatRoomId
      console.log('ChatScreen: Current chatRoomId from URL:', chatRoomId);
      console.log('ChatScreen: Messages set to state, length:', roomMessages.length);
    } else {
      console.log('ChatScreen: No chatRoomId available');
    }
    
    console.log('ChatScreen: MESSAGE UPDATE useEffect completed');
  }, [chatRoomId, allMessages, clearUnreadCount, getUnreadCount]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      console.log('ChatScreen: Starting chat initialization with improved flow');
      
      // 캐시 확인
      const isCached = loadedChatRooms && loadedChatRooms.has(chatRoomId);
      console.log(`ChatScreen: Chat room ${chatRoomId} is cached: ${isCached}`);
      
      // 1단계: Load chat rooms first if not already loaded
      let rooms = chatRooms;
      if (!rooms || rooms.length === 0) {
        console.log('ChatScreen: Loading chat rooms...');
        rooms = await loadChatRooms();
      }
      
      // 2단계: Find current chat room info
      const room = rooms.find(room => room.id === chatRoomId);
      setCurrentChat(room);
      console.log('ChatScreen: Chat room info loaded:', room?.name);
      
      // 3단계: Load local DB messages first
      console.log('ChatScreen: Loading local DB messages...');
      await loadMessages(chatRoomId);
      console.log('ChatScreen: Local DB messages loaded');
      
      // 4단계: Subscribe to WebSocket for real-time updates and offline messages
      // 웹소켓 연결 시 오프라인 메시지가 자동으로 전송되고 addOfflineMessage로 처리됨
      console.log('ChatScreen: Subscribing to WebSocket for real-time and offline messages...');
      subscribeToChat(chatRoomId);
      console.log('ChatScreen: WebSocket subscription completed - offline messages will be merged and sorted');
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOthersTyping]);

  // 전역 스크롤 이벤트 리스너 추가 (메시지 로드 시 자동 스크롤)
  useEffect(() => {
    const handleScrollToBottom = (event) => {
      if (event.detail && event.detail.chatId === chatRoomId) {
        console.log('ChatScreen: Received scrollToBottom event for current chat room');
        scrollToBottom();
      }
    };

    window.addEventListener('scrollToBottom', handleScrollToBottom);
    return () => {
      window.removeEventListener('scrollToBottom', handleScrollToBottom);
    };
  }, [chatRoomId]);

  // 타이핑 이벤트 전송을 위한 디바운스 처리
  useEffect(() => {
    let typingTimer;
    
    if (chatRoomId && message.trim()) {
      console.log('ChatScreen: Sending typing START indicator for room:', chatRoomId);
      // 메시지 입력 시작 시 타이핑 시작 이벤트 전송
      sendTypingIndicator(chatRoomId, true);
      
      // 일정 시간 후 타이핑 중지 이벤트 전송
      typingTimer = setTimeout(() => {
        console.log('ChatScreen: Sending typing STOP indicator (timeout) for room:', chatRoomId);
        sendTypingIndicator(chatRoomId, false);
      }, 2000); // 2초 후 타이핑 중지
    } else if (chatRoomId) {
      // 메시지가 비어있으면 즉시 타이핑 중지
      console.log('ChatScreen: Sending typing STOP indicator (empty message) for room:', chatRoomId);
      sendTypingIndicator(chatRoomId, false);
    }
    
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [message, chatRoomId, sendTypingIndicator]);

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
    if (!message.trim() || !chatRoomId) return;
    
    // 현재 메시지 전송 중인지 확인
    if (isSendingMessage) {
      console.warn('ChatScreen: Cannot send message - another message is being sent');
      console.warn('ChatScreen: Current sending message:', currentSendingMessage);
      // UI에 알림 표시 가능
      return;
    }

    const messageText = message;
    setMessage(''); // Clear input immediately

    try {
      console.log('ChatScreen: Attempting to send message:', messageText);
      await sendChatMessage(chatRoomId, messageText);
      console.log('ChatScreen: Message send request completed');
    } catch (error) {
      console.error('ChatScreen: Failed to send message:', error);
      // 전송 실패 시 메시지를 다시 입력창에 복원할 수 있음
      if (error.message.includes('기다려주세요')) {
        setMessage(messageText); // 순차 전송 에러 시 메시지 복원
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -4 },
  };

  return (
    <Container>
      <WindowControls />
      <Header>
        <BackButton onClick={() => navigate('/chats')}>
          <ArrowLeft size={20} />
        </BackButton>
        
        <Avatar>
          {currentChat?.name ? currentChat.name.substring(0, 2).toUpperCase() : 'CH'}
          {isConnected && <OnlineStatus />}
        </Avatar>
        
        <ChatInfo>
          <ChatName>{currentChat?.name || 'Chat Room'}</ChatName>
          <ChatStatus>{isConnected ? '연결됨' : '연결 중...'}</ChatStatus>
        </ChatInfo>
        
        <HeaderActions>
          <IconButton title="더 많은 옵션">
            <MoreVertical size={20} />
          </IconButton>
        </HeaderActions>
      </Header>

      <MessagesContainer>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div>메시지를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {console.log('ChatScreen: Rendering messages, count:', messages.length)}
            {console.log('ChatScreen: Messages to render:', messages)}
            {messages.map((msg, index) => (
              <MessageGroup key={msg.id} sent={msg.sent}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexDirection: msg.sent ? 'row-reverse' : 'row' }}>
                  {msg.isLoading && (
                    <LoadingSpinner
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
                      {getDisplayText(msg.text)}
                    </Message>
                    <MessageTime sent={msg.sent}>
                      {msg.timestamp}
                      {msg.isLoading && ' (전송 중...)'}
                      {msg.isFailed && ' (전송 실패)'}
                      {msg.isOffline && ' (오프라인 메시지)'}
                    </MessageTime>
                  </div>
                </div>
              </MessageGroup>
            ))}
          </>
        )}

        {isOthersTyping && (
          <TypingIndicator
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <span>{getTypingText()}</span>
            <TypingDots>
              {[0, 1, 2].map((index) => (
                <Dot
                  key={index}
                  variants={dotVariants}
                  initial="initial"
                  animate="animate"
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: index * 0.2,
                  }}
                />
              ))}
            </TypingDots>
          </TypingIndicator>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <InputArea>
          <MessageInput
            ref={messageInputRef}
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            rows="1"
          />
        </InputArea>
        
        <SendButton
          onClick={handleSendMessage}
          disabled={!message.trim() || isSendingMessage}
          whileHover={{ scale: isSendingMessage ? 1 : 1.05 }}
          whileTap={{ scale: isSendingMessage ? 1 : 0.95 }}
          style={{ 
            opacity: isSendingMessage ? 0.6 : 1,
            cursor: isSendingMessage ? 'not-allowed' : 'pointer'
          }}
        >
          <Send size={18} />
        </SendButton>
      </InputContainer>
    </Container>
  );
};

export default ChatScreen;
