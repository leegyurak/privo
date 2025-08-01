import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Lock, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: ${({ theme }) => theme.colors.primary.gradient};
  overflow: hidden;
`;

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  -webkit-app-region: drag;
`;

const RightPanel = styled(motion.div)`
  width: 420px;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.1);
  -webkit-app-region: no-drag;
`;

const BrandSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const BrandTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1rem;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
`;

const BrandSubtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const FormSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 3rem 2.5rem;
`;

const FormHeader = styled.div`
  margin-bottom: 2rem;
`;

const FormTitle = styled.h2`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const FormSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const Form = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled(motion.div)`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const InputContainer = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  padding-left: ${props => props.hasIcon ? '3rem' : '1rem'};
  padding-right: ${props => props.hasRightIcon ? '3rem' : '1rem'};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: white;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.light};
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.light};
  pointer-events: none;
`;

const InputRightIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.light};
  cursor: pointer;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.primary.gradient};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary.main};
  font-size: 0.875rem;
  cursor: pointer;
  text-align: center;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled(motion.div)`
  background: #fee;
  color: #c53030;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.875rem;
  margin-bottom: 1rem;
  border: 1px solid #fed7d7;
`;

const LoginScreen = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 랜덤 닉네임 생성 함수 (API 호출)
  const generateRandomNickname = async () => {
    try {
      const response = await authAPI.generateNickname();
      return response.nickname;
    } catch (error) {
      console.error('Failed to generate nickname:', error);
      // API 실패 시 폴백으로 로컬 생성
      const adjectives = ['빠른', '용감한', '똑똑한', '멋진', '친절한', '활발한', '조용한', '재미있는', '신비한', '행복한'];
      const nouns = ['호랑이', '독수리', '상어', '늑대', '여우', '사자', '팬더', '고래', '치타', '펭귄'];
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(Math.random() * 1000);
      return `${randomAdj}${randomNoun}${randomNum}`;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login({
          nickname: formData.nickname,
          password: formData.password
        });
      } else {
        result = await register({
          nickname: formData.nickname,
          password: formData.password
        });
      }

      if (result.success) {
        navigate('/chats');
      } else {
        setError(result.error || '인증에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      setError('인증에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <LeftPanel>
        <BrandSection>
          <BrandTitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Privo
          </BrandTitle>
          <BrandSubtitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            설계부터 보호되는 대화
          </BrandSubtitle>
        </BrandSection>
      </LeftPanel>

      <RightPanel
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
      >
        <FormSection>
          <FormHeader>
            <FormTitle>
              {isLogin ? '다시 오신 것을 환영합니다' : '계정 만들기'}
            </FormTitle>
            <FormSubtitle>
              {isLogin 
                ? '계속하려면 계정에 로그인하세요' 
                : 'Privo에 가입하여 안전한 메시징을 시작하세요'
              }
            </FormSubtitle>
          </FormHeader>

          <Form onSubmit={handleSubmit}>
            {error && (
              <ErrorMessage
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </ErrorMessage>
            )}

            <FormGroup
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label>닉네임</Label>
              <InputContainer>
                <InputIcon>
                  <User size={18} />
                </InputIcon>
                <Input
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  hasIcon
                  hasRightIcon
                  required
                />
                <InputRightIcon onClick={async () => {
                  const nickname = await generateRandomNickname();
                  handleInputChange('nickname', nickname);
                }}>
                  <Shuffle size={18} />
                </InputRightIcon>
              </InputContainer>
            </FormGroup>


            <FormGroup
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label>비밀번호</Label>
              <InputContainer>
                <InputIcon>
                  <Lock size={18} />
                </InputIcon>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  hasIcon
                  hasRightIcon
                  required
                />
                <InputRightIcon onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </InputRightIcon>
              </InputContainer>
            </FormGroup>

            <Button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? '잠시만 기다려주세요...' : (isLogin ? '로그인' : '계정 생성')}
            </Button>

            <ToggleButton
              type="button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin 
                ? "계정이 없으신가요? 회원가입" 
                : "이미 계정이 있으신가요? 로그인"
              }
            </ToggleButton>
          </Form>
        </FormSection>
      </RightPanel>
    </Container>
  );
};

export default LoginScreen;