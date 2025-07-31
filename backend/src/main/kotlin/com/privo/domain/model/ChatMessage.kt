package com.privo.domain.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "chat_messages")
class ChatMessage(
    @Id
    val id: String = UUID.randomUUID().toString(),
    
    @Column(nullable = false)
    val chatRoomId: String,
    
    @Column(nullable = false)
    val senderHashedId: String,
    
    @Column(columnDefinition = "TEXT", nullable = false)
    val encryptedContent: String,
    
    @Column(nullable = false)
    val contentIv: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val messageType: MessageType = MessageType.TEXT,
    
    @Column(nullable = false)
    val timestamp: LocalDateTime = LocalDateTime.now(),
    
    @Column(nullable = false)
    val isDeleted: Boolean = false
) {
    
    fun markAsDeleted(): ChatMessage {
        return ChatMessage(
            id = this.id,
            chatRoomId = this.chatRoomId,
            senderHashedId = this.senderHashedId,
            encryptedContent = this.encryptedContent,
            contentIv = this.contentIv,
            messageType = this.messageType,
            timestamp = this.timestamp,
            isDeleted = true
        )
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChatMessage) return false
        return id == other.id
    }
    
    override fun hashCode(): Int {
        return id.hashCode()
    }
    
    override fun toString(): String {
        return "ChatMessage(id='$id', chatRoomId='$chatRoomId', messageType=$messageType, timestamp=$timestamp)"
    }
}

enum class MessageType {
    TEXT,
    IMAGE,
    FILE,
    SYSTEM
}