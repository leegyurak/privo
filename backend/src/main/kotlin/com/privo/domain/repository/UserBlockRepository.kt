package com.privo.domain.repository

import com.privo.domain.model.UserBlock

interface UserBlockRepository {
    fun save(userBlock: UserBlock): UserBlock
    fun findById(id: String): UserBlock?
    fun findByBlockerUserIdAndBlockedUserId(blockerUserId: String, blockedUserId: String): UserBlock?
    fun findActiveByBlockerUserId(blockerUserId: String): List<UserBlock>
    fun findActiveByBlockedUserId(blockedUserId: String): List<UserBlock>
    fun isUserBlocked(blockerUserId: String, blockedUserId: String): Boolean
    fun deleteById(id: String)
}