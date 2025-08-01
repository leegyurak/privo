package com.privo.presentation.controller

import com.privo.infrastructure.security.EnhancedEncryptionService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.Base64

@RestController
@RequestMapping("/api/encryption")
class EncryptionController(
    private val enhancedEncryptionService: EnhancedEncryptionService
) {
    
    /**
     * Generate cryptographic key pair for the current user
     */
    @PostMapping("/keypair")
    fun generateKeyPair(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<KeyPairResponse> {
        val userHashedId = userDetails.username
        val keyPair = enhancedEncryptionService.generateUserKeyPair(userHashedId)
        
        return ResponseEntity.ok(
            KeyPairResponse(
                userId = keyPair.userId,
                publicKey = Base64.getEncoder().encodeToString(keyPair.publicKey),
                message = "Key pair generated successfully. Private key is securely stored."
            )
        )
    }
}

data class KeyPairResponse(
    val userId: String,
    val publicKey: String,
    val message: String
)