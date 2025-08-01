package com.privo.infrastructure.messaging

import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.LocalDateTime
import java.util.*

@Service
class OfflineMessageStore(
    private val redisTemplate: RedisTemplate<String, String>
) {
    
    companion object {
        private const val OFFLINE_MESSAGE_PREFIX = "offline_msg:"
        private const val MESSAGE_EXPIRY_HOURS = 24L // 1 day
    }
    
    /**
     * Store message for offline user
     */
    fun storeOfflineMessage(recipientHashedId: String, message: OfflineMessage) {
        val key = "${OFFLINE_MESSAGE_PREFIX}${recipientHashedId}"
        val messageData = mapOf(
            "id" to message.id,
            "chatRoomId" to message.chatRoomId,
            "senderHashedId" to message.senderHashedId,
            "encryptedContent" to message.encryptedContent,
            "contentIv" to message.contentIv,
            "messageType" to message.messageType,
            "messageNumber" to (message.messageNumber?.toString() ?: ""),
            "chainLength" to (message.chainLength?.toString() ?: ""),
            "timestamp" to message.timestamp.toString(),
            "isDeleted" to message.isDeleted.toString()
        )
        
        // Use list to store multiple messages per user
        val messageJson = mapToJson(messageData)
        redisTemplate.opsForList().rightPush(key, messageJson)
        redisTemplate.expire(key, Duration.ofHours(MESSAGE_EXPIRY_HOURS))
    }
    
    /**
     * Get all offline messages for a user and remove them from storage
     */
    fun getAndClearOfflineMessages(userHashedId: String): List<OfflineMessage> {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userHashedId}"
        val messageJsonList = redisTemplate.opsForList().range(key, 0, -1) ?: emptyList()
        
        if (messageJsonList.isNotEmpty()) {
            redisTemplate.delete(key)
        }
        
        return messageJsonList.mapNotNull { messageJson ->
            try {
                jsonToOfflineMessage(messageJson)
            } catch (e: Exception) {
                null
            }
        }
    }
    
    /**
     * Check if user has offline messages
     */
    fun hasOfflineMessages(userHashedId: String): Boolean {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userHashedId}"
        return (redisTemplate.opsForList().size(key) ?: 0) > 0
    }
    
    /**
     * Get count of offline messages for a user
     */
    fun getOfflineMessageCount(userHashedId: String): Long {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userHashedId}"
        return redisTemplate.opsForList().size(key) ?: 0
    }
    
    private fun mapToJson(data: Map<String, String>): String {
        return data.entries.joinToString(",", "{", "}") { (key, value) ->
            "\"$key\":\"${value.replace("\"", "\\\"")}\""
        }
    }
    
    private fun jsonToOfflineMessage(json: String): OfflineMessage {
        // Simple JSON parsing for our specific format
        val data = json.removeSurrounding("{", "}")
            .split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)".toRegex())
            .associate { pair ->
                val parts = pair.split(":", limit = 2)
                val key = parts[0].trim().removeSurrounding("\"")
                val value = parts[1].trim().removeSurrounding("\"").replace("\\\"", "\"")
                key to value
            }
        
        return OfflineMessage(
            id = data["id"] ?: "",
            chatRoomId = data["chatRoomId"] ?: "",
            senderHashedId = data["senderHashedId"] ?: "",
            encryptedContent = data["encryptedContent"] ?: "",
            contentIv = data["contentIv"] ?: "",
            messageType = data["messageType"] ?: "TEXT",
            messageNumber = data["messageNumber"]?.takeIf { it.isNotEmpty() }?.toIntOrNull(),
            chainLength = data["chainLength"]?.takeIf { it.isNotEmpty() }?.toIntOrNull(),
            timestamp = LocalDateTime.parse(data["timestamp"] ?: LocalDateTime.now().toString()),
            isDeleted = data["isDeleted"]?.toBoolean() ?: false
        )
    }
}

data class OfflineMessage(
    val id: String,
    val chatRoomId: String,
    val senderHashedId: String,
    val encryptedContent: String,
    val contentIv: String,
    val messageType: String,
    val messageNumber: Int?,
    val chainLength: Int?,
    val timestamp: LocalDateTime,
    val isDeleted: Boolean
)