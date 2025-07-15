-- Oracle Database initialization for microservices
-- This script creates schemas and initial tables for Order and Analytics services

-- Create schemas
CREATE USER order_service IDENTIFIED BY order_password;
CREATE USER analytics_service IDENTIFIED BY analytics_password;

-- Grant permissions
GRANT CREATE SESSION TO order_service;
GRANT CREATE TABLE TO order_service;
GRANT CREATE SEQUENCE TO order_service;
GRANT CREATE VIEW TO order_service;
GRANT CREATE PROCEDURE TO order_service;
GRANT UNLIMITED TABLESPACE TO order_service;

GRANT CREATE SESSION TO analytics_service;
GRANT CREATE TABLE TO analytics_service;
GRANT CREATE SEQUENCE TO analytics_service;
GRANT CREATE VIEW TO analytics_service;
GRANT CREATE PROCEDURE TO analytics_service;
GRANT UNLIMITED TABLESPACE TO analytics_service;

-- Connect as order_service user
CONNECT order_service/order_password@//localhost:1521/XEPDB1;

-- Create Order Service tables
CREATE TABLE orders (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id RAW(16) NOT NULL,
    total_amount NUMBER(10,2) NOT NULL,
    currency VARCHAR2(3) DEFAULT 'USD',
    status VARCHAR2(20) DEFAULT 'pending',
    payment_status VARCHAR2(20) DEFAULT 'pending',
    shipping_address CLOB,
    billing_address CLOB,
    notes CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    order_id RAW(16) NOT NULL,
    product_id VARCHAR2(100) NOT NULL,
    product_name VARCHAR2(255) NOT NULL,
    quantity NUMBER(10) NOT NULL,
    unit_price NUMBER(10,2) NOT NULL,
    total_price NUMBER(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE order_status_history (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    order_id RAW(16) NOT NULL,
    old_status VARCHAR2(20),
    new_status VARCHAR2(20) NOT NULL,
    reason VARCHAR2(255),
    changed_by RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- Create sequences
CREATE SEQUENCE order_number_seq START WITH 1000000 INCREMENT BY 1;

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Connect as analytics_service user
CONNECT analytics_service/analytics_password@//localhost:1521/XEPDB1;

-- Create Analytics Service tables
CREATE TABLE user_analytics (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id RAW(16) NOT NULL,
    event_type VARCHAR2(50) NOT NULL,
    event_data CLOB,
    user_agent VARCHAR2(500),
    ip_address VARCHAR2(45),
    session_id VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_analytics (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    product_id VARCHAR2(100) NOT NULL,
    event_type VARCHAR2(50) NOT NULL,
    event_data CLOB,
    user_id RAW(16),
    session_id VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_analytics (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    order_id RAW(16) NOT NULL,
    user_id RAW(16) NOT NULL,
    total_amount NUMBER(10,2) NOT NULL,
    currency VARCHAR2(3) DEFAULT 'USD',
    payment_method VARCHAR2(50),
    shipping_method VARCHAR2(50),
    order_source VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_metrics (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_type VARCHAR2(50) NOT NULL,
    metric_value NUMBER(15,2) NOT NULL,
    metric_unit VARCHAR2(20),
    additional_data CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics
CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX idx_user_analytics_created_at ON user_analytics(created_at);
CREATE INDEX idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX idx_product_analytics_event_type ON product_analytics(event_type);
CREATE INDEX idx_product_analytics_created_at ON product_analytics(created_at);
CREATE INDEX idx_order_analytics_user_id ON order_analytics(user_id);
CREATE INDEX idx_order_analytics_created_at ON order_analytics(created_at);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_daily_metrics_type ON daily_metrics(metric_type);

-- Create materialized views for common analytics queries
CREATE MATERIALIZED VIEW mv_daily_order_summary AS
SELECT 
    TRUNC(created_at) as order_date,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value,
    MIN(total_amount) as min_order_value,
    MAX(total_amount) as max_order_value
FROM order_analytics
GROUP BY TRUNC(created_at);

CREATE MATERIALIZED VIEW mv_product_popularity AS
SELECT 
    product_id,
    COUNT(*) as view_count,
    COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchase_count,
    COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as cart_count
FROM product_analytics
WHERE created_at >= TRUNC(SYSDATE - 30)
GROUP BY product_id;

-- Insert sample data for testing
INSERT INTO daily_metrics (metric_date, metric_type, metric_value, metric_unit) VALUES
(TRUNC(SYSDATE), 'total_orders', 150, 'count');

INSERT INTO daily_metrics (metric_date, metric_type, metric_value, metric_unit) VALUES
(TRUNC(SYSDATE), 'total_revenue', 15000.50, 'USD');

INSERT INTO daily_metrics (metric_date, metric_type, metric_value, metric_unit) VALUES
(TRUNC(SYSDATE), 'avg_order_value', 100.00, 'USD');

COMMIT;

-- Create procedures for common operations
CREATE OR REPLACE PROCEDURE track_user_event(
    p_user_id RAW,
    p_event_type VARCHAR2,
    p_event_data CLOB,
    p_user_agent VARCHAR2 DEFAULT NULL,
    p_ip_address VARCHAR2 DEFAULT NULL,
    p_session_id VARCHAR2 DEFAULT NULL
) IS
BEGIN
    INSERT INTO user_analytics (
        user_id, event_type, event_data, user_agent, ip_address, session_id
    ) VALUES (
        p_user_id, p_event_type, p_event_data, p_user_agent, p_ip_address, p_session_id
    );
    COMMIT;
END;

CREATE OR REPLACE PROCEDURE track_product_event(
    p_product_id VARCHAR2,
    p_event_type VARCHAR2,
    p_event_data CLOB,
    p_user_id RAW DEFAULT NULL,
    p_session_id VARCHAR2 DEFAULT NULL
) IS
BEGIN
    INSERT INTO product_analytics (
        product_id, event_type, event_data, user_id, session_id
    ) VALUES (
        p_product_id, p_event_type, p_event_data, p_user_id, p_session_id
    );
    COMMIT;
END;

-- Grant necessary permissions between services
GRANT SELECT ON analytics_service.order_analytics TO order_service;
GRANT INSERT ON analytics_service.order_analytics TO order_service;

COMMIT;
