package com.privo.domain.repository

import com.privo.domain.model.ChatRoomMember

interface ChatRoomMemberRepository {
    fun save(member: ChatRoomMember): ChatRoomMember
    fun findById(id: String): ChatRoomMember?
    fun findByChatRoomId(chatRoomId: String): List<ChatRoomMember>
    fun findByUserHashedId(userHashedId: String): List<ChatRoomMember>
    fun findByChatRoomIdAndUserHashedId(chatRoomId: String, userHashedId: String): ChatRoomMember?
    fun findActiveChatRoomsByUserHashedId(userHashedId: String): List<ChatRoomMember>
    fun countActiveMembersByRoomId(chatRoomId: String): Int
    fun delete(member: ChatRoomMember)
}