package com.privo.infrastructure.persistence

import com.privo.domain.model.UserBlock
import com.privo.domain.repository.UserBlockRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

interface JpaUserBlockRepository : JpaRepository<UserBlock, String>, UserBlockRepository {
    
    @Query("SELECT ub FROM UserBlock ub WHERE ub.blockerUserId = :blockerUserId AND ub.blockedUserId = :blockedUserId")
    override fun findByBlockerUserIdAndBlockedUserId(
        @Param("blockerUserId") blockerUserId: String, 
        @Param("blockedUserId") blockedUserId: String
    ): UserBlock?
    
    @Query("SELECT ub FROM UserBlock ub WHERE ub.blockerUserId = :blockerUserId AND ub.isActive = true")
    override fun findActiveByBlockerUserId(@Param("blockerUserId") blockerUserId: String): List<UserBlock>
    
    @Query("SELECT ub FROM UserBlock ub WHERE ub.blockedUserId = :blockedUserId AND ub.isActive = true")
    override fun findActiveByBlockedUserId(@Param("blockedUserId") blockedUserId: String): List<UserBlock>
    
    @Query("SELECT CASE WHEN COUNT(ub) > 0 THEN true ELSE false END FROM UserBlock ub WHERE ub.blockerUserId = :blockerUserId AND ub.blockedUserId = :blockedUserId AND ub.isActive = true")
    override fun isUserBlocked(
        @Param("blockerUserId") blockerUserId: String, 
        @Param("blockedUserId") blockedUserId: String
    ): Boolean
}