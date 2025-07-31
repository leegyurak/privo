package com.privo.infrastructure.security

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class PasswordUtilTest {
    
    private val passwordUtil = PasswordUtil()
    
    @Test
    fun `should hash password successfully`() {
        val password = "testPassword123"
        val hash = passwordUtil.hashPassword(password)
        
        assertTrue(hash.isNotBlank())
        assertNotEquals(password, hash)
        assertTrue(hash.startsWith("\$2a\$")) // BCrypt prefix
    }
    
    @Test
    fun `should verify correct password`() {
        val password = "correctPassword"
        val hash = passwordUtil.hashPassword(password)
        
        assertTrue(passwordUtil.verifyPassword(password, hash))
    }
    
    @Test
    fun `should reject incorrect password`() {
        val correctPassword = "correctPassword"
        val incorrectPassword = "wrongPassword"
        val hash = passwordUtil.hashPassword(correctPassword)
        
        assertFalse(passwordUtil.verifyPassword(incorrectPassword, hash))
    }
    
    @Test
    fun `should generate different hashes for same password`() {
        val password = "samePassword"
        val hash1 = passwordUtil.hashPassword(password)
        val hash2 = passwordUtil.hashPassword(password)
        
        assertNotEquals(hash1, hash2)
        assertTrue(passwordUtil.verifyPassword(password, hash1))
        assertTrue(passwordUtil.verifyPassword(password, hash2))
    }
    
    @Test
    fun `should generate salt successfully`() {
        val salt = passwordUtil.generateSalt()
        
        assertTrue(salt.isNotBlank())
        assertEquals(64, salt.length) // 32 bytes * 2 (hex representation)
        assertTrue(salt.all { it.isDigit() || it.lowercaseChar() in 'a'..'f' })
    }
    
    @Test
    fun `should generate different salts`() {
        val salt1 = passwordUtil.generateSalt()
        val salt2 = passwordUtil.generateSalt()
        
        assertNotEquals(salt1, salt2)
    }
    
    @Test
    fun `should hash with salt consistently`() {
        val data = "testData"
        val salt = passwordUtil.generateSalt()
        
        val hash1 = passwordUtil.hashWithSalt(data, salt)
        val hash2 = passwordUtil.hashWithSalt(data, salt)
        
        assertEquals(hash1, hash2)
        assertTrue(hash1.isNotBlank())
        assertEquals(64, hash1.length) // SHA-256 produces 32 bytes = 64 hex chars
    }
    
    @Test
    fun `should produce different hashes with different salts`() {
        val data = "testData"
        val salt1 = passwordUtil.generateSalt()
        val salt2 = passwordUtil.generateSalt()
        
        val hash1 = passwordUtil.hashWithSalt(data, salt1)
        val hash2 = passwordUtil.hashWithSalt(data, salt2)
        
        assertNotEquals(hash1, hash2)
    }
}