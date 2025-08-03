package com.privo.domain.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "user_blocks")
class UserBlock(
    @Id
    val id: String = UUID.randomUUID().toString(),
    
    @Column(name = "blocker_user_id", nullable = false, length = 64)
    val blockerUserId: String,
    
    @Column(name = "blocked_user_id", nullable = false, length = 64)
    val blockedUserId: String,
    
    @Column(nullable = false)
    val blockedAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(nullable = false)
    val isActive: Boolean = true
) {
    
    fun unblock(): UserBlock {
        return UserBlock(
            id = this.id,
            blockerUserId = this.blockerUserId,
            blockedUserId = this.blockedUserId,
            blockedAt = this.blockedAt,
            isActive = false
        )
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is UserBlock) return false
        return id == other.id
    }
    
    override fun hashCode(): Int {
        return id.hashCode()
    }
    
    override fun toString(): String {
        return "UserBlock(id='$id', blockerUserId='$blockerUserId', blockedUserId='$blockedUserId', isActive=$isActive)"
    }
}