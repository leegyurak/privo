package com.privo.domain.repository

import com.privo.domain.model.ChatMessage
import java.time.LocalDateTime

interface ChatMessageRepository {
    fun save(message: ChatMessage): ChatMessage
    fun findById(id: String): ChatMessage?
    fun findByChatRoomId(chatRoomId: String, limit: Int = 50, offset: Int = 0): List<ChatMessage>
    fun findByChatRoomIdAfter(chatRoomId: String, timestamp: LocalDateTime): List<ChatMessage>
    fun delete(message: ChatMessage)
    fun countByChatRoomId(chatRoomId: String): Long
}