package com.privo.infrastructure.messaging

import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.LocalDateTime
import java.util.*

@Service
class OfflineMessageStore(
    private val redisTemplate: RedisTemplate<String, String>,
    private val distributedLock: RedisDistributedLock
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(OfflineMessageStore::class.java)
        private const val OFFLINE_MESSAGE_PREFIX = "offline_msg:"
        private const val MESSAGE_EXPIRY_HOURS = 24L // 1 day
        private const val OFFLINE_MESSAGE_LOCK_PREFIX = "offline_msg_lock:"
    }
    
    /**
     * Store message for offline user with distributed lock to ensure message order
     */
    fun storeOfflineMessage(recipientHashedId: String, message: OfflineMessage) {
        val lockKey = "${OFFLINE_MESSAGE_LOCK_PREFIX}${recipientHashedId}"
        logger.debug("Attempting to acquire lock for storing offline message for user: {}", recipientHashedId)
        
        val result = distributedLock.withLock(lockKey, timeoutSeconds = 5L, acquireTimeoutMillis = 3000L) {
            val key = "${OFFLINE_MESSAGE_PREFIX}${recipientHashedId}"
            val messageData = mapOf(
                "id" to message.id,
                "chatRoomId" to message.chatRoomId,
                "senderId" to message.senderId,
                "encryptedContent" to message.encryptedContent,
                "contentIv" to message.contentIv,
                "messageType" to message.messageType,
                "messageNumber" to (message.messageNumber?.toString() ?: ""),
                "chainLength" to (message.chainLength?.toString() ?: ""),
                "timestamp" to message.timestamp.toString(),
                "isDeleted" to message.isDeleted.toString()
            )
            
            // Use list to store multiple messages per user in order
            val messageJson = mapToJson(messageData)
            redisTemplate.opsForList().rightPush(key, messageJson)
            redisTemplate.expire(key, Duration.ofHours(MESSAGE_EXPIRY_HOURS))
            logger.debug("Successfully stored offline message for user: {} with lock", recipientHashedId)
        }
        
        if (result == null) {
            logger.warn("Failed to acquire lock for storing offline message for user: {}", recipientHashedId)
        }
    }
    
    /**
     * Get all offline messages for a user and remove them from storage with distributed lock
     */
    fun getAndClearOfflineMessages(userId: String): List<OfflineMessage> {
        val lockKey = "${OFFLINE_MESSAGE_LOCK_PREFIX}${userId}"
        logger.debug("Attempting to acquire lock for retrieving offline messages for user: {}", userId)
        
        val result = distributedLock.withLock(lockKey, timeoutSeconds = 5L, acquireTimeoutMillis = 3000L) {
            val key = "${OFFLINE_MESSAGE_PREFIX}${userId}"
            val messageJsonList = redisTemplate.opsForList().range(key, 0, -1) ?: emptyList()
            
            if (messageJsonList.isNotEmpty()) {
                redisTemplate.delete(key)
                logger.debug("Retrieved and cleared {} offline messages for user: {} with lock", messageJsonList.size, userId)
            } else {
                logger.debug("No offline messages found for user: {}", userId)
            }
            
            messageJsonList.mapNotNull { messageJson ->
                try {
                    jsonToOfflineMessage(messageJson)
                } catch (e: Exception) {
                    logger.error("Failed to parse offline message: {}", messageJson, e)
                    null
                }
            }
        }
        
        if (result == null) {
            logger.warn("Failed to acquire lock for retrieving offline messages for user: {}", userId)
            return emptyList()
        }
        
        return result
    }
    
    /**
     * Check if user has offline messages
     */
    fun hasOfflineMessages(userId: String): Boolean {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userId}"
        return (redisTemplate.opsForList().size(key) ?: 0) > 0
    }
    
    /**
     * Get count of offline messages for a user
     */
    fun getOfflineMessageCount(userId: String): Long {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userId}"
        return redisTemplate.opsForList().size(key) ?: 0
    }
    
    /**
     * Clear all offline messages for a user (used during account deletion)
     */
    fun clearAllOfflineMessages(userId: String) {
        val key = "${OFFLINE_MESSAGE_PREFIX}${userId}"
        val deleted = redisTemplate.delete(key)
        logger.info("Cleared offline messages for user: {}, deleted: {}", userId, deleted)
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
            senderId = data["senderId"] ?: "",
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
    val senderId: String,
    val encryptedContent: String,
    val contentIv: String,
    val messageType: String,
    val messageNumber: Int?,
    val chainLength: Int?,
    val timestamp: LocalDateTime,
    val isDeleted: Boolean
)