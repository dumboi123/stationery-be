#!/bin/bash

set -e
set -u

function create_user_and_database() {
    local database=$1
    echo "Creating user and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE USER ${database}_user WITH PASSWORD '${database}_password';
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO ${database}_user;
        
        -- Create schemas for microservices
        \c $database;
        CREATE SCHEMA IF NOT EXISTS public;
        CREATE SCHEMA IF NOT EXISTS audit;
        CREATE SCHEMA IF NOT EXISTS config;
        
        -- Grant permissions
        GRANT ALL ON SCHEMA public TO ${database}_user;
        GRANT ALL ON SCHEMA audit TO ${database}_user;
        GRANT ALL ON SCHEMA config TO ${database}_user;
        
        -- Create common tables
        CREATE TABLE IF NOT EXISTS audit.activity_log (
            id SERIAL PRIMARY KEY,
            user_id UUID,
            action VARCHAR(100),
            resource_type VARCHAR(50),
            resource_id VARCHAR(100),
            details JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS config.feature_flags (
            id SERIAL PRIMARY KEY,
            feature_name VARCHAR(100) UNIQUE NOT NULL,
            is_enabled BOOLEAN DEFAULT FALSE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi
