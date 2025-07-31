# Database Migration Guide

## Overview
Privo uses Flyway for database schema versioning and migrations. This ensures consistent database states across different environments and enables safe schema evolution.

## Migration Structure

### Directory Layout
```
src/main/resources/db/migration/
├── V1__Initial_schema.sql
├── V2__Add_indexes_and_constraints.sql
└── V{version}__{description}.sql
```

### Naming Convention
- **Version**: `V{version}__{description}.sql`
- **Versioned**: `V1__Initial_schema.sql`
- **Repeatable**: `R__{description}.sql` (not used in this project)

### Version Numbers
- Use sequential integers: V1, V2, V3, etc.
- Use semantic versioning for major releases: V1_1, V1_2, V2_0, etc.
- Always use two underscores (`__`) between version and description

## Available Commands

### Basic Migration Commands
```bash
# Run pending migrations
make db-migrate

# Show migration status
make db-info

# Validate migrations
make db-validate

# Create baseline (for existing databases)
make db-baseline

# Repair migration metadata
make db-repair
```

### Environment-Specific Setup
```bash
# Setup development database
make db-setup-dev

# Setup test database  
make db-setup-test

# Reset database completely
make db-reset
```

### Dangerous Operations
```bash
# Clean database (removes all data and schema)
make db-clean  # Will prompt for confirmation
```

## Migration Scripts

### V1: Initial Schema
Creates the core tables:
- `users`: User accounts with encrypted authentication
- `chat_rooms`: Chat room definitions
- `chat_room_members`: User-room relationships
- `chat_messages`: Encrypted message storage

### V2: Indexes and Constraints
Adds performance indexes and data validation constraints:
- Query optimization indexes
- Data integrity constraints
- Table comments for documentation

## Writing New Migrations

### Guidelines
1. **Always test migrations** on a copy of production data
2. **Use transactions** - Flyway automatically wraps each script
3. **Make migrations idempotent** when possible
4. **Add proper indexes** for query performance
5. **Document changes** with comments

### Example Migration
```sql
-- V3__Add_user_preferences.sql
-- Add user preference settings table

CREATE TABLE user_preferences (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_preferences (user_id, preference_key),
    INDEX idx_user_preferences_user (user_id),
    INDEX idx_user_preferences_key (preference_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some default preferences
INSERT INTO user_preferences (id, user_id, preference_key, preference_value)
SELECT 
    UUID(),
    id,
    'theme',
    'light'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'theme'
);
```

### Data Migrations
For data transformations, create separate migration files:

```sql
-- V4__Migrate_user_data.sql
-- Transform existing user data

-- Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Populate from existing data
UPDATE users 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Drop old columns (in next migration for safety)
-- ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

## Environment Configuration

### Development (H2)
- Flyway disabled by default
- Uses JPA DDL auto-generation
- Fast startup for development

```yaml
spring:
  flyway:
    enabled: false
  jpa:
    hibernate:
      ddl-auto: create-drop
```

### Production (MySQL)
- Flyway enabled and required
- JPA validation only
- Schema managed by migrations

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
  jpa:
    hibernate:
      ddl-auto: validate
```

## Testing Migrations

### Automated Tests
Migration tests are located in:
```
src/test/kotlin/com/privo/infrastructure/migration/FlywayMigrationTest.kt
```

Run migration tests:
```bash
./gradlew test --tests "*Migration*"
```

### Manual Testing
```bash
# Test on clean database
make db-reset

# Test incremental migrations
make db-migrate
make db-info

# Test rollback scenarios (create backup first)
make db-clean
# Restore from backup
make db-migrate
```

## Troubleshooting

### Common Issues

#### Migration Checksum Mismatch
```bash
# Repair migration metadata
make db-repair

# Or baseline from current state
make db-baseline
```

#### Failed Migration
```bash
# Check migration status
make db-info

# Manual cleanup may be required
# Fix the issue and re-run
make db-migrate
```

#### Schema Drift
```bash
# Validate schema matches migrations
make db-validate

# If validation fails, check for manual schema changes
```

### Recovery Procedures

#### Start Fresh
```bash
# Complete reset (development only)
make db-clean
make db-migrate
```

#### Production Recovery
1. **Create backup** before any changes
2. **Identify failed migration** with `make db-info`
3. **Manual rollback** of partial changes
4. **Fix migration script** 
5. **Re-run migration** with `make db-migrate`
6. **Validate** with `make db-validate`

## Best Practices

### Schema Design
- Use consistent naming conventions
- Add appropriate indexes from the start
- Include foreign key constraints where applicable
- Use proper data types and sizes

### Migration Safety
- Test on representative data
- Use feature flags for application changes
- Plan rollback procedures
- Monitor migration performance

### Version Control
- Never modify existing migration files
- Create new migrations for changes
- Include migration files in code reviews
- Tag releases with migration versions

### Performance
- Create indexes concurrently when possible
- Batch large data migrations
- Monitor migration execution time
- Consider maintenance windows for large changes

## Monitoring

### Migration Status
```bash
# Check current schema version
make db-info

# Validate all migrations
make db-validate

# Application health check
make health-check
```

### Metrics
- Migration execution time
- Schema validation status  
- Database connection health
- Query performance impact

## Integration with CI/CD

### Build Pipeline
```bash
# Validation step
make db-validate

# Test migrations
make test-full

# Production deployment
make prod-build
```

### Deployment Process
1. **Backup database**
2. **Run migrations**: `make db-migrate`
3. **Validate schema**: `make db-validate`
4. **Deploy application**
5. **Health check**: `make health-check`