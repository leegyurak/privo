package com.privo.infrastructure.security

import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.springframework.stereotype.Service
import org.springframework.data.redis.core.RedisTemplate
import java.security.*
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.*
import javax.crypto.spec.*
import java.util.*
import java.time.Duration
import java.nio.charset.StandardCharsets
import org.bouncycastle.crypto.generators.X25519KeyPairGenerator
import org.bouncycastle.crypto.params.X25519KeyGenerationParameters
import org.bouncycastle.crypto.params.X25519PrivateKeyParameters
import org.bouncycastle.crypto.params.X25519PublicKeyParameters
import org.bouncycastle.crypto.agreement.X25519Agreement

@Service
class EnhancedEncryptionService(
    private val redisTemplate: RedisTemplate<String, String>
) {
    
    companion object {
        private const val SESSION_PREFIX = "enhanced:session:"
        private const val KEYPAIR_PREFIX = "enhanced:keypair:"
        private const val ALGORITHM_AES = "AES"
        private const val TRANSFORMATION_AES_GCM = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 16
        private const val KEY_LENGTH = 32 // 256 bits
        private const val SESSION_EXPIRY_HOURS = 24L
        
        init {
            Security.addProvider(BouncyCastleProvider())
        }
    }
    
    private val secureRandom = SecureRandom()
    
    /**
     * Generate X25519 key pair for user
     */
    fun generateUserKeyPair(userId: String): UserKeyPair {
        val keyPairGenerator = X25519KeyPairGenerator()
        keyPairGenerator.init(X25519KeyGenerationParameters(secureRandom))
        
        val keyPair = keyPairGenerator.generateKeyPair()
        val privateKey = keyPair.private as X25519PrivateKeyParameters
        val publicKey = keyPair.public as X25519PublicKeyParameters
        
        val userKeyPair = UserKeyPair(
            userId = userId,
            privateKey = privateKey.encoded,
            publicKey = publicKey.encoded
        )
        
        // Store key pair in Redis
        storeUserKeyPair(userId, userKeyPair)
        
        return userKeyPair
    }
    
    /**
     * Get or create session between two users using ECDH
     */
    fun getOrCreateSession(userId1: String, userId2: String): EncryptionSession {
        val sessionKey = generateSessionKey(userId1, userId2)
        
        // Try to load existing session
        loadSession(sessionKey)?.let { return it }
        
        // Create new session using ECDH
        val userKeyPair1 = getUserKeyPair(userId1) ?: throw IllegalStateException("Key pair not found for user $userId1")
        val userKeyPair2 = getUserKeyPair(userId2) ?: throw IllegalStateException("Key pair not found for user $userId2")
        
        val sharedSecret = performECDH(userKeyPair1.privateKey, userKeyPair2.publicKey)
        val sessionSecret = deriveSessionKey(sharedSecret)
        
        val session = EncryptionSession(
            sessionId = sessionKey,
            userId1 = userId1,
            userId2 = userId2,
            sessionKey = sessionSecret,
            messageCounter = 0,
            createdAt = System.currentTimeMillis()
        )
        
        storeSession(session)
        return session
    }
    
    /**
     * Encrypt message using session key with forward secrecy
     */
    fun encryptMessage(session: EncryptionSession, plaintext: String): EncryptedMessage {
        // Derive message-specific key using counter
        val messageKey = deriveMessageKey(session.sessionKey, session.messageCounter)
        
        val cipher = Cipher.getInstance(TRANSFORMATION_AES_GCM)
        val iv = ByteArray(GCM_IV_LENGTH)
        secureRandom.nextBytes(iv)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(messageKey, ALGORITHM_AES), gcmParameterSpec)
        
        val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
        
        // Increment message counter for forward secrecy
        val updatedSession = session.copy(messageCounter = session.messageCounter + 1)
        storeSession(updatedSession)
        
        return EncryptedMessage(
            ciphertext = Base64.getEncoder().encodeToString(ciphertext),
            iv = Base64.getEncoder().encodeToString(iv),
            messageNumber = session.messageCounter,
            sessionId = session.sessionId,
            timestamp = System.currentTimeMillis()
        )
    }
    
    /**
     * Decrypt message using session
     */
    fun decryptMessage(session: EncryptionSession, encryptedMessage: EncryptedMessage): String {
        // Derive the same message-specific key using the message number
        val messageKey = deriveMessageKey(session.sessionKey, encryptedMessage.messageNumber)
        
        val cipher = Cipher.getInstance(TRANSFORMATION_AES_GCM)
        val iv = Base64.getDecoder().decode(encryptedMessage.iv)
        val ciphertext = Base64.getDecoder().decode(encryptedMessage.ciphertext)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(messageKey, ALGORITHM_AES), gcmParameterSpec)
        
        val plaintext = cipher.doFinal(ciphertext)
        return String(plaintext, StandardCharsets.UTF_8)
    }
    
    /**
     * Rotate session key for enhanced security
     */
    fun rotateSessionKey(session: EncryptionSession): EncryptionSession {
        val newSessionKey = ByteArray(KEY_LENGTH)
        secureRandom.nextBytes(newSessionKey)
        
        val rotatedSession = session.copy(
            sessionKey = newSessionKey,
            messageCounter = 0,
            createdAt = System.currentTimeMillis()
        )
        
        storeSession(rotatedSession)
        return rotatedSession
    }
    
    private fun performECDH(privateKey: ByteArray, publicKey: ByteArray): ByteArray {
        val agreement = X25519Agreement()
        val privateKeyParams = X25519PrivateKeyParameters(privateKey, 0)
        agreement.init(privateKeyParams)
        
        val publicKeyParams = X25519PublicKeyParameters(publicKey, 0)
        val sharedSecret = ByteArray(32)
        agreement.calculateAgreement(publicKeyParams, sharedSecret, 0)
        
        return sharedSecret
    }
    
    private fun deriveSessionKey(sharedSecret: ByteArray): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update("SESSION_KEY".toByteArray())
        digest.update(sharedSecret)
        return digest.digest()
    }
    
    private fun deriveMessageKey(sessionKey: ByteArray, messageNumber: Int): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(sessionKey)
        digest.update("MESSAGE_KEY".toByteArray())
        digest.update(messageNumber.toString().toByteArray())
        return digest.digest()
    }
    
    private fun generateSessionKey(userId1: String, userId2: String): String {
        val sortedUserIds = listOf(userId1, userId2).sorted()
        return "${SESSION_PREFIX}${sortedUserIds[0]}:${sortedUserIds[1]}"
    }
    
    private fun storeUserKeyPair(userId: String, keyPair: UserKeyPair) {
        val key = "${KEYPAIR_PREFIX}${userId}"
        val data = mapOf(
            "privateKey" to Base64.getEncoder().encodeToString(keyPair.privateKey),
            "publicKey" to Base64.getEncoder().encodeToString(keyPair.publicKey)
        )
        redisTemplate.opsForHash<String, String>().putAll(key, data)
        redisTemplate.expire(key, Duration.ofDays(30))
    }
    
    private fun getUserKeyPair(userId: String): UserKeyPair? {
        val key = "${KEYPAIR_PREFIX}${userId}"
        val data = redisTemplate.opsForHash<String, String>().entries(key)
        
        return if (data.isNotEmpty()) {
            UserKeyPair(
                userId = userId,
                privateKey = Base64.getDecoder().decode(data["privateKey"]),
                publicKey = Base64.getDecoder().decode(data["publicKey"])
            )
        } else null
    }
    
    private fun storeSession(session: EncryptionSession) {
        val data = mapOf(
            "userId1" to session.userId1,
            "userId2" to session.userId2,
            "sessionKey" to Base64.getEncoder().encodeToString(session.sessionKey),
            "messageCounter" to session.messageCounter.toString(),
            "createdAt" to session.createdAt.toString()
        )
        redisTemplate.opsForHash<String, String>().putAll(session.sessionId, data)
        redisTemplate.expire(session.sessionId, Duration.ofHours(SESSION_EXPIRY_HOURS))
    }
    
    private fun loadSession(sessionKey: String): EncryptionSession? {
        val data = redisTemplate.opsForHash<String, String>().entries(sessionKey)
        
        return if (data.isNotEmpty()) {
            EncryptionSession(
                sessionId = sessionKey,
                userId1 = data["userId1"] ?: "",
                userId2 = data["userId2"] ?: "",
                sessionKey = Base64.getDecoder().decode(data["sessionKey"]),
                messageCounter = data["messageCounter"]?.toIntOrNull() ?: 0,
                createdAt = data["createdAt"]?.toLongOrNull() ?: 0L
            )
        } else null
    }
}

data class UserKeyPair(
    val userId: String,
    val privateKey: ByteArray,
    val publicKey: ByteArray
)

data class EncryptionSession(
    val sessionId: String,
    val userId1: String,
    val userId2: String,
    val sessionKey: ByteArray,
    val messageCounter: Int,
    val createdAt: Long
)

data class EncryptedMessage(
    val ciphertext: String,
    val iv: String,
    val messageNumber: Int,
    val sessionId: String,
    val timestamp: Long
)