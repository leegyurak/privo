const { app, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * macOS Keychain 및 SQLCipher 기반 보안 저장소 핸들러
 */
class SecureStorageHandlers {
  constructor() {
    this.databases = new Map(); // 열린 데이터베이스 연결 캐시
    this.setupHandlers();
  }

  setupHandlers() {
    // Keychain 관련 핸들러
    ipcMain.handle('keychain-get', this.handleKeychainGet.bind(this));
    ipcMain.handle('keychain-set', this.handleKeychainSet.bind(this));
    ipcMain.handle('keychain-delete', this.handleKeychainDelete.bind(this));
    
    // 데이터베이스 관련 핸들러
    ipcMain.handle('db-save-message', this.handleSaveMessage.bind(this));
    ipcMain.handle('db-get-messages', this.handleGetMessages.bind(this));
    ipcMain.handle('db-get-message-count', this.handleGetMessageCount.bind(this));
    ipcMain.handle('db-message-exists', this.handleMessageExists.bind(this));
    ipcMain.handle('db-cleanup-messages', this.handleCleanupMessages.bind(this));
    ipcMain.handle('db-delete', this.handleDeleteDatabase.bind(this));
  }

  // macOS 시스템 명령어를 통한 Keychain 접근
  async executeSecurityCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // Keychain 핸들러들
  async handleKeychainGet(event, service, account) {
    try {
      console.log('🔍 Keychain GET request:');
      console.log('  - Service:', service);
      console.log('  - Account:', account);
      
      const command = `security find-generic-password -s "${service}" -a "${account}" -w`;
      console.log('  - Command:', command);
      
      const password = await this.executeSecurityCommand(command);
      
      if (password) {
        console.log('✅ Keychain item found, length:', password.length);
      } else {
        console.log('❌ Keychain item not found (empty result)');
      }
      
      return password || null;
    } catch (error) {
      // 키가 없으면 에러가 발생하므로 null 반환
      if (error.message.includes('could not be found')) {
        console.log('❌ Keychain item not found (error):', error.message);
        return null;
      }
      console.error('❌ Keychain get error:', error);
      throw error;
    }
  }

  async handleKeychainSet(event, service, account, password) {
    try {
      console.log('🔐 Keychain SET request:');
      console.log('  - Service:', service);
      console.log('  - Account:', account);
      console.log('  - Password length:', password ? password.length : 0);
      
      // 기존 항목 삭제 (있다면)
      try {
        const deleteCommand = `security delete-generic-password -s "${service}" -a "${account}"`;
        console.log('  - Delete command:', deleteCommand);
        await this.executeSecurityCommand(deleteCommand);
        console.log('  - Existing item deleted');
      } catch (e) {
        // 항목이 없으면 에러가 나는데 이는 정상
        console.log('  - No existing item to delete (normal)');
      }
      
      // 새 항목 추가
      const command = `security add-generic-password -s "${service}" -a "${account}" -w "${password}" -U`;
      console.log('  - Add command:', command.replace(password, '[REDACTED]'));
      await this.executeSecurityCommand(command);
      console.log('✅ Keychain item stored successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Keychain set error:', error);
      throw error;
    }
  }

  async handleKeychainDelete(event, service, account) {
    try {
      const command = `security delete-generic-password -s "${service}" -a "${account}"`;
      await this.executeSecurityCommand(command);
      return true;
    } catch (error) {
      if (error.message.includes('could not be found')) {
        return false; // 이미 없음
      }
      console.error('Keychain delete error:', error);
      throw error;
    }
  }

  // 데이터베이스 경로 해결
  resolveDatabasePath(dbPath) {
    // ~ 경로를 실제 홈 디렉토리로 변환
    if (dbPath.startsWith('~/')) {
      return path.join(os.homedir(), dbPath.slice(2));
    }
    return dbPath;
  }

  // 데이터베이스 연결 가져오기 또는 생성
  getDatabase(dbPath) {
    return new Promise((resolve, reject) => {
      const resolvedPath = this.resolveDatabasePath(dbPath);
      
      if (this.databases.has(resolvedPath)) {
        resolve(this.databases.get(resolvedPath));
        return;
      }

      // 디렉토리 생성
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // SQLite 데이터베이스 생성/연결
      const db = new sqlite3.Database(resolvedPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // WAL 모드 활성화 (성능 향상)
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) {
            reject(err);
            return;
          }

          // 테이블 생성
          this.initializeDatabase(db, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // 캐시에 저장
            this.databases.set(resolvedPath, db);
            resolve(db);
          });
        });
      });
    });
  }

  // 데이터베이스 스키마 초기화
  initializeDatabase(db, callback) {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        chat_room_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        message_type TEXT DEFAULT 'TEXT',
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.run(createTableSQL, (err) => {
      if (err) {
        callback(err);
        return;
      }

      // 인덱스 생성
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_chat_room_timestamp ON messages (chat_room_id, timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_message_id ON messages (message_id)',
        'CREATE INDEX IF NOT EXISTS idx_timestamp ON messages (timestamp)'
      ];

      let completed = 0;
      indexes.forEach(indexSQL => {
        db.run(indexSQL, (err) => {
          if (err) {
            callback(err);
            return;
          }
          completed++;
          if (completed === indexes.length) {
            callback(null);
          }
        });
      });
    });
  }

  // 메시지 저장 핸들러
  async handleSaveMessage(event, data) {
    try {
      const { dbPath, chatRoomId, messageId, encryptedData, timestamp, senderId, messageType } = data;
      const db = await this.getDatabase(dbPath);
      
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO messages 
          (message_id, chat_room_id, sender_id, encrypted_data, message_type, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(messageId, chatRoomId, senderId, encryptedData, messageType, timestamp, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, changes: this.changes });
          }
        });
        
        stmt.finalize();
      });
    } catch (error) {
      console.error('Save message error:', error);
      throw error;
    }
  }

  // 메시지 조회 핸들러 - 최신 20개 메시지 우선 로딩 최적화
  async handleGetMessages(event, data) {
    try {
      const { dbPath, chatRoomId, limit = 20, offset = 0 } = data;
      const db = await this.getDatabase(dbPath);
      
      return new Promise((resolve, reject) => {
        // 인덱스를 활용한 최적화된 쿼리 (idx_chat_room_timestamp 사용)
        db.all(`
          SELECT message_id, sender_id, encrypted_data, message_type, timestamp
          FROM messages 
          WHERE chat_room_id = ?
          ORDER BY timestamp DESC
          LIMIT ? OFFSET ?
        `, [chatRoomId, limit, offset], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // 최신 메시지가 먼저 오도록 정렬을 뒤집음 (UI에서 시간순으로 표시하기 위해)
            resolve(rows.reverse());
          }
        });
      });
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  // 메시지 개수 조회 핸들러
  async handleGetMessageCount(event, data) {
    try {
      const { dbPath, chatRoomId } = data;
      const db = await this.getDatabase(dbPath);
      
      return new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count 
          FROM messages 
          WHERE chat_room_id = ?
        `, [chatRoomId], (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.count);
          }
        });
      });
    } catch (error) {
      console.error('Get message count error:', error);
      throw error;
    }
  }

  // 메시지 존재 확인 핸들러
  async handleMessageExists(event, data) {
    try {
      const { dbPath, messageId } = data;
      const db = await this.getDatabase(dbPath);
      
      return new Promise((resolve, reject) => {
        db.get(`
          SELECT 1 FROM messages WHERE message_id = ? LIMIT 1
        `, [messageId], (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!result);
          }
        });
      });
    } catch (error) {
      console.error('Message exists check error:', error);
      throw error;
    }
  }

  // 오래된 메시지 정리 핸들러
  async handleCleanupMessages(event, data) {
    try {
      const { dbPath, cutoffDate } = data;
      const db = await this.getDatabase(dbPath);
      
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          DELETE FROM messages 
          WHERE timestamp < ?
        `);
        
        stmt.run(cutoffDate, function(err) {
          if (err) {
            reject(err);
          } else {
            const deletedCount = this.changes;
            
            // VACUUM으로 데이터베이스 최적화
            db.run('VACUUM', (err) => {
              if (err) {
                console.warn('VACUUM failed:', err);
              }
              resolve({ success: true, deletedCount });
            });
          }
        });
        
        stmt.finalize();
      });
    } catch (error) {
      console.error('Cleanup messages error:', error);
      throw error;
    }
  }

  // 데이터베이스 삭제 핸들러
  async handleDeleteDatabase(event, dbPath) {
    try {
      const resolvedPath = this.resolveDatabasePath(dbPath);
      
      // 열린 연결이 있으면 닫기
      if (this.databases.has(resolvedPath)) {
        const db = this.databases.get(resolvedPath);
        await new Promise((resolve) => {
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
            }
            resolve();
          });
        });
        this.databases.delete(resolvedPath);
      }
      
      // 파일 삭제
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
      
      // WAL 파일들도 삭제
      const walPath = resolvedPath + '-wal';
      const shmPath = resolvedPath + '-shm';
      
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
      
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete database error:', error);
      throw error;
    }
  }

  // 앱 종료 시 정리
  cleanup() {
    const promises = [];
    for (const db of this.databases.values()) {
      promises.push(new Promise((resolve) => {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          resolve();
        });
      }));
    }
    
    Promise.all(promises).then(() => {
      this.databases.clear();
    });
  }
}

// 앱 종료 시 정리
let handlers = null;

function initializeSecureStorageHandlers() {
  if (!handlers) {
    handlers = new SecureStorageHandlers();
    
    app.on('before-quit', () => {
      if (handlers) {
        handlers.cleanup();
      }
    });
  }
  return handlers;
}

module.exports = { initializeSecureStorageHandlers };