import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical, Phone, Video } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import WindowControls from '../components/WindowControls';

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
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.sent ? 'flex-end' : 'flex-start'};
  gap: 0.25rem;
`;

const Message = styled(motion.div)`
  max-width: 60%;
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
  position: relative;
  
  ${props => props.sent && `
    border-bottom-right-radius: 4px;
  `}
  
  ${props => !props.sent && `
    border-bottom-left-radius: 4px;
  `}
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.light};
  margin: ${props => props.sent ? '0 0.5rem 0 0' : '0 0 0 0.5rem'};
`;

const TypingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.chat.received};
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  max-width: 60%;
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
  const navigate = useNavigate();
  const { id } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockMessages = [
      {
        id: '1',
        text: 'Hey! How are you doing today?',
        sent: false,
        timestamp: '10:30 AM',
        delivered: true,
        read: true
      },
      {
        id: '2',
        text: 'I\'m doing great, thanks for asking! How about you?',
        sent: true,
        timestamp: '10:32 AM',
        delivered: true,
        read: true
      },
      {
        id: '3',
        text: 'Pretty good! Working on some exciting projects. Have you seen the latest updates to our app?',
        sent: false,
        timestamp: '10:35 AM',
        delivered: true,
        read: true
      },
      {
        id: '4',
        text: 'Yes! The new design looks amazing. Really love the smooth animations.',
        sent: true,
        timestamp: '10:37 AM',
        delivered: true,
        read: false
      }
    ];

    setMessages(mockMessages);

    // Simulate typing indicator
    const typingTimer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }, 2000);

    return () => clearTimeout(typingTimer);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      sent: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: false,
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, delivered: true }
            : msg
        )
      );
    }, 1000);
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
          AJ
          <OnlineStatus />
        </Avatar>
        
        <ChatInfo>
          <ChatName>Alice Johnson</ChatName>
          <ChatStatus>온라인</ChatStatus>
        </ChatInfo>
        
        <HeaderActions>
          <IconButton title="음성 통화">
            <Phone size={20} />
          </IconButton>
          <IconButton title="영상 통화">
            <Video size={20} />
          </IconButton>
          <IconButton title="더 많은 옵션">
            <MoreVertical size={20} />
          </IconButton>
        </HeaderActions>
      </Header>

      <MessagesContainer>
        {messages.map((msg, index) => (
          <MessageGroup key={msg.id} sent={msg.sent}>
            <Message
              sent={msg.sent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {msg.text}
            </Message>
            <MessageTime sent={msg.sent}>
              {msg.timestamp}
            </MessageTime>
          </MessageGroup>
        ))}

        {isTyping && (
          <TypingIndicator
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <span>Alice님이 입력 중입니다</span>
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
        <AttachButton title="파일 첨부">
          <Paperclip size={20} />
        </AttachButton>
        
        <InputArea>
          <MessageInput
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows="1"
          />
        </InputArea>

        <AttachButton title="이모다이콘 추가">
          <Smile size={20} />
        </AttachButton>
        
        <SendButton
          onClick={handleSendMessage}
          disabled={!message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send size={18} />
        </SendButton>
      </InputContainer>
    </Container>
  );
};

export default ChatScreen;