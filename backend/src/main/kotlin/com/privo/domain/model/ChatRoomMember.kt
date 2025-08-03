package com.privo.domain.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "chat_room_members")
class ChatRoomMember(
    @Id
    val id: String = UUID.randomUUID().toString(),
    
    @Column(nullable = false)
    val chatRoomId: String,
    
    @Column(name = "user_id", nullable = false, length = 64)
    val userId: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val role: MemberRole = MemberRole.MEMBER,
    
    @Column(nullable = false)
    val joinedAt: LocalDateTime = LocalDateTime.now(),
    
    @Column
    val leftAt: LocalDateTime? = null,
    
    @Column(nullable = false)
    val isActive: Boolean = true
) {
    
    fun leave(): ChatRoomMember {
        return ChatRoomMember(
            id = this.id,
            chatRoomId = this.chatRoomId,
            userId = this.userId,
            role = this.role,
            joinedAt = this.joinedAt,
            leftAt = LocalDateTime.now(),
            isActive = false
        )
    }
    
    fun deactivate(): ChatRoomMember {
        return ChatRoomMember(
            id = this.id,
            chatRoomId = this.chatRoomId,
            userId = this.userId,
            role = this.role,
            joinedAt = this.joinedAt,
            leftAt = LocalDateTime.now(),
            isActive = false
        )
    }
    
    fun promoteToAdmin(): ChatRoomMember {
        return ChatRoomMember(
            id = this.id,
            chatRoomId = this.chatRoomId,
            userId = this.userId,
            role = MemberRole.ADMIN,
            joinedAt = this.joinedAt,
            leftAt = this.leftAt,
            isActive = this.isActive
        )
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChatRoomMember) return false
        return id == other.id
    }
    
    override fun hashCode(): Int {
        return id.hashCode()
    }
    
    override fun toString(): String {
        return "ChatRoomMember(id='$id', chatRoomId='$chatRoomId', role=$role, isActive=$isActive)"
    }
}

enum class MemberRole {
    OWNER,
    ADMIN,
    MEMBER
}