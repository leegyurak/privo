import React from 'react';
import styled from 'styled-components';
import { Minus, Square, X } from 'lucide-react';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  -webkit-app-region: drag;
  background: transparent;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  pointer-events: none;
  width: auto;
  height: auto;
  
  * {
    pointer-events: auto;
  }
`;

const Button = styled.button`
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    opacity: 0.8;
  }

  svg {
    width: 6px;
    height: 6px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover svg {
    opacity: 1;
  }
`;

const CloseButton = styled(Button)`
  background: #ff5f57;
`;

const MinimizeButton = styled(Button)`
  background: #ffbd2e;
`;

const MaximizeButton = styled(Button)`
  background: #28ca42;
`;

const WindowControls = () => {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  // Only show on Electron
  if (!window.electronAPI) {
    return null;
  }

  return (
    <Container>
      <CloseButton onClick={handleClose} title="Close">
        <X />
      </CloseButton>
      <MinimizeButton onClick={handleMinimize} title="Minimize">
        <Minus />
      </MinimizeButton>
      <MaximizeButton onClick={handleMaximize} title="Maximize">
        <Square />
      </MaximizeButton>
    </Container>
  );
};

export default WindowControls;