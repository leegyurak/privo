package com.privo.domain.repository

import com.privo.domain.model.ChatRoomMember

interface ChatRoomMemberRepository {
    fun save(member: ChatRoomMember): ChatRoomMember
    fun findById(id: String): ChatRoomMember?
    fun findByChatRoomId(chatRoomId: String): List<ChatRoomMember>
    fun findByUserId(userId: String): List<ChatRoomMember>
    fun findByChatRoomIdAndUserId(chatRoomId: String, userId: String): ChatRoomMember?
    fun findActiveChatRoomsByUserId(userId: String): List<ChatRoomMember>
    fun countActiveMembersByRoomId(chatRoomId: String): Int
    fun delete(member: ChatRoomMember)
}