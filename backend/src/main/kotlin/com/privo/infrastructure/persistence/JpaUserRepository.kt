package com.privo.infrastructure.persistence

import com.privo.domain.model.User
import com.privo.domain.repository.UserRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

interface JpaUserDataRepository : JpaRepository<User, String> {
    fun findByNickname(nickname: String): User?
    fun existsByNickname(nickname: String): Boolean
}

@Repository
class JpaUserRepository(
    private val jpaUserDataRepository: JpaUserDataRepository
) : UserRepository {
    
    override fun save(user: User): User {
        return jpaUserDataRepository.save(user)
    }
    
    override fun findById(id: String): User? {
        return jpaUserDataRepository.findById(id).orElse(null)
    }
    
    override fun findByNickname(nickname: String): User? {
        return jpaUserDataRepository.findByNickname(nickname)
    }
    
    override fun delete(user: User) {
        jpaUserDataRepository.delete(user)
    }
    
    override fun existsByNickname(nickname: String): Boolean {
        return jpaUserDataRepository.existsByNickname(nickname)
    }
}