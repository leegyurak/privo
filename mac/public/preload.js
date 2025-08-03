const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Dialog methods
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Preferences
  onShowPreferences: (callback) => {
    ipcRenderer.on('show-preferences', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Secure storage API - only expose what's needed
contextBridge.exposeInMainWorld('secureStorageAPI', {
  // Keychain operations
  keychainGet: (service, account) => ipcRenderer.invoke('keychain-get', service, account),
  keychainSet: (service, account, password) => ipcRenderer.invoke('keychain-set', service, account, password),
  keychainDelete: (service, account) => ipcRenderer.invoke('keychain-delete', service, account),
  
  // Database operations
  dbSaveMessage: (data) => ipcRenderer.invoke('db-save-message', data),
  dbGetMessages: (data) => ipcRenderer.invoke('db-get-messages', data),
  dbGetMessageCount: (data) => ipcRenderer.invoke('db-get-message-count', data),
  dbMessageExists: (data) => ipcRenderer.invoke('db-message-exists', data),
  dbCleanupMessages: (data) => ipcRenderer.invoke('db-cleanup-messages', data),
  dbDelete: (dbPath) => ipcRenderer.invoke('db-delete', dbPath)
});

// For compatibility with existing code, also expose ipcRenderer with limited methods
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => {
    // Only allow specific channels for security
    const allowedChannels = [
      'keychain-get', 'keychain-set', 'keychain-delete',
      'db-save-message', 'db-get-messages', 'db-get-message-count',
      'db-message-exists', 'db-cleanup-messages', 'db-delete'
    ];
    
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      throw new Error(`IPC channel '${channel}' not allowed`);
    }
  }
});