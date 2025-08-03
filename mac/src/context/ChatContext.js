import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/api';
import webSocketService from '../services/websocket';
import secureStorage from '../services/secureStorage';
import eventBus from '../utils/eventBus';

// UTF-8 safe Base64 encoding/decoding
const utf8ToBase64 = (str) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
};

const base64ToUtf8 = (str) => {
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
};

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // 채팅방 캐시용 상태
  const [loadedChatRooms, setLoadedChatRooms] = useState(new Set()); // 로드된 채팅방 ID 집합
  const [chatRoomInfo, setChatRoomInfo] = useState({}); // 채팅방 정보 캐시
  
  // 채팅방 목록 업데이트 트리거용 상태
  const [chatListUpdateTrigger, setChatListUpdateTrigger] = useState(0);
  
  // 메시지 전송 상태 관리
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);
  const [currentSendingMessage, setCurrentSendingMessage] = useState(null);
  
  // 읽지 않은 메시지 카운트 관리 (chatRoomId -> count)
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // 타이핑 상태 관리 (chatRoomId -> Map of userId -> nickname)
  const [typingUsers, setTypingUsers] = useState({});

  // Initialize WebSocket connection
  useEffect(() => {
    if (user && token) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const connectWebSocket = async () => {
    if (!token) {
      console.warn('ChatContext: No token available for WebSocket connection');
      return;
    }

    // First, test if backend is reachable
    try {
      console.log('ChatContext: Testing backend connectivity...');
      const response = await fetch('http://localhost:8081/api/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('ChatContext: Backend HTTP response status:', response.status);
    } catch (error) {
      console.error('ChatContext: Backend server appears to be down:', error);
      return;
    }

    try {
      console.log('ChatContext: Attempting to connect WebSocket with token:', token.substring(0, 20) + '...');
      console.log('ChatContext: Current WebSocket state before connect:', webSocketService.isConnected());
      webSocketService.connect(token);
      
      // Subscribe to connection events
      const unsubscribeConnection = webSocketService.subscribe('connection', (data) => {
        console.log('ChatContext: WebSocket connection status changed to:', data.status);
        const connected = data.status === 'connected';
        setIsConnected(connected);
        
        if (connected) {
          console.log('ChatContext: WebSocket successfully connected');
          // WebSocket 연결 성공 시 채팅방 목록 및 메시지 로드
          setTimeout(() => {
            loadChatRooms(); // 채팅방 목록 먼저 로드
            setTimeout(() => {
              loadAllChatRoomsMessages(); // 그 다음 메시지 로드
            }, 500);
          }, 1000); // 1초 후에 실행 (연결 안정화 대기)
        } else {
          console.log('ChatContext: WebSocket disconnected');
        }
      });

      // Subscribe to message events
      const unsubscribeMessage = webSocketService.subscribe('message', (data) => {
        handleWebSocketMessage(data);
      });

      // Subscribe to offline message events
      const unsubscribeOfflineMessage = webSocketService.subscribe('offlineMessage', (data) => {
        handleOfflineMessage(data);
      });

      // Subscribe to typing events
      const unsubscribeTyping = webSocketService.subscribe('typing', (data) => {
        handleTypingEvent(data);
      });

      // Subscribe to chat room list updates
      const unsubscribeChatRoomList = webSocketService.subscribe('chatRoomListUpdated', (data) => {
        handleChatRoomListUpdated(data);
      });

      // Subscribe to chat rooms response
      const unsubscribeChatRoomsResponse = webSocketService.subscribe('chatRoomsResponse', (data) => {
        handleChatRoomsResponse(data);
      });

      // Subscribe to messageSent events (from server responses)
      const unsubscribeMessageSent = webSocketService.subscribe('messageSent', (data) => {
        console.log('ChatContext: Received messageSent event:', data);
        
        if (data.success && data.message) {
          console.log('ChatContext: Processing successful messageSent with message data');
          console.log('ChatContext: About to call setMessages...');
          
          // 메시지 전송 완료 처리
          setIsSendingMessage(false);
          setCurrentSendingMessage(null);
          console.log('ChatContext: Message sending completed successfully');
          
          // Find and remove temp message for this chat room
          setMessages(prev => {
            console.log('ChatContext: setMessages callback called with prev:', prev);
            const chatId = data.message.chatRoomId;
            const currentMessages = prev[chatId] || [];
            
            // Remove temp messages from the same sender
            const withoutTemp = currentMessages.filter(msg => !msg.isTemp || msg.senderId !== data.message.senderId);
            
            // Parse timestamp for messageSent event
            let formattedTimestamp;
            try {
              if (data.message.timestamp) {
                const date = new Date(data.message.timestamp);
                if (isNaN(date.getTime())) {
                  const isoString = data.message.timestamp.includes('T') ? data.message.timestamp : data.message.timestamp + 'T00:00:00';
                  const parsedDate = new Date(isoString);
                  formattedTimestamp = isNaN(parsedDate.getTime()) 
                    ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                  formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              } else {
                formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            } catch (error) {
              console.warn('ChatContext: Failed to parse messageSent timestamp:', data.message.timestamp, error);
              formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            // Add the real message
            let originalTimestamp;
            try {
              if (data.message.timestamp) {
                const date = new Date(data.message.timestamp);
                originalTimestamp = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
              } else {
                originalTimestamp = new Date().toISOString();
              }
            } catch (error) {
              originalTimestamp = new Date().toISOString();
            }
            
            const realMessage = {
              id: data.message.id,
              text: base64ToUtf8(data.message.encryptedContent),
              senderId: data.message.senderId,
              senderName: user?.nickname || 'Unknown',
              timestamp: formattedTimestamp,
              originalTimestamp: originalTimestamp, // 정렬용 원본 timestamp
              timestampMs: new Date(originalTimestamp).getTime(), // 정렬용 milliseconds
              sent: data.message.senderId === user?.id,
              delivered: true,
              read: false
            };
            
            console.log('ChatContext: Adding messageSent message to room:', chatId);
            console.log('ChatContext: Before update - existing messages in room:', currentMessages.length);
            console.log('ChatContext: After filter - messages without temp:', withoutTemp.length);
            
            const updatedMessages = [...withoutTemp, realMessage];
            console.log('ChatContext: After adding new message - total messages:', updatedMessages.length);
            console.log('ChatContext: New message added:', realMessage);
            
            const result = {
              ...prev,
              [chatId]: updatedMessages
            };
            
            console.log('ChatContext: All chat rooms after update:', Object.keys(result));
            console.log('ChatContext: Messages count per room:', Object.keys(result).map(roomId => `${roomId}: ${result[roomId].length}`));
            
            // 채팅방 목록 업데이트 트리거 (messageSent 이벤트로 마지막 메시지 업데이트용)
            triggerChatListUpdate();
            
            return result;
          });
        } else {
          console.log('ChatContext: messageSent event failed or without message data');
          // 전송 실패 시에도 상태 초기화
          setIsSendingMessage(false);
          setCurrentSendingMessage(null);
          console.log('ChatContext: Message sending failed, state reset');
        }
      });

      // Store unsubscribe functions for cleanup
      webSocketService._unsubscribeFunctions = [unsubscribeConnection, unsubscribeMessage, unsubscribeOfflineMessage, unsubscribeTyping, unsubscribeChatRoomList, unsubscribeChatRoomsResponse, unsubscribeMessageSent];
    } catch (error) {
      console.error('ChatContext: Failed to connect WebSocket:', error);
    }
    
    // Check connection status after a brief delay
    setTimeout(() => {
      console.log('ChatContext: Connection check - isConnected:', webSocketService.isConnected());
      console.log('ChatContext: WebSocket readyState:', webSocketService.ws?.readyState);
    }, 1000);
  };

  const disconnectWebSocket = () => {
    // Clean up subscriptions
    if (webSocketService._unsubscribeFunctions) {
      webSocketService._unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      delete webSocketService._unsubscribeFunctions;
    }
    
    webSocketService.disconnect();
    setIsConnected(false);
  };

  const handleWebSocketMessage = (data) => {
    console.log('ChatContext: Received WebSocket message:', data);
    console.log('ChatContext: Message type:', data.type);
    console.log('ChatContext: Message data keys:', Object.keys(data));
    
    // Handle ChatEvent format from server (Jackson serialized)
    if (data.type === 'MESSAGE_SENT') {
      console.log('ChatContext: Processing MESSAGE_SENT event for chatRoom:', data.chatRoomId);
      console.log('ChatContext: Current user ID:', user?.id, 'Message sender ID:', data.senderId);
      console.log('ChatContext: User object:', user);
      
      // First, remove any temp messages for this chat room from the same sender
      if (data.senderId === user?.id) {
        console.log('ChatContext: Removing temp messages from sender');
        setMessages(prev => {
          const updated = {
            ...prev,
            [data.chatRoomId]: (prev[data.chatRoomId] || []).filter(msg => !msg.isTemp)
          };
          console.log('ChatContext: Messages after temp removal:', updated[data.chatRoomId]?.length || 0);
          return updated;
        });
      }
      
      let decodedText;
      try {
        decodedText = base64ToUtf8(data.encryptedContent);
        console.log('ChatContext: Successfully decoded message text:', decodedText);
      } catch (error) {
        console.error('ChatContext: Failed to decode message text:', error);
        decodedText = '[복호화 실패]';
      }
      
      // Parse LocalDateTime format from backend (e.g., "2024-08-03T15:30:45.123")
      let formattedTimestamp;
      let originalTimestamp;
      try {
        if (data.timestamp) {
          const date = new Date(data.timestamp);
          if (isNaN(date.getTime())) {
            // Try parsing LocalDateTime format manually
            const isoString = data.timestamp.includes('T') ? data.timestamp : data.timestamp + 'T00:00:00';
            const parsedDate = new Date(isoString);
            if (isNaN(parsedDate.getTime())) {
              formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              originalTimestamp = new Date().toISOString();
            } else {
              formattedTimestamp = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              originalTimestamp = parsedDate.toISOString();
            }
          } else {
            formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            originalTimestamp = date.toISOString();
          }
        } else {
          const now = new Date();
          formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          originalTimestamp = now.toISOString();
        }
      } catch (error) {
        console.warn('ChatContext: Failed to parse timestamp:', data.timestamp, error);
        const now = new Date();
        formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        originalTimestamp = now.toISOString();
      }

      const message = {
        id: data.messageId,
        text: decodedText,
        senderId: data.senderId,
        senderName: data.senderName || 'Unknown',
        timestamp: formattedTimestamp,
        originalTimestamp: originalTimestamp, // 정렬용 원본 timestamp
        timestampMs: new Date(originalTimestamp).getTime(), // 정렬용 milliseconds
        sent: data.senderId === user?.id,
        delivered: true,
        read: false
      };
      
      console.log('ChatContext: Created message object:', message);
      console.log('ChatContext: Adding message to chatRoom:', data.chatRoomId);
      console.log('ChatContext: chatRoomId type:', typeof data.chatRoomId, 'value:', data.chatRoomId);
      console.log('ChatContext: About to call addMessage...');
      
      try {
        addMessage(data.chatRoomId, message);
        console.log('ChatContext: addMessage called successfully');
        
        // 받은 메시지 (다른 사용자가 보낸 메시지)인 경우 읽지 않은 카운트 증가
        if (data.senderId !== user?.id) {
          incrementUnreadCount(data.chatRoomId);
        }
        
        // 채팅방 목록 업데이트 트리거 (마지막 메시지 업데이트용)
        triggerChatListUpdate();
      } catch (error) {
        console.error('ChatContext: Error calling addMessage:', error);
      }
      return;
    }
    
    // Legacy support for other message formats
    switch (data.type) {
      case 'USER_JOINED':
        console.log('ChatContext: User joined:', data);
        break;
      case 'USER_LEFT':
        console.log('ChatContext: User left:', data);
        break;
      case 'TYPING_STARTED':
      case 'TYPING_STOPPED':
        console.log('ChatContext: Typing event:', data);
        console.log('ChatContext: Legacy typing event handling');
        handleTypingEvent(data);
        break;
      case 'message':
        addMessage(data.chatId, data.message);
        break;
      default:
        console.log('ChatContext: Unknown message type:', data.type);
    }
  };

  const handleTypingEvent = (data) => {
    console.log('*** ChatContext: Processing typing event ***');
    console.log('ChatContext: Typing event data:', data);
    console.log('ChatContext: Event type:', data.type);
    console.log('ChatContext: ChatRoomId:', data.chatRoomId);
    console.log('ChatContext: UserId:', data.userId);
    console.log('ChatContext: Current user ID:', user?.id);
    
    // 자신의 타이핑 이벤트는 무시
    if (data.userId === user?.id) {
      console.log('ChatContext: Ignoring own typing event');
      return;
    }
    
    const chatRoomId = data.chatRoomId;
    const userId = data.userId;
    const nickname = data.nickname || 'Unknown';
    
    console.log(`ChatContext: Processing typing event for user ${nickname} (${userId}) in room ${chatRoomId}`);
    
    if (data.type === 'TYPING_STARTED') {
      console.log('ChatContext: Processing TYPING_STARTED event');
      setTypingUsers(prev => {
        console.log('ChatContext: Previous typing users:', prev);
        const roomTypingUsers = new Map(prev[chatRoomId] || new Map());
        console.log('ChatContext: Current typing users in room:', Array.from(roomTypingUsers.keys()));
        roomTypingUsers.set(userId, nickname);
        console.log('ChatContext: Updated typing users in room:', Array.from(roomTypingUsers.keys()));
        
        const updated = {
          ...prev,
          [chatRoomId]: roomTypingUsers
        };
        
        console.log(`ChatContext: User ${nickname} started typing in room ${chatRoomId}`);
        console.log('ChatContext: New typing users state:', updated);
        
        return updated;
      });
    } else if (data.type === 'TYPING_STOPPED') {
      console.log('ChatContext: Processing TYPING_STOPPED event');
      setTypingUsers(prev => {
        console.log('ChatContext: Previous typing users:', prev);
        const roomTypingUsers = new Map(prev[chatRoomId] || new Map());
        console.log('ChatContext: Current typing users in room before removal:', Array.from(roomTypingUsers.keys()));
        roomTypingUsers.delete(userId);
        console.log('ChatContext: Current typing users in room after removal:', Array.from(roomTypingUsers.keys()));
        
        console.log(`ChatContext: User ${nickname} stopped typing in room ${chatRoomId}`);
        
        if (roomTypingUsers.size === 0) {
          const updated = { ...prev };
          delete updated[chatRoomId];
          console.log('ChatContext: No more typing users in room, removed from state');
          console.log('ChatContext: New typing users state:', updated);
          return updated;
        } else {
          const updated = {
            ...prev,
            [chatRoomId]: roomTypingUsers
          };
          console.log('ChatContext: Still have typing users in room');
          console.log('ChatContext: New typing users state:', updated);
          return updated;
        }
      });
    } else {
      console.log('ChatContext: Unknown typing event type:', data.type);
    }
  };

  const handleChatRoomListUpdated = (data) => {
    console.log('ChatContext: Processing chat room list update:', data);
    
    if (data.userId === user?.id && data.chatRooms) {
      console.log('ChatContext: Updating chat rooms with WebSocket data');
      setChatRooms(data.chatRooms);
      triggerChatListUpdate();
    }
  };

  const handleChatRoomsResponse = (data) => {
    console.log('ChatContext: Processing chat rooms response:', data);
    
    if (data.success && data.chatRooms) {
      console.log('ChatContext: Setting chat rooms from WebSocket response');
      setChatRooms(data.chatRooms);
      triggerChatListUpdate();
    } else {
      console.error('ChatContext: Failed to get chat rooms:', data.error);
    }
  };

  const handleOfflineMessage = (data) => {
    console.log('ChatContext: Processing offline message:', data);
    
    let decodedText;
    try {
      decodedText = base64ToUtf8(data.encryptedContent);
      console.log('ChatContext: Successfully decoded offline message text:', decodedText);
    } catch (error) {
      console.error('ChatContext: Failed to decode offline message text:', error);
      decodedText = '[복호화 실패]';
    }
    
    // Parse timestamp for offline messages
    let formattedTimestamp;
    let originalTimestamp;
    try {
      if (data.timestamp) {
        const date = new Date(data.timestamp);
        if (isNaN(date.getTime())) {
          const isoString = data.timestamp.includes('T') ? data.timestamp : data.timestamp + 'T00:00:00';
          const parsedDate = new Date(isoString);
          if (isNaN(parsedDate.getTime())) {
            formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            originalTimestamp = new Date().toISOString();
          } else {
            formattedTimestamp = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            originalTimestamp = parsedDate.toISOString();
          }
        } else {
          formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          originalTimestamp = date.toISOString();
        }
      } else {
        const now = new Date();
        formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        originalTimestamp = now.toISOString();
      }
    } catch (error) {
      console.warn('ChatContext: Failed to parse offline message timestamp:', data.timestamp, error);
      const now = new Date();
      formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      originalTimestamp = now.toISOString();
    }
    
    const message = {
      id: data.id,
      text: decodedText,
      senderId: data.senderId,
      senderName: 'Unknown', // Offline messages might not have sender name
      timestamp: formattedTimestamp,
      originalTimestamp: originalTimestamp, // 정렬용 원본 timestamp
      timestampMs: new Date(originalTimestamp).getTime(), // 정렬용 milliseconds
      sent: data.senderId === user?.id,
      delivered: true,
      read: false,
      isOffline: true // Mark as offline message
    };
    
    console.log('ChatContext: Created offline message object:', message);
    // 오프라인 메시지는 addMessage 대신 직접 처리하여 전체 재정렬 수행
    setMessages(prev => {
      const existingMessages = prev[data.chatRoomId] || [];
      console.log('ChatContext: Existing messages count for offline merge', data.chatRoomId, ':', existingMessages.length);
      
      const isDuplicate = existingMessages.some(msg => msg.id === message.id);
      
      if (isDuplicate) {
        console.log('ChatContext: Duplicate offline message in memory, skipping:', message.id);
        return prev;
      }
      
      // 기존 메시지 + 새 오프라인 메시지 합치기
      const allMessages = [...existingMessages, message];
      
      // 전체 메시지를 timestamp 기준으로 정렬
      allMessages.sort((a, b) => {
        const getTimestamp = (msg) => {
          if (msg.originalTimestamp) {
            return new Date(msg.originalTimestamp).getTime();
          }
          if (msg.timestampMs) {
            return msg.timestampMs;
          }
          return new Date().getTime();
        };
        
        return getTimestamp(a) - getTimestamp(b);
      });
      
      console.log('ChatContext: All messages (DB + offline) sorted by timestamp, count:', allMessages.length);
      console.log('ChatContext: Offline message integrated and sorted');
      
      const updated = Object.assign({}, prev, {
        [data.chatRoomId]: allMessages
      });
      
      return updated;
    });
    
    // 오프라인 메시지로 캐시 업데이트
    setLoadedChatRooms(prev => new Set([...prev, data.chatRoomId]));
    
    // 받은 오프라인 메시지 (다른 사용자가 보낸 메시지)인 경우 읽지 않은 카운트 증가
    if (data.senderId !== user?.id) {
      incrementUnreadCount(data.chatRoomId);
    }
    
    // 채팅방 목록 업데이트 트리거 (오프라인 메시지로 마지막 메시지 업데이트용)
    triggerChatListUpdate();
    
    // 오프라인 메시지도 로컬 저장소에 저장 (비동기로 실행)
    if (user?.id && message.id && !message.isTemp && !message.isCorrupted) {
      secureStorage.messageExists(user.id, message.id)
        .then(exists => {
          if (!exists) {
            const messageToSave = {
              id: message.id,
              text: message.text || '',
              senderId: message.senderId,
              senderName: message.senderName || 'Unknown',
              timestamp: message.originalTimestamp || new Date().toISOString(),
              messageType: message.messageType || 'TEXT',
              sent: message.sent || false,
              delivered: message.delivered || false,
              read: message.read || false
            };
            
            return secureStorage.saveMessage(user.id, data.chatRoomId, messageToSave);
          }
        })
        .then(() => {
          console.log('Offline message saved to local storage:', message.id);
        })
        .catch(error => {
          console.error('Failed to save offline message to local storage:', error);
        });
    }
  };

  const sendMessage = async (chatId, messageText) => {
    // 현재 메시지 전송 중인지 확인
    if (isSendingMessage) {
      console.warn('ChatContext: Cannot send message - another message is currently being sent');
      console.warn('ChatContext: Current sending message:', currentSendingMessage);
      throw new Error('이전 메시지 전송이 완료될 때까지 기다려주세요.');
    }

    // 전송 상태 설정 및 메시지 ID 생성
    setIsSendingMessage(true);
    const messageId = 'temp_' + Date.now().toString();
    setCurrentSendingMessage({ chatId, messageText, messageId });

    try {
      
      console.log('ChatContext: Starting message send process:', messageId);
      
      const now = new Date();
      const tempMessage = {
        id: messageId,
        text: messageText,
        senderId: user.id,
        senderName: user.nickname,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalTimestamp: now.toISOString(), // 정렬용 원본 timestamp
        timestampMs: now.getTime(), // 정렬용 milliseconds
        sent: true,
        delivered: false,
        read: false,
        isTemp: true, // 임시 메시지 (전송 중)
        isLoading: true, // 로딩 스피너 표시
        isFailed: false // 전송 실패 여부
      };

      // Add temp message locally first for immediate UI feedback
      addMessage(chatId, tempMessage);

      // Messages can only be sent via WebSocket
      if (!webSocketService.isConnected()) {
        console.error('ChatContext: Cannot send message - WebSocket not connected');
        // Mark temp message as failed instead of removing it
        setMessages(prev => {
          const updated = { ...prev };
          if (updated[chatId]) {
            updated[chatId] = updated[chatId].map(msg => 
              msg.id === messageId 
                ? { ...msg, isLoading: false, isFailed: true, isTemp: true }
                : msg
            );
          }
          return updated;
        });
        
        // 전송 상태 초기화
        setIsSendingMessage(false);
        setCurrentSendingMessage(null);
        
        throw new Error('WebSocket 연결이 필요합니다. 연결을 확인해주세요.');
      }

      console.log('ChatContext: WebSocket connected, sending message to room:', chatId);
      console.log('ChatContext: WebSocket state check:', webSocketService.isConnected());

      try {
        // For now, use simple encryption (UTF-8 safe base64 encoding as placeholder)
        const encryptedContent = utf8ToBase64(messageText);
        const contentIv = utf8ToBase64(Math.random().toString(36));
        
        console.log('ChatContext: Sending message via WebSocket:', { chatId, encryptedContent, contentIv });
        console.log('ChatContext: Message text to encode:', messageText);
        
        // Send via WebSocket
        webSocketService.sendChatMessage(chatId, encryptedContent, contentIv, 'TEXT');
        
        // Message sent successfully via WebSocket
        // The response will be handled by the global MESSAGE_SENT event subscription
        console.log('Message sent via WebSocket, waiting for server confirmation');
        console.log('ChatContext: isSendingMessage will remain true until server confirms');
        
        // 타임아웃 설정 (30초 후 강제 해제 및 실패 상태로 변경)
        setTimeout(() => {
          if (isSendingMessage && currentSendingMessage?.messageId === messageId) {
            console.warn('ChatContext: Message send timeout - marking as failed');
            setIsSendingMessage(false);
            setCurrentSendingMessage(null);
            
            // 임시 메시지를 실패 상태로 업데이트
            setMessages(prev => {
              const updated = { ...prev };
              if (updated[chatId]) {
                updated[chatId] = updated[chatId].map(msg => 
                  msg.id === messageId 
                    ? { ...msg, isLoading: false, isFailed: true, isTemp: true }
                    : msg
                );
              }
              return updated;
            });
          }
        }, 30000); // 30초 타임아웃
      } catch (wsError) {
        console.error('WebSocket send failed:', wsError);
        // 실패 시 임시 메시지를 실패 상태로 업데이트
        setMessages(prev => {
          const updated = { ...prev };
          if (updated[chatId]) {
            updated[chatId] = updated[chatId].map(msg => 
              msg.id === messageId 
                ? { ...msg, isLoading: false, isFailed: true, isTemp: true }
                : msg
            );
          }
          return updated;
        });
        
        // 전송 상태 초기화
        setIsSendingMessage(false);
        setCurrentSendingMessage(null);
        
        throw wsError;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark temp message as failed instead of removing it
      setMessages(prev => {
        const updated = { ...prev };
        if (updated[chatId]) {
          updated[chatId] = updated[chatId].map(msg => 
            msg.isTemp && msg.id === messageId
              ? { ...msg, isLoading: false, isFailed: true, isTemp: true }
              : msg
          );
        }
        return updated;
      });
      
      // 전송 상태 초기화
      setIsSendingMessage(false);
      setCurrentSendingMessage(null);
      
      throw error;
    }
  };


  const addMessage = useCallback(async (chatId, message) => {
    console.log('ChatContext: *** addMessage FUNCTION CALLED ***');
    console.log('ChatContext: Adding message to chat', chatId, 'Message:', message);
    
    // 메모리 상에서 중복 메시지 확인
    setMessages(prev => {
      const existingMessages = prev[chatId] || [];
      console.log('ChatContext: Existing messages count for', chatId, ':', existingMessages.length);
      console.log('ChatContext: Previous messages object reference:', prev);
      
      const isDuplicate = existingMessages.some(msg => msg.id === message.id);
      
      if (isDuplicate) {
        console.log('ChatContext: Duplicate message in memory, skipping:', message.id);
        return prev;
      }
      
      // Add message and sort by timestamp to ensure proper ordering
      const newMessagesArray = [...existingMessages, message];
      
      // Sort messages by timestamp (convert to comparable format)
      newMessagesArray.sort((a, b) => {
        // Extract actual timestamp for sorting
        const getTimestamp = (msg) => {
          if (msg.originalTimestamp) {
            return new Date(msg.originalTimestamp).getTime();
          }
          if (msg.timestampMs) {
            return msg.timestampMs;
          }
          // Fallback: try to parse display timestamp or use current time
          const now = new Date();
          if (msg.timestamp && typeof msg.timestamp === 'string') {
            // Try to parse HH:MM format assuming today's date
            const [hours, minutes] = msg.timestamp.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const msgDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
              return msgDate.getTime();
            }
          }
          return now.getTime();
        };
        
        return getTimestamp(a) - getTimestamp(b);
      });
      
      console.log('ChatContext: Messages sorted by timestamp, count:', newMessagesArray.length);
      
      const updated = Object.assign({}, prev, {
        [chatId]: newMessagesArray
      });
      
      console.log('ChatContext: Updated messages state for', chatId, '- new count:', updated[chatId].length);
      console.log('ChatContext: All chat rooms with messages:', Object.keys(updated).filter(key => updated[key].length > 0));
      console.log('ChatContext: New messages object reference:', updated);
      console.log('ChatContext: Object reference changed:', prev !== updated);
      console.log('ChatContext: Array reference changed:', prev[chatId] !== updated[chatId]);
      console.log('ChatContext: Setting new messages state...');
      
      return updated;
    });
    
    // 캐시 업데이트: 새 메시지가 추가되면 해당 채팅방을 로드된 것으로 표시
    setLoadedChatRooms(prev => new Set([...prev, chatId]));
    
    // 채팅방 목록 업데이트 트리거 (새 메시지로 마지막 메시지 업데이트용)
    triggerChatListUpdate();
    
    // 일반 메시지도 로컬 저장소에 저장
    if (user?.id && message.id && !message.isTemp && !message.isCorrupted) {
      try {
        const exists = await secureStorage.messageExists(user.id, message.id);
        if (!exists) {
          const messageToSave = {
            id: message.id,
            text: message.text || '',
            senderId: message.senderId,
            senderName: message.senderName || 'Unknown',
            timestamp: message.originalTimestamp || new Date().toISOString(),
            messageType: message.messageType || 'TEXT',
            sent: message.sent || false,
            delivered: message.delivered || false,
            read: message.read || false
          };
          
          await secureStorage.saveMessage(user.id, chatId, messageToSave);
          console.log('Message saved to local storage:', message.id);
        } else {
          console.log('Message already exists in local storage:', message.id);
        }
      } catch (error) {
        console.error('Failed to save message to local storage:', error);
      }
    }
  }, [user]);


  const getChatMessages = useCallback((chatId) => {
    const chatMessages = messages[chatId] || [];
    console.log('ChatContext: getChatMessages called for', chatId, 'returned', chatMessages.length, 'messages');
    return chatMessages;
  }, [messages]);

  // 읽지 않은 메시지 카운트 증가
  const incrementUnreadCount = useCallback((chatId) => {
    console.log(`ChatContext: incrementUnreadCount called for room ${chatId}`);
    console.log(`ChatContext: Current chatId: ${currentChatId}`);
    console.log(`ChatContext: Should increment? ${chatId !== currentChatId}`);
    
    // 현재 보고 있는 채팅방이 아닌 경우에만 카운트 증가
    if (chatId !== currentChatId) {
      setUnreadCounts(prev => {
        const newCount = (prev[chatId] || 0) + 1;
        console.log(`ChatContext: Incrementing unread count for room ${chatId} from ${prev[chatId] || 0} to ${newCount}`);
        return {
          ...prev,
          [chatId]: newCount
        };
      });
      console.log(`ChatContext: Incremented unread count for room ${chatId}`);
    } else {
      console.log(`ChatContext: Not incrementing unread count for current room ${chatId}`);
    }
  }, [currentChatId]);

  // 읽지 않은 메시지 카운트 초기화
  const clearUnreadCount = useCallback((chatId) => {
    console.log(`ChatContext: *** clearUnreadCount called for room ${chatId} ***`);
    setUnreadCounts(prev => {
      console.log(`ChatContext: Previous unread counts state:`, prev);
      console.log(`ChatContext: Count for room ${chatId}:`, prev[chatId]);
      console.log(`ChatContext: Clearing unread count for room ${chatId}`);
      
      // Always create a new object to ensure React detects the change
      const updated = { ...prev };
      delete updated[chatId];
      
      console.log(`ChatContext: New unread counts after clearing room ${chatId}:`, updated);
      console.log(`ChatContext: State change detected:`, prev !== updated);
      
      return updated;
    });
    
    // Also force a re-render by updating currentChatId if it matches
    if (currentChatId === chatId) {
      console.log(`ChatContext: Confirming current chat ID for room ${chatId}`);
      setCurrentChatId(chatId); // Force re-render
    }
  }, [currentChatId]);

  // 읽지 않은 메시지 카운트 가져오기
  const getUnreadCount = useCallback((chatId) => {
    return unreadCounts[chatId] || 0;
  }, [unreadCounts]);

  // 타이핑 중인 사용자 목록 가져오기 (닉네임 포함)
  const getTypingUsers = useCallback((chatId) => {
    const typingUsersMap = typingUsers[chatId];
    return typingUsersMap ? Array.from(typingUsersMap.keys()) : [];
  }, [typingUsers]);

  // 타이핑 중인 사용자들의 닉네임 가져오기
  const getTypingUsersNames = useCallback((chatId) => {
    const typingUsersMap = typingUsers[chatId];
    if (!typingUsersMap || typingUsersMap.size === 0) {
      return [];
    }
    return Array.from(typingUsersMap.values());
  }, [typingUsers]);

  // 타이핑 중인 사용자가 있는지 확인
  const hasTypingUsers = useCallback((chatId) => {
    const typingUsersMap = typingUsers[chatId];
    const hasUsers = typingUsersMap && typingUsersMap.size > 0;
    console.log(`ChatContext: hasTypingUsers for room ${chatId}:`, hasUsers);
    if (hasUsers) {
      console.log(`ChatContext: Typing users in room ${chatId}:`, Array.from(typingUsersMap.values()));
    }
    return hasUsers;
  }, [typingUsers]);

  const subscribeToChat = (chatId) => {
    console.log('ChatContext: *** SUBSCRIBING TO CHAT ROOM ***:', chatId);
    
    // 채팅방 입장 시 즉시 currentChatId 업데이트 (읽지 않은 카운트 증가 방지용)
    console.log('ChatContext: Setting currentChatId to:', chatId);
    setCurrentChatId(chatId);
    
    // 읽지 않은 메시지 카운트 초기화 (여러 번 시도)
    console.log(`ChatContext: Current unread count before subscribe clearing: ${unreadCounts[chatId] || 0}`);
    
    // 즉시 삭제
    clearUnreadCount(chatId);
    console.log(`ChatContext: Immediate clear for room ${chatId}`);
    
    // 100ms 후 다시 삭제
    setTimeout(() => {
      clearUnreadCount(chatId);
      console.log(`ChatContext: 100ms delayed clear for room ${chatId}`);
    }, 100);
    
    // 500ms 후 다시 삭제 (최종 확인)
    setTimeout(() => {
      clearUnreadCount(chatId);
      console.log(`ChatContext: 500ms delayed clear for room ${chatId}`);
    }, 500);
    
    console.log(`ChatContext: Cleared unread count for room ${chatId} on entry`);
    
    if (webSocketService.isConnected()) {
      webSocketService.subscribeToRoom(chatId);
      console.log('ChatContext: Subscribed to room via WebSocket:', chatId);
    } else {
      console.warn('ChatContext: WebSocket not connected, cannot subscribe to room:', chatId);
    }
  };

  const unsubscribeFromChat = (chatId) => {
    console.log('ChatContext: Closing chat room interface for:', chatId);
    console.log('ChatContext: Note - User remains subscribed to WebSocket messages for this room');
    
    // Only update the UI state - do NOT unsubscribe from WebSocket messages
    // This allows users to continue receiving messages even when the chat room is closed
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    
    // IMPORTANT: We do NOT call webSocketService.unsubscribeFromRoom(chatId) here
    // because we want users to continue receiving messages even when the chat room interface is closed
    // This fixes the issue where user B doesn't receive messages when their chat room is closed
    console.log('ChatContext: Chat room interface closed, but WebSocket subscription maintained for:', chatId);
  };

  const sendTypingIndicator = (chatId, isTyping) => {
    if (webSocketService.isConnected()) {
      if (isTyping) {
        webSocketService.sendStartTyping(chatId);
      } else {
        webSocketService.sendStopTyping(chatId);
      }
      console.log(`ChatContext: Sent typing indicator - chatId: ${chatId}, isTyping: ${isTyping}`);
    } else {
      console.warn('ChatContext: Cannot send typing indicator - WebSocket not connected');
    }
  };

  const createChatRoom = async (roomName, memberUserIds = []) => {
    try {
      const response = await chatAPI.createChatRoom(roomName, memberUserIds);
      setChatRooms(prev => [...prev, response]);
      return response;
    } catch (error) {
      console.error('Failed to create chat room:', error);
      throw error;
    }
  };

  const createDirectMessageRoom = async (recipientHashedId, recipientNickname) => {
    try {
      // Generate room name in format: "{current user nickname}, {recipient nickname}"
      const name = `${user?.nickname || '나'}, ${recipientNickname}`;
      const response = await chatAPI.createDirectMessageRoom(recipientHashedId, name);
      setChatRooms(prev => [...prev, response]);
      return response;
    } catch (error) {
      console.error('Failed to create direct message room:', error);
      throw error;
    }
  };

  const loadChatRooms = async () => {
    try {
      if (webSocketService.isConnected()) {
        console.log('ChatContext: Loading chat rooms via WebSocket');
        webSocketService.getChatRooms();
        return; // WebSocket response will update the state
      } else {
        console.log('ChatContext: WebSocket not connected, using API fallback');
        const rooms = await chatAPI.getChatRooms();
        setChatRooms(rooms);
        return rooms;
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      throw error;
    }
  };

  // 모든 채팅방의 메시지를 로드하는 함수
  const loadAllChatRoomsMessages = async () => {
    console.log('ChatContext: Loading messages for all chat rooms...');
    
    if (!user?.id) {
      console.log('ChatContext: No user available for loading all messages');
      return;
    }

    try {
      // 먼저 채팅방 목록을 가져옴
      let rooms = chatRooms;
      if (!rooms || rooms.length === 0) {
        console.log('ChatContext: Loading chat rooms first...');
        rooms = await loadChatRooms();
      }

      console.log(`ChatContext: Found ${rooms.length} chat rooms to load messages for`);

      // 각 채팅방의 메시지를 병렬로 로드
      const loadPromises = rooms.map(async (room) => {
        try {
          console.log(`ChatContext: Loading messages for room ${room.id} (${room.name})`);
          await loadMessages(room.id);
          console.log(`ChatContext: Completed loading messages for room ${room.id}`);
        } catch (error) {
          console.error(`ChatContext: Failed to load messages for room ${room.id}:`, error);
        }
      });

      await Promise.all(loadPromises);
      console.log('ChatContext: Completed loading messages for all chat rooms');

      // 각 채팅방에 WebSocket 구독 (오프라인 메시지 수신을 위해)
      console.log('ChatContext: Subscribing to all chat rooms for offline messages...');
      rooms.forEach(room => {
        if (webSocketService.isConnected()) {
          webSocketService.subscribeToRoom(room.id);
          console.log(`ChatContext: Subscribed to room ${room.id} for offline messages`);
        }
      });

    } catch (error) {
      console.error('ChatContext: Failed to load all chat rooms messages:', error);
    }
  };

  const loadMessages = useCallback(async (chatId) => {
    console.log('LoadMessages called for chatId:', chatId);
    
    if (!user?.id) {
      console.log('No user available for loading messages');
      return [];
    }
    
    // 캐시 확인: 이미 로드된 채팅방이고 메시지가 있다면 즉시 반환
    if (loadedChatRooms.has(chatId) && messages[chatId] && messages[chatId].length > 0) {
      console.log(`LoadMessages: Using cached messages for chatId ${chatId}, count: ${messages[chatId].length}`);
      return messages[chatId];
    }
    
    console.log(`LoadMessages: Loading fresh messages for chatId ${chatId} (performance optimized)`);
    
    try {
      // 로컬 저장소에서 메시지 먼저 로드
      let localMessages = [];
      try {
        const startTime = performance.now();
        // 성능 최적화: 최신 20개 메시지만 빠르게 로드
        localMessages = await secureStorage.getMessages(user.id, chatId, 20, 0);
        const loadTime = performance.now() - startTime;
        console.log(`LoadMessages: Loaded ${localMessages.length} latest messages in ${loadTime.toFixed(2)}ms for chat ${chatId}`);
      } catch (storageError) {
        console.error('LoadMessages: Failed to load messages from secure storage:', storageError);
        // 저장소 오류 시 빈 배열로 시작
        localMessages = [];
      }
      
      // 안전한 메시지 검증 및 필터링
      const validMessages = localMessages.filter(msg => {
        // 메시지 객체 유효성 검사
        if (!msg || typeof msg !== 'object') {
          console.warn('Invalid message object:', msg);
          return false;
        }
        
        // 손상된 메시지 필터링
        if (msg.isCorrupted) {
          console.warn('Filtering out corrupted message:', msg.id || 'unknown id');
          return false;
        }
        
        // 필수 필드 검사
        if (!msg.id || !msg.text) {
          console.warn('Message missing required fields:', msg);
          return false;
        }
        
        return true;
      });
      
      console.log(`After filtering corrupted messages: ${validMessages.length} valid messages`);
      
      // 메시지를 UI에 표시할 수 있도록 포맷팅
      const formattedMessages = validMessages.map(msg => {
        // 로컬 메시지의 timestamp 안전 처리
        let formattedTimestamp;
        let originalTimestamp;
        try {
          const date = new Date(msg.timestamp);
          if (isNaN(date.getTime())) {
            formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            originalTimestamp = new Date().toISOString();
          } else {
            formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            originalTimestamp = date.toISOString();
          }
        } catch (error) {
          const now = new Date();
          formattedTimestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          originalTimestamp = now.toISOString();
        }
        
        return {
          id: msg.id,
          text: msg.text,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          timestamp: formattedTimestamp,
          originalTimestamp: originalTimestamp, // 정렬용 원본 timestamp
          timestampMs: new Date(originalTimestamp).getTime(), // 정렬용 milliseconds
          sent: msg.senderId === user.id,
          delivered: true,
          read: true,
          messageType: msg.messageType || 'TEXT',
          isLocal: true // 로컬에서 로드된 메시지임을 표시
        };
      });
      
      // 시간순으로 정렬 후 메시지 상태 업데이트
      formattedMessages.sort((a, b) => a.timestampMs - b.timestampMs);
      console.log(`Sorted ${formattedMessages.length} local messages by timestamp`);
      
      setMessages(prev => ({
        ...prev,
        [chatId]: formattedMessages
      }));
      
      // 채팅방을 로드된 것으로 표시
      setLoadedChatRooms(prev => new Set([...prev, chatId]));
      console.log(`LoadMessages: Cached chatId ${chatId} with ${formattedMessages.length} messages`);
      
      // 메시지 로드 후 자동으로 맨 아래로 스크롤 (최신 메시지 보기)
      if (formattedMessages.length > 0) {
        console.log('LoadMessages: Triggering scroll to bottom for latest messages');
        // 다음 렌더링 사이클에서 스크롤
        setTimeout(() => {
          const event = new CustomEvent('scrollToBottom', { detail: { chatId } });
          window.dispatchEvent(event);
        }, 100);
      }
      
      return formattedMessages;
    } catch (error) {
      console.error('Failed to load messages from local storage:', error);
      
      // 로컬 저장소 로드 실패 시 빈 배열로 초기화
      setMessages(prev => ({
        ...prev,
        [chatId]: []
      }));
      
      // 빈 배열도 로드된 것으로 처리 (다음에 새 메시지가 오면 캐시 업데이트)
      setLoadedChatRooms(prev => new Set([...prev, chatId]));
      console.log(`LoadMessages: Cached empty chatId ${chatId}`);
      
      return [];
    }
  }, [user, loadedChatRooms, messages]);

  // 로그아웃 시 로컬 데이터 정리
  const clearUserData = useCallback(async () => {
    if (user?.id) {
      try {
        await secureStorage.deleteUserData(user.id);
        console.log('User data cleared from local storage');
      } catch (error) {
        console.error('Failed to clear user data:', error);
      }
    }
    
    // 메모리 상태 초기화
    setChatRooms([]);
    setMessages({});
    setCurrentChatId(null);
    setLoadedChatRooms(new Set());
    setChatRoomInfo({});
  }, [user]);

  // 주기적으로 오래된 메시지 정리 (30일 이상)
  const cleanupOldMessages = useCallback(async () => {
    if (user?.id) {
      try {
        await secureStorage.cleanupOldMessages(user.id, 30);
        console.log('Old messages cleaned up');
      } catch (error) {
        console.error('Failed to cleanup old messages:', error);
      }
    }
  }, [user]);

  // 메시지 상태 변경 감지 (디버깅용)
  useEffect(() => {
    console.log('ChatContext: messages state changed!');
    console.log('ChatContext: Current messages state:', messages);
    console.log('ChatContext: Rooms with messages:', Object.keys(messages).filter(key => messages[key].length > 0));
    Object.keys(messages).forEach(roomId => {
      if (messages[roomId].length > 0) {
        console.log(`ChatContext: Room ${roomId} has ${messages[roomId].length} messages`);
      }
    });
  }, [messages]);

  // 앱 시작 시 한 번 정리 실행
  useEffect(() => {
    if (user?.id) {
      // 5초 후에 정리 실행 (앱 로딩 완료 후)
      const cleanupTimer = setTimeout(() => {
        cleanupOldMessages();
      }, 5000);
      
      return () => clearTimeout(cleanupTimer);
    }
  }, [user, cleanupOldMessages]);

  // 로그아웃 이벤트 수신
  useEffect(() => {
    const unsubscribe = eventBus.on('user:logout', async (data) => {
      console.log('ChatContext: Received logout event for user:', data.userId);
      await clearUserData();
    });

    return unsubscribe;
  }, [clearUserData]);

  const reconnectWebSocket = () => {
    console.log('ChatContext: Manual WebSocket reconnection requested');
    disconnectWebSocket();
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  };

  const debugMessages = () => {
    console.log('=== ChatContext Debug Info ===');
    console.log('Current user:', user?.id);
    console.log('WebSocket connected:', isConnected);
    console.log('Current chat ID:', currentChatId);
    console.log('All messages:', messages);
    console.log('Chat rooms with messages:', Object.keys(messages).filter(key => messages[key].length > 0));
    Object.keys(messages).forEach(roomId => {
      console.log(`Room ${roomId}: ${messages[roomId].length} messages`);
    });
    console.log('===============================');
  };

  const resetLocalMessages = async () => {
    if (!user?.id) {
      console.warn('No user available for reset');
      return false;
    }

    try {
      console.log('Resetting local messages for user:', user.id);
      const success = await secureStorage.resetUserMessages(user.id);
      
      if (success) {
        // 메모리에서도 메시지 초기화
        setMessages({});
        console.log('Local messages reset completed');
        return true;
      } else {
        console.error('Failed to reset local messages');
        return false;
      }
    } catch (error) {
      console.error('Error resetting local messages:', error);
      return false;
    }
  };

  const cleanupCorruptedMessages = async () => {
    if (!user?.id) {
      console.warn('No user available for cleanup');
      return false;
    }

    try {
      console.log('Cleaning up corrupted messages for user:', user.id);
      await secureStorage.cleanupCorruptedMessages(user.id);
      
      // 메모리에서도 손상된 메시지 제거
      setMessages(prev => {
        const cleaned = {};
        Object.keys(prev).forEach(chatId => {
          cleaned[chatId] = prev[chatId].filter(msg => !msg.isCorrupted);
        });
        return cleaned;
      });
      
      console.log('Corrupted messages cleanup completed');
      return true;
    } catch (error) {
      console.error('Error cleaning up corrupted messages:', error);
      return false;
    }
  };
  
  // 채팅방 캐시 무효화 함수
  const invalidateChatRoomCache = useCallback((chatId) => {
    console.log(`ChatContext: Invalidating cache for chatId: ${chatId}`);
    setLoadedChatRooms(prev => {
      const updated = new Set(prev);
      updated.delete(chatId);
      return updated;
    });
  }, []);
  
  // 전체 캐시 무효화
  const clearAllCache = useCallback(() => {
    console.log('ChatContext: Clearing all chat room cache');
    setLoadedChatRooms(new Set());
    setChatRoomInfo({});
  }, []);
  
  // 채팅방 목록 업데이트 트리거
  const triggerChatListUpdate = useCallback(() => {
    console.log('ChatContext: Triggering chat list update');
    setChatListUpdateTrigger(prev => prev + 1);
  }, []);

  const value = {
    chatRooms,
    messages,
    currentChatId,
    isConnected,
    isSendingMessage, // 메시지 전송 중 상태
    currentSendingMessage, // 현재 전송 중인 메시지 정보
    unreadCounts, // 읽지 않은 메시지 카운트
    typingUsers, // 타이핑 중인 사용자들
    sendMessage,
    getChatMessages,
    subscribeToChat,
    unsubscribeFromChat,
    sendTypingIndicator,
    createChatRoom,
    createDirectMessageRoom,
    loadChatRooms,
    loadMessages,
    loadAllChatRoomsMessages, // 모든 채팅방 메시지 로드 함수 추가
    setChatRooms,
    clearUserData,
    cleanupOldMessages,
    reconnectWebSocket,
    debugMessages,
    resetLocalMessages,
    cleanupCorruptedMessages,
    // 읽지 않은 메시지 관리 함수들
    incrementUnreadCount,
    clearUnreadCount,
    getUnreadCount,
    // 타이핑 상태 관리 함수들
    getTypingUsers,
    getTypingUsersNames,
    hasTypingUsers,
    // 캐시 관리 함수들
    invalidateChatRoomCache,
    clearAllCache,
    loadedChatRooms,
    // 채팅방 목록 업데이트 트리거
    triggerChatListUpdate,
    chatListUpdateTrigger
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};