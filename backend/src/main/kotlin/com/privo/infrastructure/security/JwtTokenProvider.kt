package com.privo.infrastructure.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    @Value("\${privo.jwt.secret}")
    private val jwtSecret: String,
    @Value("\${privo.jwt.expiration}")
    private val jwtExpiration: Long
) {
    
    private val key: SecretKey = Keys.hmacShaKeyFor(jwtSecret.toByteArray())
    
    fun generateToken(userId: String): String {
        val now = Date()
        val expiryDate = Date(now.time + jwtExpiration)
        
        return Jwts.builder()
            .subject(userId)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key)
            .compact()
    }
    
    fun getUserIdFromToken(token: String): String {
        val claims: Claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
        
        return claims.subject ?: throw IllegalArgumentException("Token subject is null")
    }
    
    fun validateToken(token: String): Boolean {
        try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
            return true
        } catch (e: Exception) {
            return false
        }
    }
    
    fun getExpirationTime(): Long {
        return jwtExpiration
    }
}