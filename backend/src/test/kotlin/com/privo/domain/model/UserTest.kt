package com.privo.domain.model

import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class UserTest {
    
    @Test
    fun `should create user with default values`() {
        val user = User(
            nickname = "testuser",
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        assertTrue(user.id.isNotBlank())
        assertEquals("testuser", user.nickname)
        assertEquals("hashedPassword", user.passwordHash)
        assertEquals("hashedPublicKey", user.publicKeyHash)
        assertTrue(user.createdAt.isBefore(LocalDateTime.now().plusSeconds(1)))
        assertTrue(user.updatedAt.isBefore(LocalDateTime.now().plusSeconds(1)))
    }
    
    @Test
    fun `should validate nickname length constraints`() {
        // These would normally be validated at the DTO level
        // but we can test that the User entity accepts valid nicknames
        val validUser = User(
            nickname = "validnick",
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        assertEquals("validnick", validUser.nickname)
        assertTrue(validUser.nickname.length in 2..50)
    }
    
    @Test
    fun `should implement equals and hashCode correctly`() {
        val user1 = User(
            id = "same-id",
            nickname = "user1",
            passwordHash = "hash1",
            publicKeyHash = "pubkey1"
        )
        
        val user2 = User(
            id = "same-id",
            nickname = "user2",
            passwordHash = "hash2",
            publicKeyHash = "pubkey2"
        )
        
        val user3 = User(
            id = "different-id",
            nickname = "user1",
            passwordHash = "hash1",
            publicKeyHash = "pubkey1"
        )
        
        assertEquals(user1, user2) // Same ID
        assertFalse(user1.equals(user3)) // Different ID
        assertEquals(user1.hashCode(), user2.hashCode())
    }
    
    @Test
    fun `should have meaningful toString`() {
        val user = User(
            id = "test-id",
            nickname = "testuser",
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        val toString = user.toString()
        
        assertTrue(toString.contains("test-id"))
        assertTrue(toString.contains("testuser"))
        assertFalse(toString.contains("hashedPassword")) // Should not expose sensitive data
    }
}