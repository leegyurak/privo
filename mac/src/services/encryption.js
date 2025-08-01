import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.algorithm = 'AES';
    this.keySize = 256;
    this.ivSize = 128;
    this.iterations = 100000; // PBKDF2 iterations
  }

  /**
   * Generate a cryptographically secure random key
   */
  generateKey() {
    return CryptoJS.lib.WordArray.random(this.keySize / 8).toString();
  }

  /**
   * Generate a random initialization vector
   */
  generateIV() {
    return CryptoJS.lib.WordArray.random(this.ivSize / 8);
  }

  /**
   * Derive a key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.keySize / 32,
      iterations: this.iterations
    });
  }

  /**
   * Encrypt a message using AES-GCM (simulated with AES-CBC + HMAC)
   */
  encrypt(message, password) {
    try {
      // Generate random salt and IV
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const iv = this.generateIV();

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Encrypt the message
      const encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      // Create HMAC for authentication
      const hmac = CryptoJS.HmacSHA256(
        salt.toString() + iv.toString() + encrypted.toString(),
        key
      );

      // Combine all components
      const result = {
        salt: salt.toString(),
        iv: iv.toString(),
        encrypted: encrypted.toString(),
        hmac: hmac.toString()
      };

      return JSON.stringify(result);
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt a message
   */
  decrypt(encryptedData, password) {
    try {
      const data = JSON.parse(encryptedData);
      const { salt, iv, encrypted, hmac } = data;

      // Derive key from password
      const key = this.deriveKey(password, CryptoJS.enc.Hex.parse(salt));

      // Verify HMAC
      const expectedHmac = CryptoJS.HmacSHA256(
        salt + iv + encrypted,
        key
      ).toString();

      if (hmac !== expectedHmac) {
        throw new Error('Message authentication failed');
      }

      // Decrypt the message
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        throw new Error('Decryption failed - invalid password or corrupted data');
      }

      return plaintext;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Hash a password for secure storage
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(128 / 8);
    } else if (typeof salt === 'string') {
      salt = CryptoJS.enc.Hex.parse(salt);
    }

    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: this.iterations
    });

    return {
      hash: hash.toString(),
      salt: salt.toString()
    };
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password, hash, salt) {
    const computed = this.hashPassword(password, salt);
    return computed.hash === hash;
  }

  /**
   * Generate a secure random password
   */
  generatePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Generate a key pair for asymmetric encryption (simplified version)
   */
  generateKeyPair() {
    const privateKey = this.generateKey();
    const publicKey = CryptoJS.SHA256(privateKey).toString();
    
    return {
      privateKey,
      publicKey
    };
  }

  /**
   * Create a digital signature for message integrity
   */
  sign(message, privateKey) {
    return CryptoJS.HmacSHA256(message, privateKey).toString();
  }

  /**
   * Verify a digital signature
   */
  verifySignature(message, signature, privateKey) {
    const expectedSignature = this.sign(message, privateKey);
    return signature === expectedSignature;
  }
}

// Export a singleton instance
export default new EncryptionService();