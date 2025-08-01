import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
  const [websocket, setWebsocket] = useState(null);

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

  const connectWebSocket = () => {
    try {
      // Mock WebSocket connection - replace with actual WebSocket URL
      const ws = new WebSocket(`ws://localhost:8081/ws/chat?token=${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (user && token) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'message':
        addMessage(data.chatId, data.message);
        break;
      case 'typing':
        // Handle typing indicator
        break;
      case 'user_status':
        // Handle user online/offline status
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendMessage = async (chatId, messageText) => {
    try {
      const message = {
        id: Date.now().toString(),
        text: messageText,
        senderId: user.id,
        senderName: user.nickname,
        timestamp: new Date().toISOString(),
        sent: true,
        delivered: false,
        read: false
      };

      // Add message locally first
      addMessage(chatId, message);

      // Send via WebSocket if connected
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'message',
          chatId,
          message: {
            ...message,
            sent: false // Remove client-side flags for server
          }
        }));
      } else {
        // Fallback to HTTP API
        await sendMessageHttp(chatId, messageText);
      }

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const sendMessageHttp = async (chatId, messageText) => {
    // Mock HTTP API call - replace with actual API endpoint
    const response = await fetch(`http://localhost:8081/api/chat/rooms/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text: messageText
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  };

  const addMessage = (chatId, message) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message]
    }));
  };

  const getChatMessages = (chatId) => {
    return messages[chatId] || [];
  };

  const subscribeToChat = (chatId) => {
    setCurrentChatId(chatId);
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'subscribe',
        chatId
      }));
    }
  };

  const unsubscribeFromChat = (chatId) => {
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'unsubscribe',
        chatId
      }));
    }
  };

  const sendTypingIndicator = (chatId, isTyping) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'typing',
        chatId,
        isTyping
      }));
    }
  };

  const createChatRoom = async (participantIds, roomName = null) => {
    try {
      // Mock API call - replace with actual API endpoint
      const response = await fetch('http://localhost:8081/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participantIds,
          name: roomName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create chat room');
      }

      const chatRoom = await response.json();
      setChatRooms(prev => [...prev, chatRoom]);
      
      return chatRoom;
    } catch (error) {
      console.error('Failed to create chat room:', error);
      throw error;
    }
  };

  const value = {
    chatRooms,
    messages,
    currentChatId,
    isConnected,
    sendMessage,
    getChatMessages,
    subscribeToChat,
    unsubscribeFromChat,
    sendTypingIndicator,
    createChatRoom
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};