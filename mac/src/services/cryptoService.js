/**
 * End-to-End 암호화를 위한 키 쌍 생성 및 관리 서비스
 * WebCrypto API를 사용하여 RSA-OAEP 키 쌍 생성
 */
class CryptoService {
  constructor() {
    this.keyConfig = {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    };
    
    this.aesConfig = {
      name: 'AES-GCM',
      length: 256
    };
  }

  /**
   * 회원가입 시 E2E 암호화용 키 쌍 생성
   */
  async generateKeyPair() {
    try {
      console.log('Generating E2E encryption key pair...');
      
      // RSA-OAEP 키 쌍 생성
      const keyPair = await crypto.subtle.generateKey(
        this.keyConfig,
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // 공개키를 PEM 형식으로 내보내기
      const publicKeyArrayBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyPem = this.arrayBufferToPem(publicKeyArrayBuffer, 'PUBLIC KEY');

      // 개인키를 PKCS#8 형식으로 내보내기
      const privateKeyArrayBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyPem = this.arrayBufferToPem(privateKeyArrayBuffer, 'PRIVATE KEY');

      console.log('E2E key pair generated successfully');
      
      return {
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        keyId: this.generateKeyId()
      };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw error;
    }
  }

  /**
   * ArrayBuffer를 PEM 형식으로 변환
   */
  arrayBufferToPem(buffer, label) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const formatted = base64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN ${label}-----\n${formatted}\n-----END ${label}-----`;
  }

  /**
   * PEM 형식을 ArrayBuffer로 변환
   */
  pemToArrayBuffer(pem) {
    const base64 = pem
      .replace(/-----BEGIN[^-]+-----/, '')
      .replace(/-----END[^-]+-----/, '')
      .replace(/\s/g, '');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 키 ID 생성 (공개키 식별용)
   */
  generateKeyId() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 개인키를 Keychain에 저장
   */
  async storePrivateKeyInKeychain(userId, privateKeyPem, keyId) {
    if (!window.ipcRenderer) {
      throw new Error('Keychain access only available in Electron environment');
    }

    try {
      const service = 'privo-e2e-keys';
      const account = `${userId}-private-key-${keyId}`;
      
      console.log('🔐 Storing private key in Keychain...');
      console.log('  - Service:', service);
      console.log('  - Account:', account);
      console.log('  - UserId:', userId);
      console.log('  - KeyId:', keyId);
      
      await window.ipcRenderer.invoke('keychain-set', service, account, privateKeyPem);
      console.log('✅ Private key stored in Keychain successfully');
      
      // 키 ID도 별도로 저장 (개인키 조회용)
      const keyIdAccount = `${userId}-current-key-id`;
      console.log('🔑 Storing current key ID...');
      console.log('  - KeyIdAccount:', keyIdAccount);
      
      await window.ipcRenderer.invoke('keychain-set', service, keyIdAccount, keyId);
      console.log('✅ Current key ID stored successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to store private key in Keychain:', error);
      throw error;
    }
  }

  /**
   * Keychain에서 개인키 조회
   */
  async getPrivateKeyFromKeychain(userId, keyId = null) {
    if (!window.ipcRenderer) {
      throw new Error('Keychain access only available in Electron environment');
    }

    try {
      const service = 'privo-e2e-keys';
      
      console.log('🔍 Searching for private key in Keychain...');
      console.log('  - Service:', service);
      console.log('  - UserId:', userId);
      console.log('  - Provided KeyId:', keyId);
      
      // keyId가 없으면 현재 키 ID 조회
      if (!keyId) {
        const keyIdAccount = `${userId}-current-key-id`;
        console.log('🔑 Looking for current key ID...');
        console.log('  - KeyIdAccount:', keyIdAccount);
        
        keyId = await window.ipcRenderer.invoke('keychain-get', service, keyIdAccount);
        console.log('  - Found KeyId:', keyId);
        
        if (!keyId) {
          console.log('❌ No current key ID found for user:', userId);
          return null;
        }
      }
      
      const account = `${userId}-private-key-${keyId}`;
      console.log('🔐 Looking for private key...');
      console.log('  - Account:', account);
      
      const privateKeyPem = await window.ipcRenderer.invoke('keychain-get', service, account);
      
      if (!privateKeyPem) {
        console.log('❌ Private key not found in Keychain for keyId:', keyId);
        return null;
      }

      console.log('✅ Private key found successfully');
      console.log('  - KeyId:', keyId);
      console.log('  - Key length:', privateKeyPem.length, 'characters');

      return {
        privateKey: privateKeyPem,
        keyId: keyId
      };
    } catch (error) {
      console.error('❌ Failed to get private key from Keychain:', error);
      console.error('  - Error details:', error);
      throw error;
    }
  }

  /**
   * PEM 형식의 공개키를 CryptoKey 객체로 임포트
   */
  async importPublicKey(publicKeyPem) {
    try {
      const keyBuffer = this.pemToArrayBuffer(publicKeyPem);
      
      return await crypto.subtle.importKey(
        'spki',
        keyBuffer,
        this.keyConfig,
        false,
        ['encrypt']
      );
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw error;
    }
  }

  /**
   * PEM 형식의 개인키를 CryptoKey 객체로 임포트
   */
  async importPrivateKey(privateKeyPem) {
    try {
      const keyBuffer = this.pemToArrayBuffer(privateKeyPem);
      
      return await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        this.keyConfig,
        false,
        ['decrypt']
      );
    } catch (error) {
      console.error('Failed to import private key:', error);
      throw error;
    }
  }

  /**
   * 메시지를 공개키로 암호화 (하이브리드 암호화)
   */
  async encryptMessage(message, recipientPublicKeyPem) {
    try {
      // 1. AES 대칭키 생성
      const aesKey = await crypto.subtle.generateKey(
        this.aesConfig,
        true,
        ['encrypt', 'decrypt']
      );

      // 2. 메시지를 AES로 암호화
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedMessage = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        messageData
      );

      // 3. AES 키를 공개키로 암호화
      const publicKey = await this.importPublicKey(recipientPublicKeyPem);
      const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);
      
      const encryptedAesKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        aesKeyBuffer
      );

      // 4. 결과를 Base64로 인코딩하여 반환
      return {
        encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encryptedMessage))),
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey))),
        iv: btoa(String.fromCharCode(...iv))
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  }

  /**
   * 암호화된 메시지를 개인키로 복호화
   */
  async decryptMessage(encryptedData, privateKeyPem) {
    try {
      // 1. Base64 디코딩
      const encryptedMessage = new Uint8Array(
        atob(encryptedData.encryptedMessage).split('').map(c => c.charCodeAt(0))
      );
      const encryptedKey = new Uint8Array(
        atob(encryptedData.encryptedKey).split('').map(c => c.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(encryptedData.iv).split('').map(c => c.charCodeAt(0))
      );

      // 2. 개인키로 AES 키 복호화
      const privateKey = await this.importPrivateKey(privateKeyPem);
      const aesKeyBuffer = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedKey
      );

      // 3. AES 키 임포트
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        this.aesConfig,
        false,
        ['decrypt']
      );

      // 4. 메시지 복호화
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        encryptedMessage
      );

      // 5. 텍스트로 변환
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }

  /**
   * 사용자의 모든 키 삭제 (로그아웃 시)
   */
  async deleteUserKeys(userId) {
    if (!window.ipcRenderer) {
      return;
    }

    try {
      const service = 'privo-e2e-keys';
      
      // 현재 키 ID 조회
      const keyIdAccount = `${userId}-current-key-id`;
      const keyId = await window.ipcRenderer.invoke('keychain-get', service, keyIdAccount);
      
      if (keyId) {
        // 개인키 삭제
        const privateKeyAccount = `${userId}-private-key-${keyId}`;
        await window.ipcRenderer.invoke('keychain-delete', service, privateKeyAccount);
      }
      
      // 키 ID 삭제
      await window.ipcRenderer.invoke('keychain-delete', service, keyIdAccount);
      
      console.log('User E2E keys deleted from Keychain');
    } catch (error) {
      console.error('Failed to delete user keys:', error);
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const cryptoService = new CryptoService();
export default cryptoService;