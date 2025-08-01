import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Search, Plus, Settings, MoreVertical, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WindowControls from '../components/WindowControls';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: ${({ theme }) => theme.colors.background.main};
`;

const Sidebar = styled.div`
  width: 320px;
  background: white;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.main};
`;

const Header = styled.div`
  padding: 1rem 1.25rem;
  padding-top: 2.5rem; /* Space for window controls */
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: white;
  -webkit-app-region: drag;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  -webkit-app-region: no-drag;
`;

const IconButton = styled.button`
  width: 36px;
  height: 36px;
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
  -webkit-app-region: no-drag;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.background.main};
  font-size: 0.875rem;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: white;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.light};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.light};
  pointer-events: none;
`;

const ChatList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ChatItem = styled(motion.div)`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background: white;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ChatItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
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
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
`;

const LastMessage = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Timestamp = styled.div`
  color: ${({ theme }) => theme.colors.text.light};
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
`;

const UnreadBadge = styled.div`
  background: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 20px;
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
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.main};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text.light};
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const EmptyStateText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ChatListScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);

  // Mock data for demonstration
  useEffect(() => {
    const mockChats = [
      {
        id: '1',
        name: 'Alice Johnson',
        lastMessage: '안녕! 오늘 어떻게 지내세요?',
        timestamp: '2m',
        unreadCount: 2,
        isOnline: true,
        avatar: 'AJ'
      },
      {
        id: '2',
        name: 'Dev Team',
        lastMessage: '새 기능이 테스트 준비가 완료되었습니다',
        timestamp: '1h',
        unreadCount: 0,
        isOnline: false,
        avatar: 'DT'
      },
      {
        id: '3',
        name: 'Bob Smith',
        lastMessage: '프로젝트 도움 감사합니다!',
        timestamp: '3h',
        unreadCount: 1,
        isOnline: true,
        avatar: 'BS'
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        lastMessage: '내일 회의 일정을 잡을 수 있을까요?',
        timestamp: '1d',
        unreadCount: 0,
        isOnline: false,
        avatar: 'SW'
      }
    ];

    setChats(mockChats);
  }, []);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatClick = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <Container>
      <WindowControls />
      <Sidebar>
        <Header>
          <HeaderTop>
            <Title>채팅</Title>
            <HeaderActions>
              <IconButton title="새 채팅">
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
          {filteredChats.map((chat, index) => (
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
          ))}
        </ChatList>
      </Sidebar>

      <MainContent>
        <EmptyState>
          <EmptyStateIcon>
            <MessageCircle size={40} />
          </EmptyStateIcon>
          <EmptyStateTitle>대화 선택</EmptyStateTitle>
          <EmptyStateText>
기존 대화에서 선택하거나 새로운 대화를 시작하세요.
          </EmptyStateText>
        </EmptyState>
      </MainContent>
    </Container>
  );
};

export default ChatListScreen;