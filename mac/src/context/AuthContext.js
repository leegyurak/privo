import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for stored auth token on app start
    const storedToken = localStorage.getItem('privo_token');
    const storedUser = localStorage.getItem('privo_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      
      // Mock API call - replace with actual API endpoint
      const response = await mockLogin(credentials);
      
      const { user: userData, token: authToken } = response;
      
      setUser(userData);
      setToken(authToken);
      
      // Store in localStorage
      localStorage.setItem('privo_token', authToken);
      localStorage.setItem('privo_user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      // Mock API call - replace with actual API endpoint
      const response = await mockRegister(userData);
      
      const { user: newUser, token: authToken } = response;
      
      setUser(newUser);
      setToken(authToken);
      
      // Store in localStorage
      localStorage.setItem('privo_token', authToken);
      localStorage.setItem('privo_user', JSON.stringify(newUser));
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('privo_token');
    localStorage.removeItem('privo_user');
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock API functions - replace with actual API calls
const mockLogin = async (credentials) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (credentials.nickname && credentials.password) {
        resolve({
          user: {
            id: '1',
            nickname: credentials.nickname,
            email: 'user@example.com'
          },
          token: 'mock-jwt-token-' + Date.now()
        });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 1000);
  });
};

const mockRegister = async (userData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userData.nickname && userData.email && userData.password) {
        resolve({
          user: {
            id: Date.now().toString(),
            nickname: userData.nickname,
            email: userData.email
          },
          token: 'mock-jwt-token-' + Date.now()
        });
      } else {
        reject(new Error('Registration failed'));
      }
    }, 1000);
  });
};