package com.privo.infrastructure.persistence

import com.privo.domain.model.ChatMessage
import com.privo.domain.repository.ChatMessageRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

interface JpaChatMessageDataRepository : JpaRepository<ChatMessage, String> {
    
    fun findByChatRoomIdOrderByTimestampDesc(chatRoomId: String, pageable: PageRequest): List<ChatMessage>
    
    fun findByChatRoomIdAndTimestampAfterOrderByTimestampAsc(
        chatRoomId: String, 
        timestamp: LocalDateTime
    ): List<ChatMessage>
    
    fun countByChatRoomId(chatRoomId: String): Long
}

@Repository
class JpaChatMessageRepository(
    private val jpaChatMessageDataRepository: JpaChatMessageDataRepository
) : ChatMessageRepository {
    
    override fun save(message: ChatMessage): ChatMessage {
        return jpaChatMessageDataRepository.save(message)
    }
    
    override fun findById(id: String): ChatMessage? {
        return jpaChatMessageDataRepository.findById(id).orElse(null)
    }
    
    override fun findByChatRoomId(chatRoomId: String, limit: Int, offset: Int): List<ChatMessage> {
        val pageable = PageRequest.of(offset / limit, limit, Sort.by(Sort.Direction.DESC, "timestamp"))
        return jpaChatMessageDataRepository.findByChatRoomIdOrderByTimestampDesc(chatRoomId, pageable)
    }
    
    override fun findByChatRoomIdAfter(chatRoomId: String, timestamp: LocalDateTime): List<ChatMessage> {
        return jpaChatMessageDataRepository.findByChatRoomIdAndTimestampAfterOrderByTimestampAsc(chatRoomId, timestamp)
    }
    
    override fun delete(message: ChatMessage) {
        jpaChatMessageDataRepository.delete(message)
    }
    
    override fun countByChatRoomId(chatRoomId: String): Long {
        return jpaChatMessageDataRepository.countByChatRoomId(chatRoomId)
    }
}