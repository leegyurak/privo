// Electron 환경에서만 ipcRenderer 사용

/**
 * macOS Keychain을 활용한 보안 저장소 서비스
 * 메시지를 암호화하여 안전하게 저장/조회
 */
class SecureStorageService {
  constructor() {
    this.serviceName = 'privo-chat';
    this.isElectron = typeof window !== 'undefined' && window.ipcRenderer;
  }

  /**
   * Keychain에서 암호화 키 가져오기 또는 생성
   */
  async getOrCreateEncryptionKey(userId) {
    if (!this.isElectron) {
      console.warn('Secure storage only available in Electron environment');
      return null;
    }

    try {
      const keyName = `privo-encryption-key-${userId}`;
      
      // 기존 키 조회 시도
      let encryptionKey = await window.ipcRenderer.invoke('keychain-get', this.serviceName, keyName);
      
      if (!encryptionKey) {
        // 새 암호화 키 생성 (256비트)
        const keyArray = new Uint8Array(32);
        crypto.getRandomValues(keyArray);
        encryptionKey = Array.from(keyArray).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Keychain에 저장
        await window.ipcRenderer.invoke('keychain-set', this.serviceName, keyName, encryptionKey);
        console.log('New encryption key created and stored in Keychain');
      }
      
      return encryptionKey;
    } catch (error) {
      console.error('Failed to get/create encryption key:', error);
      throw error;
    }
  }

  /**
   * 메시지 암호화
   */
  async encryptMessage(message, encryptionKey) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      
      // 암호화 키를 CryptoKey로 변환
      const keyBytes = new Uint8Array(encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // IV 생성
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // 암호화
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        data
      );
      
      // IV와 암호화된 데이터를 결합
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Base64로 인코딩
      return btoa(String.fromCharCode.apply(null, combined));
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }

  /**
   * 메시지 복호화
   */
  async decryptMessage(encryptedData, encryptionKey) {
    try {
      // 입력 데이터 검증
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format');
      }
      
      // Base64 문자열 유효성 검사
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(encryptedData)) {
        throw new Error('Invalid Base64 format');
      }
      
      // Base64 디코딩 (안전한 방식)
      let combined;
      try {
        const binaryString = atob(encryptedData);
        combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          combined[i] = binaryString.charCodeAt(i);
        }
      } catch (error) {
        throw new Error('Base64 decoding failed: ' + error.message);
      }
      
      // 최소 크기 검증 (IV 12바이트 + 암호화된 데이터)
      if (combined.length < 13) {
        throw new Error('Encrypted data too short');
      }
      
      // IV와 암호화된 데이터 분리
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // 암호화 키를 CryptoKey로 변환
      const keyBytes = new Uint8Array(encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 복호화
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encrypted
      );
      
      // JSON 파싱
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Message decryption failed:', error);
      console.error('Encrypted data length:', encryptedData?.length);
      console.error('Encrypted data preview:', encryptedData?.substring(0, 50) + '...');
      throw error;
    }
  }

  /**
   * 사용자별 데이터베이스 파일 경로 생성
   */
  getDatabasePath(userId) {
    if (!this.isElectron) {
      return null;
    }
    
    // macOS Application Support 디렉토리 사용
    return `~/Library/Application Support/Privo/messages_${userId}.db`;
  }

  /**
   * 암호화된 메시지를 로컬 데이터베이스에 저장
   */
  async saveMessage(userId, chatRoomId, message) {
    if (!this.isElectron) {
      console.warn('Local storage not available in web environment');
      return;
    }

    try {
      const encryptionKey = await this.getOrCreateEncryptionKey(userId);
      const encryptedMessage = await this.encryptMessage(message, encryptionKey);
      const dbPath = this.getDatabasePath(userId);
      
      await window.ipcRenderer.invoke('db-save-message', {
        dbPath,
        chatRoomId,
        messageId: message.id,
        encryptedData: encryptedMessage,
        timestamp: message.timestamp || new Date().toISOString(),
        senderId: message.senderId,
        messageType: message.messageType || 'TEXT'
      });
      
      console.log('Message saved to secure local storage:', message.id);
    } catch (error) {
      console.error('Failed to save message to local storage:', error);
    }
  }

  /**
   * 채팅방의 메시지들을 로컬 데이터베이스에서 조회
   * 기본적으로 최신 20개 메시지를 먼저 로드
   */
  async getMessages(userId, chatRoomId, limit = 20, offset = 0) {
    if (!this.isElectron) {
      console.warn('Local storage not available in web environment');
      return [];
    }

    try {
      const encryptionKey = await this.getOrCreateEncryptionKey(userId);
      const dbPath = this.getDatabasePath(userId);
      
      const encryptedMessages = await window.ipcRenderer.invoke('db-get-messages', {
        dbPath,
        chatRoomId,
        limit,
        offset
      });
      
      // 메시지 복호화
      const messages = await Promise.all(
        encryptedMessages.map(async (row) => {
          try {
            // 기본 행 데이터 유효성 검사
            if (!row || typeof row !== 'object') {
              console.warn('Invalid row data:', row);
              return null; // 완전히 손상된 데이터는 제외
            }

            // 필수 필드 유효성 검사 - 데이터베이스 필드명은 snake_case
            const messageId = row.message_id || row.messageId || `corrupted_${Date.now()}_${Math.random()}`;
            const senderId = row.sender_id || row.senderId || 'unknown';
            
            // timestamp 안전한 처리
            let timestamp;
            const rawTimestamp = row.timestamp;
            if (rawTimestamp && rawTimestamp !== 'Invalid Date') {
              try {
                const date = new Date(rawTimestamp);
                timestamp = isNaN(date.getTime()) ? new Date().toISOString() : rawTimestamp;
              } catch (error) {
                timestamp = new Date().toISOString();
              }
            } else {
              timestamp = new Date().toISOString();
            }
            
            const encryptedData = row.encrypted_data || row.encryptedData;
            const messageType = row.message_type || row.messageType || 'TEXT';
            
            // 암호화된 데이터 유효성 검사
            if (!encryptedData || typeof encryptedData !== 'string') {
              console.warn('Invalid encrypted data for message:', messageId, 'encryptedData:', encryptedData);
              console.warn('Full row data:', row);
              return {
                id: messageId,
                text: '[손상된 메시지 데이터]',
                senderId: senderId,
                senderName: 'Unknown',
                timestamp: timestamp,
                messageType: messageType,
                isCorrupted: true
              };
            }
            
            const decryptedMessage = await this.decryptMessage(encryptedData, encryptionKey);
            return {
              ...decryptedMessage,
              id: messageId,
              timestamp: timestamp,
              senderId: senderId,
              messageType: messageType
            };
          } catch (error) {
            console.warn('Failed to decrypt message, skipping:', row?.message_id || row?.messageId || 'unknown', error.message);
            console.warn('Row data:', row);
            
            // 복호화 실패한 메시지에 대한 플레이스홀더 반환 - 안전한 필드 접근 (snake_case 우선)
            const safeMessageId = row?.message_id || row?.messageId || `decrypt_failed_${Date.now()}_${Math.random()}`;
            const safeSenderId = row?.sender_id || row?.senderId || 'unknown';
            const safeTimestamp = row?.timestamp || new Date().toISOString();
            const safeMessageType = row?.message_type || row?.messageType || 'TEXT';
            
            return {
              id: safeMessageId,
              text: '[복호화 실패한 메시지]',
              senderId: safeSenderId,
              senderName: 'Unknown',
              timestamp: safeTimestamp,
              messageType: safeMessageType,
              isCorrupted: true
            };
          }
        })
      );
      
      return messages.filter(msg => msg !== null);
    } catch (error) {
      console.error('Failed to get messages from local storage:', error);
      return [];
    }
  }

  /**
   * 채팅방의 메시지 개수 조회
   */
  async getMessageCount(userId, chatRoomId) {
    if (!this.isElectron) {
      return 0;
    }

    try {
      const dbPath = this.getDatabasePath(userId);
      return await window.ipcRenderer.invoke('db-get-message-count', {
        dbPath,
        chatRoomId
      });
    } catch (error) {
      console.error('Failed to get message count:', error);
      return 0;
    }
  }

  /**
   * 특정 메시지가 이미 저장되어 있는지 확인
   */
  async messageExists(userId, messageId) {
    if (!this.isElectron) {
      return false;
    }

    try {
      const dbPath = this.getDatabasePath(userId);
      return await window.ipcRenderer.invoke('db-message-exists', {
        dbPath,
        messageId
      });
    } catch (error) {
      console.error('Failed to check message existence:', error);
      return false;
    }
  }

  /**
   * 오래된 메시지 정리 (보안을 위해 일정 기간 후 삭제)
   */
  async cleanupOldMessages(userId, daysToKeep = 30) {
    if (!this.isElectron) {
      return;
    }

    try {
      const dbPath = this.getDatabasePath(userId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      await window.ipcRenderer.invoke('db-cleanup-messages', {
        dbPath,
        cutoffDate: cutoffDate.toISOString()
      });
      
      console.log(`Cleaned up messages older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to cleanup old messages:', error);
    }
  }

  /**
   * 손상된 메시지 정리 (복호화 실패한 메시지들 삭제)
   */
  async cleanupCorruptedMessages(userId) {
    if (!this.isElectron) {
      return;
    }

    try {
      console.log('Starting cleanup of corrupted messages...');
      const dbPath = this.getDatabasePath(userId);
      
      // 모든 메시지를 가져와서 복호화 테스트
      const allMessages = await window.ipcRenderer.invoke('db-get-all-messages', { dbPath });
      const encryptionKey = await this.getOrCreateEncryptionKey(userId);
      
      let deletedCount = 0;
      
      for (const row of allMessages) {
        try {
          await this.decryptMessage(row.encryptedData, encryptionKey);
        } catch (error) {
          // 복호화 실패한 메시지 삭제
          await window.ipcRenderer.invoke('db-delete-message', {
            dbPath,
            messageId: row.messageId
          });
          deletedCount++;
          console.log('Deleted corrupted message:', row.messageId);
        }
      }
      
      console.log(`Cleanup completed. Deleted ${deletedCount} corrupted messages.`);
    } catch (error) {
      console.error('Failed to cleanup corrupted messages:', error);
    }
  }

  /**
   * 사용자 데이터 완전 삭제 (로그아웃 시)
   */
  async deleteUserData(userId) {
    if (!this.isElectron) {
      return;
    }

    try {
      // 데이터베이스 파일 삭제
      const dbPath = this.getDatabasePath(userId);
      await window.ipcRenderer.invoke('db-delete', dbPath);
      
      // Keychain에서 암호화 키 삭제
      const keyName = `privo-encryption-key-${userId}`;
      await window.ipcRenderer.invoke('keychain-delete', this.serviceName, keyName);
      
      console.log('User data completely deleted');
    } catch (error) {
      console.error('Failed to delete user data:', error);
    }
  }

  /**
   * 현재 사용자의 모든 로컬 메시지 데이터 재설정 (손상된 데이터 정리용)
   */
  async resetUserMessages(userId) {
    if (!this.isElectron) {
      console.warn('Local storage reset not available in web environment');
      return;
    }

    try {
      console.log('Resetting all local message data for user:', userId);
      
      // 데이터베이스 파일 삭제 (메시지만)
      const dbPath = this.getDatabasePath(userId);
      await window.ipcRenderer.invoke('db-delete', dbPath);
      
      // 암호화 키는 유지 (새로운 메시지를 위해)
      console.log('Local message data reset completed');
      
      return true;
    } catch (error) {
      console.error('Failed to reset user messages:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const secureStorage = new SecureStorageService();
export default secureStorage;