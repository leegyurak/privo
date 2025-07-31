package com.privo.infrastructure.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.util.*
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

@Component
class EncryptionUtil(
    @Value("\${privo.encryption.algorithm:AES}")
    private val algorithm: String,
    @Value("\${privo.encryption.transformation:AES/GCM/NoPadding}")
    private val transformation: String,
    @Value("\${privo.encryption.key-length:256}")
    private val keyLength: Int
) {
    
    companion object {
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 16
    }
    
    private val secureRandom = SecureRandom()
    
    fun generateKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(algorithm)
        keyGenerator.init(keyLength)
        return keyGenerator.generateKey()
    }
    
    fun keyToString(key: SecretKey): String {
        return Base64.getEncoder().encodeToString(key.encoded)
    }
    
    fun stringToKey(keyString: String): SecretKey {
        val decodedKey = Base64.getDecoder().decode(keyString)
        return SecretKeySpec(decodedKey, algorithm)
    }
    
    fun encrypt(plaintext: String, key: SecretKey): EncryptedData {
        val cipher = Cipher.getInstance(transformation)
        val iv = ByteArray(GCM_IV_LENGTH)
        secureRandom.nextBytes(iv)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, gcmParameterSpec)
        
        val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
        
        return EncryptedData(
            ciphertext = Base64.getEncoder().encodeToString(ciphertext),
            iv = Base64.getEncoder().encodeToString(iv)
        )
    }
    
    fun decrypt(encryptedData: EncryptedData, key: SecretKey): String {
        val cipher = Cipher.getInstance(transformation)
        val iv = Base64.getDecoder().decode(encryptedData.iv)
        val ciphertext = Base64.getDecoder().decode(encryptedData.ciphertext)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, gcmParameterSpec)
        
        val plaintext = cipher.doFinal(ciphertext)
        return String(plaintext, StandardCharsets.UTF_8)
    }
    
    fun generateRandomString(length: Int): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return (1..length)
            .map { chars[secureRandom.nextInt(chars.length)] }
            .joinToString("")
    }
}

data class EncryptedData(
    val ciphertext: String,
    val iv: String
)