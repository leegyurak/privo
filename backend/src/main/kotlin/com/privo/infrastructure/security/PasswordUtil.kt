package com.privo.infrastructure.security

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.security.SecureRandom

@Component
class PasswordUtil {
    
    private val passwordEncoder = BCryptPasswordEncoder()
    private val secureRandom = SecureRandom()
    
    fun hashPassword(password: String): String {
        return passwordEncoder.encode(password)
    }
    
    fun verifyPassword(password: String, hashedPassword: String): Boolean {
        return passwordEncoder.matches(password, hashedPassword)
    }
    
    fun generateSalt(): String {
        val salt = ByteArray(32)
        secureRandom.nextBytes(salt)
        return salt.joinToString("") { "%02x".format(it) }
    }
    
    fun hashWithSalt(data: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(salt.toByteArray())
        val hash = digest.digest(data.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }
    }
    
    fun generateUserSpecificSalt(userId: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val saltPrefix = "privo_user_salt_"
        val hash = digest.digest((saltPrefix + userId).toByteArray())
        return hash.joinToString("") { "%02x".format(it) }
    }
}