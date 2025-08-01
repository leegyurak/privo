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
    const response = await api.post('/auth/register', userData);
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
  }
};

// Chat API
export const chatAPI = {
  getChatRooms: async () => {
    const response = await api.get('/chat/rooms');
    return response.data;
  },

  createChatRoom: async (participantIds, name = null) => {
    const response = await api.post('/chat/rooms', {
      participantIds,
      name
    });
    return response.data;
  },

  getChatMessages: async (roomId, page = 0, size = 50) => {
    const response = await api.get(`/chat/rooms/${roomId}/messages`, {
      params: { page, size }
    });
    return response.data;
  },

  sendMessage: async (roomId, messageData) => {
    const response = await api.post(`/chat/rooms/${roomId}/messages`, messageData);
    return response.data;
  },

  sendDirectMessage: async (recipientId, messageData) => {
    const response = await api.post('/chat/direct-messages', {
      recipientId,
      ...messageData
    });
    return response.data;
  },

  markAsRead: async (roomId, messageId) => {
    const response = await api.put(`/chat/rooms/${roomId}/messages/${messageId}/read`);
    return response.data;
  }
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },

  searchUsers: async (query) => {
    const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};

export default api;