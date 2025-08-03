class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.messageHandlers = new Map();
    this.isConnecting = false;
  }

  connect(token) {
    console.log('WebSocket connect() called with token:', token ? 'present' : 'missing');
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    const wsUrl = `ws://localhost:8081/ws/chat?token=${token}`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      console.log('WebSocket object created, readyState:', this.ws.readyState);
    } catch (error) {
      console.error('Failed to create WebSocket object:', error);
      this.isConnecting = false;
      return;
    }

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.notifyHandlers('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      console.log('*** RAW WebSocket message received ***');
      console.log('Raw event.data:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('*** Parsed WebSocket message ***:', data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.error('Raw data that failed to parse:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected - Code:', event.code, 'Reason:', event.reason, 'WasClean:', event.wasClean);
      this.isConnecting = false;
      this.ws = null;
      this.notifyHandlers('connection', { status: 'disconnected' });
      
      // Attempt to reconnect if not manually closed
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('WebSocket will attempt to reconnect...');
        this.scheduleReconnect(token);
      } else {
        console.log('WebSocket will not reconnect - Code:', event.code, 'Attempts:', this.reconnectAttempts, 'Max:', this.maxReconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error occurred:', error);
      console.error('WebSocket readyState at error:', this.ws?.readyState);
      this.isConnecting = false;
      this.notifyHandlers('error', { error });
    };
  }

  scheduleReconnect(token) {
    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect(token);
      }
    }, this.reconnectInterval);
  }

  handleMessage(data) {
    console.log('*** WebSocket handleMessage called ***');
    console.log('Data:', data);
    console.log('Has action:', !!data.action, 'Action:', data.action);
    console.log('Has type:', !!data.type, 'Type:', data.type);
    
    // Handle server responses based on action
    if (data.action) {
      console.log('*** Processing action-based message ***');
      switch (data.action) {
        case 'messageSent':
          console.log('*** Notifying messageSent handlers ***');
          this.notifyHandlers('messageSent', data);
          break;
        case 'chatRoomsResponse':
          console.log('Received chat rooms response:', data);
          this.notifyHandlers('chatRoomsResponse', data);
          break;
        case 'offlineMessage':
          console.log('Received offline message:', data);
          this.notifyHandlers('offlineMessage', data);
          break;
        default:
          console.log('Unknown action:', data.action);
          this.notifyHandlers('unknown', data);
      }
      return;
    }

    // Handle chat events based on type
    console.log('*** Processing type-based message ***');
    switch (data.type) {
      case 'MESSAGE_SENT':
        console.log('*** Notifying message handlers for MESSAGE_SENT ***');
        this.notifyHandlers('message', data);
        break;
      case 'USER_JOINED':
        this.notifyHandlers('userJoined', data);
        break;
      case 'USER_LEFT':
        this.notifyHandlers('userLeft', data);
        break;
      case 'TYPING_STARTED':
        console.log('*** Processing TYPING_STARTED event from backend ***');
        console.log('Typing event data:', data);
        this.notifyHandlers('typing', data);
        break;
      case 'TYPING_STOPPED':
        console.log('*** Processing TYPING_STOPPED event from backend ***');
        console.log('Typing event data:', data);
        this.notifyHandlers('typing', data);
        break;
      case 'CHAT_ROOM_LIST_UPDATED':
        console.log('*** Processing CHAT_ROOM_LIST_UPDATED event ***');
        console.log('Chat room list update data:', data);
        this.notifyHandlers('chatRoomListUpdated', data);
        break;
      default:
        console.log('Unknown message type:', data.type);
        this.notifyHandlers('unknown', data);
    }
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('WebSocket message sent:', message);
    } else {
      console.error('WebSocket not connected. ReadyState:', this.ws?.readyState, 'Cannot send message:', message);
    }
  }

  sendChatMessage(chatRoomId, encryptedContent, contentIv, messageType = 'TEXT', replyToMessageId = null) {
    const message = {
      action: 'sendMessage',
      chatRoomId,
      encryptedContent,
      contentIv,
      messageType,
      replyToMessageId
    };
    console.log('*** WebSocket sendChatMessage called ***');
    console.log('Message to send:', message);
    console.log('WebSocket connected:', this.isConnected());
    this.sendMessage(message);
  }

  sendStartTyping(chatRoomId) {
    const message = {
      action: 'startTyping',
      chatRoomId
    };
    console.log('*** WebSocket sendStartTyping called ***');
    console.log('Start typing message:', message);
    this.sendMessage(message);
  }

  sendStopTyping(chatRoomId) {
    const message = {
      action: 'stopTyping', 
      chatRoomId
    };
    console.log('*** WebSocket sendStopTyping called ***');
    console.log('Stop typing message:', message);
    this.sendMessage(message);
  }

  subscribeToRoom(chatRoomId) {
    const message = {
      action: 'subscribe',
      chatRoomId
    };
    this.sendMessage(message);
  }

  unsubscribeFromRoom(chatRoomId) {
    const message = {
      action: 'unsubscribe',
      chatRoomId
    };
    this.sendMessage(message);
  }

  getChatRooms() {
    const message = {
      action: 'getChatRooms'
    };
    console.log('*** WebSocket getChatRooms called ***');
    this.sendMessage(message);
  }

  subscribe(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, new Set());
    }
    this.messageHandlers.get(eventType).add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(eventType);
        }
      }
    };
  }

  notifyHandlers(eventType, data) {
    console.log('*** notifyHandlers called ***');
    console.log('Event type:', eventType);
    console.log('Available handlers:', Array.from(this.messageHandlers.keys()));
    
    const handlers = this.messageHandlers.get(eventType);
    console.log('Handlers for', eventType, ':', handlers ? handlers.size : 0);
    
    if (handlers) {
      console.log('*** Calling', handlers.size, 'handlers for', eventType, '***');
      handlers.forEach((handler, index) => {
        try {
          console.log('*** Calling handler', index, 'for', eventType, '***');
          handler(data);
          console.log('*** Handler', index, 'completed successfully ***');
        } catch (error) {
          console.error('Error in message handler', index, ':', error);
        }
      });
    } else {
      console.log('*** No handlers registered for event type:', eventType, '***');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  isConnected() {
    const connected = this.ws && this.ws.readyState === WebSocket.OPEN;
    if (!connected) {
      console.log('WebSocket connection check - Connected:', connected, 'ReadyState:', this.ws?.readyState);
    }
    return connected;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;