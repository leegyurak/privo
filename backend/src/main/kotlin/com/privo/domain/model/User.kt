package com.privo.domain.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "users")
class User(
    @Id
    val id: String = UUID.randomUUID().toString(),
    
    @Column(unique = true, nullable = false, length = 50)
    val nickname: String,
    
    @Column(name = "password_hash", nullable = false)
    val passwordHash: String,
    
    @Column(name = "public_key_hash", nullable = false)
    val publicKeyHash: String,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "updated_at", nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now()
) {
    
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is User) return false
        return id == other.id
    }
    
    override fun hashCode(): Int {
        return id.hashCode()
    }
    
    override fun toString(): String {
        return "User(id='$id', nickname='$nickname')"
    }
}