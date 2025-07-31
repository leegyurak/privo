package com.privo.infrastructure.migration

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import javax.sql.DataSource
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfSystemProperty(named = "test.containers.enabled", matches = "true")
class FlywayMigrationTest {

    companion object {
        @Container
        @JvmStatic
        val mysqlContainer = MySQLContainer<Nothing>("mysql:8.0").apply {
            withDatabaseName("privo_migration_test")
            withUsername("test")
            withPassword("test")
            withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci")
        }

        @DynamicPropertySource
        @JvmStatic
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", mysqlContainer::getJdbcUrl)
            registry.add("spring.datasource.username", mysqlContainer::getUsername)
            registry.add("spring.datasource.password", mysqlContainer::getPassword)
            registry.add("spring.flyway.enabled") { "true" }
        }
    }

    @Autowired
    private lateinit var dataSource: DataSource

    @Test
    fun `should run all migrations successfully`() {
        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()

        val migrationInfo = flyway.info()
        val appliedMigrations = migrationInfo.applied()

        assertTrue(appliedMigrations.isNotEmpty(), "At least one migration should be applied")
        assertEquals("SUCCESS", appliedMigrations.last().state.displayName)
    }

    @Test
    fun `should create all required tables`() {
        val jdbcTemplate = JdbcTemplate(dataSource)
        
        // Check if all tables exist
        val tableNames = listOf("users", "chat_rooms", "chat_room_members", "chat_messages")
        
        tableNames.forEach { tableName ->
            val count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
                Int::class.java,
                tableName
            )
            assertEquals(1, count, "Table $tableName should exist")
        }
    }

    @Test
    fun `should have correct users table structure`() {
        val jdbcTemplate = JdbcTemplate(dataSource)
        
        val columns = jdbcTemplate.queryForList(
            """
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() AND table_name = 'users'
            ORDER BY ORDINAL_POSITION
            """.trimIndent()
        )

        assertTrue(columns.isNotEmpty(), "Users table should have columns")
        
        val columnNames = columns.map { it["COLUMN_NAME"] as String }
        val expectedColumns = listOf(
            "id", "nickname", "password_hash", "public_key_hash",
            "created_at", "updated_at"
        )
        
        expectedColumns.forEach { expectedColumn ->
            assertTrue(
                columnNames.contains(expectedColumn),
                "Users table should have column $expectedColumn"
            )
        }
    }

    @Test
    fun `should have correct chat_messages table structure`() {
        val jdbcTemplate = JdbcTemplate(dataSource)
        
        val columns = jdbcTemplate.queryForList(
            """
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() AND table_name = 'chat_messages'
            ORDER BY ORDINAL_POSITION
            """.trimIndent()
        )

        val columnNames = columns.map { it["COLUMN_NAME"] as String }
        val expectedColumns = listOf(
            "id", "chat_room_id", "sender_hashed_id", "encrypted_content",
            "content_iv", "message_type", "timestamp", "is_deleted"
        )
        
        expectedColumns.forEach { expectedColumn ->
            assertTrue(
                columnNames.contains(expectedColumn),
                "Chat messages table should have column $expectedColumn"
            )
        }
    }

    @Test
    fun `should have correct indexes`() {
        val jdbcTemplate = JdbcTemplate(dataSource)
        
        // Check for important indexes
        val indexes = jdbcTemplate.queryForList(
            """
            SELECT DISTINCT INDEX_NAME, TABLE_NAME
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND INDEX_NAME != 'PRIMARY'
            ORDER BY TABLE_NAME, INDEX_NAME
            """.trimIndent()
        )

        val indexNames = indexes.map { it["INDEX_NAME"] as String }
        
        // Check for some key indexes
        val expectedIndexes = listOf(
            "uk_users_nickname",
            "idx_users_nickname",
            "idx_chat_messages_room_timestamp",
            "uk_chat_room_members"
        )
        
        expectedIndexes.forEach { expectedIndex ->
            assertTrue(
                indexNames.contains(expectedIndex),
                "Should have index $expectedIndex"
            )
        }
    }

    @Test
    fun `should have correct enum values for message_type`() {
        val jdbcTemplate = JdbcTemplate(dataSource)
        
        val enumValues = jdbcTemplate.queryForObject(
            """
            SELECT COLUMN_TYPE
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'chat_messages' 
            AND column_name = 'message_type'
            """.trimIndent(),
            String::class.java
        )

        assertNotNull(enumValues)
        assertTrue(enumValues.contains("TEXT"))
        assertTrue(enumValues.contains("IMAGE"))
        assertTrue(enumValues.contains("FILE"))
        assertTrue(enumValues.contains("SYSTEM"))
    }

    @Test
    fun `should validate migration checksums`() {
        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()

        // This will throw an exception if checksums don't match
        flyway.validate()
    }
}