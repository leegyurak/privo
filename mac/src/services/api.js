import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('privo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('privo_token');
      localStorage.removeItem('privo_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', {
      nickname: userData.nickname,
      password: userData.password,
      publicKey: userData.publicKey
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  generateNickname: async () => {
    const response = await api.get('/auth/generate-nickname');
    return response.data;
  },

};

// Chat API
export const chatAPI = {
  getChatRooms: async () => {
    const response = await api.get('/chat/rooms');
    return response.data;
  },

  createChatRoom: async (name, memberUserIds = []) => {
    const response = await api.post('/chat/rooms', {
      name,
      isDirectMessage: false,
      memberUserIds
    });
    return response.data;
  },

  createDirectMessageRoom: async (recipientHashedId, name) => {
    const response = await api.post('/chat/rooms/direct-messages', {
      recipientHashedId,
      name
    });
    return response.data;
  },

  // 메시지 관련 API는 웹소켓으로만 처리됩니다
  // 메시지 전송은 WebSocket을 통해서만 가능합니다

  markAsRead: async (roomId, messageId) => {
    const response = await api.put(`/chat/rooms/${roomId}/messages/${messageId}/read`);
    return response.data;
  }
};

// User API
export const userAPI = {

  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },

  searchUsers: async (nickname) => {
    const response = await api.get(`/auth/user/${encodeURIComponent(nickname)}`);
    return response.data;
  },

  getUserByNickname: async (nickname) => {
    const response = await api.get(`/auth/user/${encodeURIComponent(nickname)}`);
    return response.data;
  }
};

// 오프라인 메시지는 웹소켓 연결 시 자동으로 전송됩니다

// Encryption API
export const encryptionAPI = {
  generateKeyPair: async () => {
    const response = await api.post('/encryption/keypair');
    return response.data;
  }
};

export default api;