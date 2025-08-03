package com.privo.domain.repository

import com.privo.domain.model.ChatRoom

interface ChatRoomRepository {
    fun save(chatRoom: ChatRoom): ChatRoom
    fun findById(id: String): ChatRoom?
    fun findByUserId(userId: String): List<ChatRoom>
    fun delete(chatRoom: ChatRoom)

    /**
     * Retrieves an existing direct message chat room between two users, regardless of membership active status.
     *
     * @param user1Id first user's id
     * @param user2Id second user's id
     * @return the direct message ChatRoom if exists, otherwise null
     */
    fun findDirectMessageRoomBetweenUsers(user1Id: String, user2Id: String): ChatRoom?
    
    /**
     * Find existing DM room with SELECT FOR UPDATE to prevent concurrent creation
     */
    fun findDirectMessageRoomBetweenUsersForUpdate(user1Id: String, user2Id: String): ChatRoom?
}
