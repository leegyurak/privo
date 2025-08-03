package com.privo.infrastructure.persistence

import com.privo.domain.model.ChatRoom
import com.privo.domain.repository.ChatRoomRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import jakarta.persistence.LockModeType

interface JpaChatRoomDataRepository : JpaRepository<ChatRoom, String> {

    @Query("""
        SELECT DISTINCT cr FROM ChatRoom cr 
        JOIN ChatRoomMember crm ON cr.id = crm.chatRoomId 
        WHERE crm.userId = :userId AND crm.isActive = true
    """)
    fun findByUserId(@Param("userId") userId: String): List<ChatRoom>

    @Query("""
        SELECT DISTINCT cr FROM ChatRoom cr
        JOIN ChatRoomMember m1 ON cr.id = m1.chatRoomId AND m1.userId = :user1HashedId
        JOIN ChatRoomMember m2 ON cr.id = m2.chatRoomId AND m2.userId = :user2HashedId
        WHERE cr.isDirectMessage = true
    """)
    fun findDirectMessageRoomBetweenUsers(
        @Param("user1HashedId") user1HashedId: String,
        @Param("user2HashedId") user2HashedId: String
    ): ChatRoom?
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT DISTINCT cr FROM ChatRoom cr
        JOIN ChatRoomMember m1 ON cr.id = m1.chatRoomId AND m1.userId = :user1HashedId
        JOIN ChatRoomMember m2 ON cr.id = m2.chatRoomId AND m2.userId = :user2HashedId
        WHERE cr.isDirectMessage = true
    """)
    fun findDirectMessageRoomBetweenUsersForUpdate(
        @Param("user1HashedId") user1HashedId: String,
        @Param("user2HashedId") user2HashedId: String
    ): ChatRoom?
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
    
    override fun findByUserId(userId: String): List<ChatRoom> {
        return jpaChatRoomDataRepository.findByUserId(userId)
    }
    
    override fun delete(chatRoom: ChatRoom) {
        jpaChatRoomDataRepository.delete(chatRoom)
    }

    override fun findDirectMessageRoomBetweenUsers(user1HashedId: String, user2HashedId: String): ChatRoom? {
        return jpaChatRoomDataRepository.findDirectMessageRoomBetweenUsers(user1HashedId, user2HashedId)
    }
    
    override fun findDirectMessageRoomBetweenUsersForUpdate(user1HashedId: String, user2HashedId: String): ChatRoom? {
        return jpaChatRoomDataRepository.findDirectMessageRoomBetweenUsersForUpdate(user1HashedId, user2HashedId)
    }
}
