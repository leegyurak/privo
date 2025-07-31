package com.privo.infrastructure.persistence

import com.privo.domain.model.ChatRoom
import com.privo.domain.repository.ChatRoomRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

interface JpaChatRoomDataRepository : JpaRepository<ChatRoom, String> {
    
    @Query("""
        SELECT DISTINCT cr FROM ChatRoom cr 
        JOIN ChatRoomMember crm ON cr.id = crm.chatRoomId 
        WHERE crm.userHashedId = :userHashedId AND crm.isActive = true
    """)
    fun findByUserHashedId(@Param("userHashedId") userHashedId: String): List<ChatRoom>
}

@Repository
class JpaChatRoomRepository(
    private val jpaChatRoomDataRepository: JpaChatRoomDataRepository
) : ChatRoomRepository {
    
    override fun save(chatRoom: ChatRoom): ChatRoom {
        return jpaChatRoomDataRepository.save(chatRoom)
    }
    
    override fun findById(id: String): ChatRoom? {
        return jpaChatRoomDataRepository.findById(id).orElse(null)
    }
    
    override fun findByUserId(userHashedId: String): List<ChatRoom> {
        return jpaChatRoomDataRepository.findByUserHashedId(userHashedId)
    }
    
    override fun delete(chatRoom: ChatRoom) {
        jpaChatRoomDataRepository.delete(chatRoom)
    }
}