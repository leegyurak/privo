package com.privo.infrastructure.persistence

import com.privo.domain.model.ChatRoomMember
import com.privo.domain.repository.ChatRoomMemberRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

interface JpaChatRoomMemberDataRepository : JpaRepository<ChatRoomMember, String> {
    fun findByChatRoomId(chatRoomId: String): List<ChatRoomMember>
    fun findByUserHashedId(userHashedId: String): List<ChatRoomMember>
    fun findByChatRoomIdAndUserHashedId(chatRoomId: String, userHashedId: String): ChatRoomMember?
    fun findByUserHashedIdAndIsActive(userHashedId: String, isActive: Boolean): List<ChatRoomMember>
    fun countByChatRoomIdAndIsActive(chatRoomId: String, isActive: Boolean): Int
}

@Repository
class JpaChatRoomMemberRepository(
    private val jpaChatRoomMemberDataRepository: JpaChatRoomMemberDataRepository
) : ChatRoomMemberRepository {
    
    override fun save(member: ChatRoomMember): ChatRoomMember {
        return jpaChatRoomMemberDataRepository.save(member)
    }
    
    override fun findById(id: String): ChatRoomMember? {
        return jpaChatRoomMemberDataRepository.findById(id).orElse(null)
    }
    
    override fun findByChatRoomId(chatRoomId: String): List<ChatRoomMember> {
        return jpaChatRoomMemberDataRepository.findByChatRoomId(chatRoomId)
    }
    
    override fun findByUserHashedId(userHashedId: String): List<ChatRoomMember> {
        return jpaChatRoomMemberDataRepository.findByUserHashedId(userHashedId)
    }
    
    override fun findByChatRoomIdAndUserHashedId(chatRoomId: String, userHashedId: String): ChatRoomMember? {
        return jpaChatRoomMemberDataRepository.findByChatRoomIdAndUserHashedId(chatRoomId, userHashedId)
    }
    
    override fun findActiveChatRoomsByUserHashedId(userHashedId: String): List<ChatRoomMember> {
        return jpaChatRoomMemberDataRepository.findByUserHashedIdAndIsActive(userHashedId, true)
    }
    
    override fun countActiveMembersByRoomId(chatRoomId: String): Int {
        return jpaChatRoomMemberDataRepository.countByChatRoomIdAndIsActive(chatRoomId, true)
    }
    
    override fun delete(member: ChatRoomMember) {
        jpaChatRoomMemberDataRepository.delete(member)
    }
}