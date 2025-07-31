package com.privo.domain.repository

import com.privo.domain.model.User
import java.util.*

interface UserRepository {
    fun save(user: User): User
    fun findById(id: String): User?
    fun findByNickname(nickname: String): User?
    fun delete(user: User)
    fun existsByNickname(nickname: String): Boolean
}