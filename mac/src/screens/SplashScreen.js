import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PrivoLogo from '../components/PrivoLogo';

const lockAnimation = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(0.95) rotate(-5deg); }
  50% { transform: scale(1.05) rotate(5deg); }
  75% { transform: scale(0.98) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const pulseAnimation = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  position: relative;
  overflow: hidden;
  -webkit-app-region: no-drag;
`;


const LockContainer = styled(motion.div)`
  position: relative;
  margin-bottom: 2rem;
  cursor: pointer;
  -webkit-app-region: no-drag;
`;

const LogoContainer = styled.div`
  width: 100px;
  height: 100px;
  background: ${({ theme }) => theme.colors.primary.gradient};
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  animation: ${lockAnimation} 0.6s ease-in-out;
`;

const LogoWrapper = styled.div`
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AppTitle = styled(motion.h1)`
  font-size: 2.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
`;

const AppSubtitle = styled(motion.p)`
  font-size: 1.125rem;
  color: #8b8b8b;
  margin-bottom: 3rem;
  text-align: center;
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingText = styled.span`
  color: #8b8b8b;
  font-size: 1rem;
  font-weight: 500;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 4px;
`;

const Dot = styled(motion.div)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b8b8b;
`;

const ClickPrompt = styled(motion.div)`
  position: absolute;
  bottom: 4rem;
  color: #8b8b8b;
  font-size: 0.875rem;
  text-align: center;
`;

const SplashScreen = () => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Auto-advance after 3 seconds if not clicked
    const timer = setTimeout(() => {
      if (!isAnimating) {
        handleLockClick();
      }
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating]);

  const handleLockClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowLoading(true);

    // Navigate to login after animation
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -10 },
  };

  return (
    <Container>
      <LockContainer
        onClick={handleLockClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <LogoContainer>
          <LogoWrapper>
            <PrivoLogo size={60} color="white" />
          </LogoWrapper>
        </LogoContainer>
      </LockContainer>

      <AppTitle
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Privo
      </AppTitle>

      <AppSubtitle
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        모두를 위한 보안 메시징
      </AppSubtitle>

      {showLoading && (
        <LoadingContainer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingText>로딩 중</LoadingText>
          <LoadingDots>
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
          </LoadingDots>
        </LoadingContainer>
      )}

      {!showLoading && (
        <ClickPrompt
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          로고를 클릭하여 계속하세요
        </ClickPrompt>
      )}
    </Container>
  );
};

export default SplashScreen;