package com.privo.domain.model

import java.time.LocalDateTime

data class EmailVerification(
    val token: String,
    val hashedEmail: String,
    val createdAt: LocalDateTime,
    val expiresAt: LocalDateTime
) {
    
    fun isExpired(): Boolean {
        return LocalDateTime.now().isAfter(expiresAt)
    }
    
    companion object {
        const val EXPIRY_HOURS = 24L
        
        fun create(token: String, hashedEmail: String): EmailVerification {
            val now = LocalDateTime.now()
            return EmailVerification(
                token = token,
                hashedEmail = hashedEmail,
                createdAt = now,
                expiresAt = now.plusHours(EXPIRY_HOURS)
            )
        }
    }
}