import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, MessageCircle, Loader2 } from 'lucide-react';
import { userAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal};
  backdrop-filter: blur(4px);
`;

const Modal = styled(motion.div)`
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  background: ${({ theme }) => theme.colors.background.surface};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: between;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  flex: 1;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
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

const SearchContainer = styled.div`
  position: relative;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.background.main};
  font-size: 0.875rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: ${({ theme }) => theme.colors.background.surface};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.light};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.light};
  pointer-events: none;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: 400px;
`;

const UserList = styled.div`
  padding: 0.5rem 0;
`;

const UserItem = styled(motion.div)`
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
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
  color: ${({ theme }) => theme.colors.text.white};
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.95rem;
  margin-bottom: 0.125rem;
`;

const UserNickname = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8rem;
`;

const ActionButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.text.white};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary.dark};
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.main};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text.light};
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  gap: 0.5rem;
`;

const LoadingIcon = styled(motion.div)`
  color: ${({ theme }) => theme.colors.primary.main};
`;

const UserSearchModal = ({ isOpen, onClose, onCreateChat }) => {
  const { user: currentUser } = useAuth();
  const { createDirectMessageRoom } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [creatingChat, setCreatingChat] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery.trim());
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchUsers = async (query) => {
    try {
      setIsLoading(true);
      setHasSearched(true);
      
      console.log('🔍 Searching for user:', query);
      const response = await userAPI.searchUsers(query);
      console.log('🔍 Search API response:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Is array?', Array.isArray(response));
      
      // 응답이 단일 사용자 객체인 경우 배열로 변환
      const users = Array.isArray(response) ? response : (response ? [response] : []);
      console.log('🔍 Processed users:', users);
      
      setSearchResults(users);
    } catch (error) {
      console.error('❌ Failed to search users:', error);
      console.error('❌ Error details:', error.response?.data);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (user) => {
    try {
      setCreatingChat(user.id || user.userId);
      
      console.log('Creating chat with user:', user);
      
      // Use the userId from the search response as recipientHashedId
      const recipientHashedId = user.userId || user.id;
      
      if (!recipientHashedId) {
        throw new Error('User ID not found');
      }
      
      // Create direct message room
      const response = await createDirectMessageRoom(recipientHashedId, user.nickname);
      
      console.log('Started DM:', response);
      
      // Call the parent callback with the chat room ID
      if (onCreateChat) {
        onCreateChat(response.chatRoomId || response.id);
      }
      
      // Close modal and reset state
      handleClose();
    } catch (error) {
      console.error('Failed to start DM:', error);
      alert('채팅 시작에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCreatingChat(null);
    }
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setCreatingChat(null);
  };

  const getAvatarText = (nickname) => {
    if (!nickname) return '?';
    return nickname.substring(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <Modal
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title>새 채팅 시작</Title>
              <CloseButton onClick={handleClose}>
                <X size={18} />
              </CloseButton>
            </Header>

            <SearchContainer>
              <SearchIcon>
                <Search size={16} />
              </SearchIcon>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder="닉네임으로 사용자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchContainer>

            <Content>
              {isLoading ? (
                <LoadingState>
                  <LoadingIcon
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={20} />
                  </LoadingIcon>
                  검색 중...
                </LoadingState>
              ) : searchResults.length > 0 ? (
                <UserList>
                  {searchResults.map((user, index) => (
                    <UserItem
                      key={user.id || user.userId}
                      onClick={() => handleUserSelect(user)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Avatar>{getAvatarText(user.nickname)}</Avatar>
                      <UserInfo>
                        <UserName>{user.nickname}</UserName>
                        <UserNickname>@{user.nickname}</UserNickname>
                      </UserInfo>
                      <ActionButton disabled={creatingChat === (user.id || user.userId)}>
                        {creatingChat === (user.id || user.userId) ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 size={18} />
                          </motion.div>
                        ) : (
                          <MessageCircle size={18} />
                        )}
                      </ActionButton>
                    </UserItem>
                  ))}
                </UserList>
              ) : hasSearched ? (
                <EmptyState>
                  <EmptyIcon>
                    <User size={24} />
                  </EmptyIcon>
                  <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                    사용자를 찾을 수 없습니다
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    정확한 닉네임을 입력해주세요
                  </div>
                </EmptyState>
              ) : (
                <EmptyState>
                  <EmptyIcon>
                    <Search size={24} />
                  </EmptyIcon>
                  <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                    사용자 검색
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    닉네임을 입력하여 채팅할 사용자를 찾아보세요
                  </div>
                </EmptyState>
              )}
            </Content>
          </Modal>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default UserSearchModal;