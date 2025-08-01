import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import GlobalStyles from './styles/GlobalStyles';
import theme from './styles/theme';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';

// Context
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AuthProvider>
        <ChatProvider>
          {/* Use HashRouter in Electron (file://), BrowserRouter otherwise */}
          {window.location.protocol === 'file:' ? (
            <HashRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/splash" replace />} />
                <Route path="/splash" element={<SplashScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/chats" element={<ChatListScreen />} />
                <Route path="/chat/:id" element={<ChatScreen />} />
              </Routes>
            </HashRouter>
          ) : (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/splash" replace />} />
                <Route path="/splash" element={<SplashScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/chats" element={<ChatListScreen />} />
                <Route path="/chat/:id" element={<ChatScreen />} />
              </Routes>
            </BrowserRouter>
          )}
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
