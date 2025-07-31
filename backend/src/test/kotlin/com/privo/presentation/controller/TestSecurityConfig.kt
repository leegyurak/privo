package com.privo.presentation.controller

import com.privo.infrastructure.security.JwtTokenProvider
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.test.context.ActiveProfiles
import io.mockk.mockk

@TestConfiguration
@EnableWebSecurity
@ActiveProfiles("test")
class TestSecurityConfig {
    
    @Bean
    @Primary
    fun testJwtTokenProvider(): JwtTokenProvider {
        return mockk<JwtTokenProvider>(relaxed = true)
    }
    
    @Bean
    @Primary
    fun testUserDetailsService(): UserDetailsService {
        val user = User.builder()
            .username("hashed-user-id")
            .password("password")
            .authorities("USER")
            .build()
        return InMemoryUserDetailsManager(user)
    }
    
    @Bean
    fun testSecurityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/chat/**").authenticated()
                    .anyRequest().permitAll()
            }
        
        return http.build()
    }
}