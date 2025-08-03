import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import eventBus from '../utils/eventBus';
import cryptoService from '../services/cryptoService';

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
      
      // Call actual login API
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      
      // Extract token from response
      const authToken = response.accessToken;
      
      // Set token first so it can be used in subsequent API calls
      setToken(authToken);
      localStorage.setItem('privo_token', authToken);
      
      // Create user data from response
      const userData = {
        id: response.userId,
        nickname: credentials.nickname, // Store the nickname used for login
        tokenType: response.tokenType || 'Bearer',
        expiresIn: response.expiresIn
      };
      
      setUser(userData);
      localStorage.setItem('privo_user', JSON.stringify(userData));
      
      // 로그인 후 E2E 키 확인 (필수)
      try {
        const existingKey = await cryptoService.getPrivateKeyFromKeychain(userData.id);
        if (existingKey) {
          console.log('Existing E2E key found for user:', userData.id);
        } else {
          console.error('No E2E key found for user:', userData.id);
          
          // 키가 없으면 로그아웃 처리
          setUser(null);
          setToken(null);
          localStorage.removeItem('privo_token');
          localStorage.removeItem('privo_user');
          
          return {
            success: false,
            error: 'E2E 암호화 키를 찾을 수 없습니다. 키 없이는 서비스를 이용할 수 없습니다. 관리자에게 문의하거나 계정을 다시 생성해주세요.'
          };
        }
      } catch (error) {
        console.error('Failed to check existing E2E key:', error);
        
        // 키 확인 실패 시 로그아웃 처리
        setUser(null);
        setToken(null);
        localStorage.removeItem('privo_token');
        localStorage.removeItem('privo_user');
        
        return {
          success: false,
          error: 'E2E 암호화 키 확인에 실패했습니다. 다시 시도해주세요.'
        };
      }
      
      return { success: true, user: userData, token: authToken };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      // 1. E2E 암호화용 키 쌍 먼저 생성 (필수)
      console.log('Generating E2E encryption keys for new user...');
      let keyPairData;
      try {
        keyPairData = await cryptoService.generateKeyPair();
      } catch (keyError) {
        console.error('Failed to generate E2E keys:', keyError);
        return { 
          success: false, 
          error: 'E2E 암호화 키 생성에 실패했습니다. 키 생성 없이는 서비스를 이용할 수 없습니다.' 
        };
      }
      
      let response;
      try {
        // 2. 회원가입 API 호출 (공개키 포함)
        response = await authAPI.register({
          nickname: userData.nickname,
          password: userData.password,
          publicKey: keyPairData.publicKey
        });
        console.log('Register response:', response);
      } catch (registerError) {
        console.error('Register API error:', registerError);
        const errorMessage = registerError.response?.data?.error || registerError.message || 'Registration failed';
        return { success: false, error: errorMessage };
      }
      
      // 3. 응답에서 사용자 ID 추출 (디버깅)
      console.log('Register API response structure:', response);
      console.log('Available keys:', Object.keys(response));
      
      const tempUserId = response.userId || response.id;
      console.log('Extracted userId:', tempUserId);
      
      if (!tempUserId) {
        console.error('Failed to extract userId from response:', response);
        return {
          success: false,
          error: '사용자 ID를 받지 못했습니다. 회원가입에 실패했습니다.'
        };
      }
      
      // 4. 개인키를 Keychain에 안전하게 저장 (로그인 전에 미리 저장)
      try {
        await cryptoService.storePrivateKeyInKeychain(
          tempUserId, 
          keyPairData.privateKey, 
          keyPairData.keyId
        );
        
        console.log('Private key pre-stored before login');
      } catch (keyStoreError) {
        console.error('Failed to pre-store private key:', keyStoreError);
        
        return {
          success: false,
          error: '개인키 저장에 실패했습니다. 키 저장 없이는 서비스를 이용할 수 없습니다. 다시 시도해주세요.'
        };
      }
      
      // 5. 로그인하여 토큰 획득 (이제 키가 이미 저장되어 있음)
      const loginResult = await login({
        nickname: userData.nickname,
        password: userData.password
      });
      
      if (!loginResult.success) {
        // 로그인 실패 시 저장된 키 삭제
        try {
          await cryptoService.deleteUserKeys(tempUserId);
        } catch (cleanupError) {
          console.error('Failed to cleanup keys after login failure:', cleanupError);
        }
        
        return {
          success: false,
          error: '회원가입은 완료되었으나 로그인에 실패했습니다. 다시 로그인해주세요.'
        };
      }
      
      console.log('E2E encryption keys generated and stored successfully');
      
      return {
        ...loginResult,
        keyId: keyPairData.keyId
      };
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // 로그아웃 이벤트 발생 (ChatContext에서 로컬 데이터 정리)
      eventBus.emit('user:logout', { userId: user?.id });
      
      // 로그아웃 API 호출 (선택적)
      if (token) {
        try {
          await authAPI.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 로컬 상태 정리 (E2E 키는 유지)
      setUser(null);
      setToken(null);
      localStorage.removeItem('privo_token');
      localStorage.removeItem('privo_user');
    }
  };

  // 계정 완전 삭제 (모든 키와 데이터 삭제)
  const deleteAccount = async () => {
    try {
      if (!user?.id) {
        throw new Error('No user logged in');
      }

      // 1. 서버에서 계정 삭제 API 호출 (구현 필요)
      // await authAPI.deleteAccount();

      // 2. 로컬 데이터 모든 정리
      eventBus.emit('user:logout', { userId: user.id });

      // 3. E2E 키 완전 삭제
      await cryptoService.deleteUserKeys(user.id);

      // 4. 로컬 상태 정리
      setUser(null);
      setToken(null);
      localStorage.removeItem('privo_token');
      localStorage.removeItem('privo_user');

      console.log('Account completely deleted');
      return { success: true };
    } catch (error) {
      console.error('Failed to delete account:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    deleteAccount,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

