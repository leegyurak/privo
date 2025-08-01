const theme = {
  colors: {
    primary: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      main: '#667eea',
      dark: '#764ba2'
    },
    background: {
      main: '#f0f2f5',
      surface: '#ffffff',
      elevated: '#ffffff'
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
      light: '#999999',
      white: '#ffffff'
    },
    status: {
      online: '#10b981',
      away: '#f59e0b',
      offline: '#6b7280',
      success: '#4ade80',
      error: '#ef4444',
      warning: '#f59e0b'
    },
    chat: {
      sent: '#667eea',
      received: '#e5e7eb',
      sentText: '#ffffff',
      receivedText: '#333333'
    },
    border: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px'
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '50%'
  },
  
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.15)'
  },
  
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '600ms ease-in-out'
  },
  
  zIndex: {
    modal: 1000,
    overlay: 999,
    dropdown: 100,
    header: 50
  }
};

export default theme;