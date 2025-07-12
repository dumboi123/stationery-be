-- Create databases for each service
CREATE DATABASE user_service_db;
CREATE DATABASE product_service_db;
CREATE DATABASE order_service_db;
CREATE DATABASE payment_service_db;
CREATE DATABASE analytics_service_db;

-- Create users for each service
CREATE USER user_service_user WITH PASSWORD 'user_service_password';
CREATE USER product_service_user WITH PASSWORD 'product_service_password';
CREATE USER order_service_user WITH PASSWORD 'order_service_password';
CREATE USER payment_service_user WITH PASSWORD 'payment_service_password';
CREATE USER analytics_service_user WITH PASSWORD 'analytics_service_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE user_service_db TO user_service_user;
GRANT ALL PRIVILEGES ON DATABASE product_service_db TO product_service_user;
GRANT ALL PRIVILEGES ON DATABASE order_service_db TO order_service_user;
GRANT ALL PRIVILEGES ON DATABASE payment_service_db TO payment_service_user;
GRANT ALL PRIVILEGES ON DATABASE analytics_service_db TO analytics_service_user;

-- Create extensions
\c user_service_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c product_service_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c order_service_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c payment_service_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c analytics_service_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
