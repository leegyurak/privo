package com.privo.domain.repository

import com.privo.domain.model.ChatRoom

interface ChatRoomRepository {
    fun save(chatRoom: ChatRoom): ChatRoom
    fun findById(id: String): ChatRoom?
    fun findByUserId(userHashedId: String): List<ChatRoom>
    fun delete(chatRoom: ChatRoom)
}