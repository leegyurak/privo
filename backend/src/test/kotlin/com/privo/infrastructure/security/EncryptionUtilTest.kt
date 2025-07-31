package com.privo.infrastructure.security

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class EncryptionUtilTest {
    
    private val encryptionUtil = EncryptionUtil("AES", "AES/GCM/NoPadding", 256)
    
    @Test
    fun `should generate key successfully`() {
        val key = encryptionUtil.generateKey()
        
        assertNotNull(key)
        assertEquals("AES", key.algorithm)
        assertEquals(32, key.encoded.size) // 256 bits = 32 bytes
    }
    
    @Test
    fun `should convert key to string and back`() {
        val originalKey = encryptionUtil.generateKey()
        val keyString = encryptionUtil.keyToString(originalKey)
        val restoredKey = encryptionUtil.stringToKey(keyString)
        
        assertNotNull(keyString)
        assertTrue(keyString.isNotBlank())
        assertEquals(originalKey.algorithm, restoredKey.algorithm)
        assertEquals(originalKey.encoded.contentToString(), restoredKey.encoded.contentToString())
    }
    
    @Test
    fun `should encrypt and decrypt text successfully`() {
        val plaintext = "Hello, World! This is a test message."
        val key = encryptionUtil.generateKey()
        
        val encryptedData = encryptionUtil.encrypt(plaintext, key)
        val decryptedText = encryptionUtil.decrypt(encryptedData, key)
        
        assertNotNull(encryptedData.ciphertext)
        assertNotNull(encryptedData.iv)
        assertTrue(encryptedData.ciphertext.isNotBlank())
        assertTrue(encryptedData.iv.isNotBlank())
        assertEquals(plaintext, decryptedText)
    }
    
    @Test
    fun `should produce different ciphertext for same plaintext`() {
        val plaintext = "Same message"
        val key = encryptionUtil.generateKey()
        
        val encrypted1 = encryptionUtil.encrypt(plaintext, key)
        val encrypted2 = encryptionUtil.encrypt(plaintext, key)
        
        assertNotEquals(encrypted1.ciphertext, encrypted2.ciphertext)
        assertNotEquals(encrypted1.iv, encrypted2.iv)
        
        assertEquals(plaintext, encryptionUtil.decrypt(encrypted1, key))
        assertEquals(plaintext, encryptionUtil.decrypt(encrypted2, key))
    }
    
    @Test
    fun `should fail to decrypt with wrong key`() {
        val plaintext = "Secret message"
        val correctKey = encryptionUtil.generateKey()
        val wrongKey = encryptionUtil.generateKey()
        
        val encryptedData = encryptionUtil.encrypt(plaintext, correctKey)
        
        assertThrows<Exception> {
            encryptionUtil.decrypt(encryptedData, wrongKey)
        }
    }
    
    @Test
    fun `should generate random string with correct length`() {
        val length = 32
        val randomString = encryptionUtil.generateRandomString(length)
        
        assertEquals(length, randomString.length)
        assertTrue(randomString.all { it.isLetterOrDigit() })
    }
    
    @Test
    fun `should generate different random strings`() {
        val length = 16
        val string1 = encryptionUtil.generateRandomString(length)
        val string2 = encryptionUtil.generateRandomString(length)
        
        assertNotEquals(string1, string2)
    }
}