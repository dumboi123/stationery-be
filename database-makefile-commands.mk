# Updated Makefile commands for new database services

# Database services
up-postgres: ## Start PostgreSQL only
	@echo "🚀 Starting PostgreSQL..."
	docker-compose up -d postgres

up-mongodb: ## Start MongoDB only
	@echo "🚀 Starting MongoDB..."
	docker-compose up -d mongodb

up-oracle: ## Start Oracle only
	@echo "🚀 Starting Oracle Database..."
	docker-compose up -d oracle

up-redis: ## Start Redis only
	@echo "🚀 Starting Redis..."
	docker-compose up -d redis

up-elasticsearch: ## Start Elasticsearch only
	@echo "🚀 Starting Elasticsearch..."
	docker-compose up -d elasticsearch

up-kafka: ## Start Kafka + Zookeeper
	@echo "🚀 Starting Kafka ecosystem..."
	docker-compose up -d zookeeper kafka

up-rabbitmq: ## Start RabbitMQ only
	@echo "🚀 Starting RabbitMQ..."
	docker-compose up -d rabbitmq

# Database combinations
up-dbs: ## Start all databases
	@echo "🚀 Starting all databases..."
	docker-compose up -d postgres mongodb oracle redis elasticsearch zookeeper kafka rabbitmq

up-core: ## Start core infrastructure only
	@echo "🚀 Starting core infrastructure..."
	docker-compose up -d postgres mongodb oracle redis

up-messaging: ## Start messaging services only
	@echo "🚀 Starting messaging services..."
	docker-compose up -d rabbitmq zookeeper kafka

up-search: ## Start search services only
	@echo "🚀 Starting search services..."
	docker-compose up -d elasticsearch

# Development tools
up-dev-tools: ## Start development tools
	@echo "🚀 Starting development tools..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d pgadmin mongo-express redis-commander kibana kafka-ui adminer portainer

# Service-specific development environments
up-user-dev: ## Start User Service development stack
	@echo "🚀 Starting User Service development..."
	docker-compose up -d postgres redis kafka api-gateway user-service

up-product-dev: ## Start Product Service development stack
	@echo "🚀 Starting Product Service development..."
	docker-compose up -d mongodb redis elasticsearch kafka api-gateway product-service

up-order-dev: ## Start Order Service development stack
	@echo "🚀 Starting Order Service development..."
	docker-compose up -d oracle redis rabbitmq kafka api-gateway order-service

up-payment-dev: ## Start Payment Service development stack
	@echo "🚀 Starting Payment Service development..."
	docker-compose up -d postgres redis kafka api-gateway payment-service

up-notification-dev: ## Start Notification Service development stack
	@echo "🚀 Starting Notification Service development..."
	docker-compose up -d redis rabbitmq kafka api-gateway notification-service

up-analytics-dev: ## Start Analytics Service development stack
	@echo "🚀 Starting Analytics Service development..."
	docker-compose up -d oracle redis elasticsearch kafka api-gateway analytics-service

# Database logs
logs-postgres: ## Show PostgreSQL logs
	docker-compose logs -f postgres

logs-mongodb: ## Show MongoDB logs
	docker-compose logs -f mongodb

logs-oracle: ## Show Oracle logs
	docker-compose logs -f oracle

logs-redis: ## Show Redis logs
	docker-compose logs -f redis

logs-elasticsearch: ## Show Elasticsearch logs
	docker-compose logs -f elasticsearch

logs-kafka: ## Show Kafka logs
	docker-compose logs -f kafka

logs-rabbitmq: ## Show RabbitMQ logs
	docker-compose logs -f rabbitmq

# Database shell access
shell-postgres: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U admin -d microservices_db

shell-mongodb: ## Open MongoDB shell
	docker-compose exec mongodb mongosh -u admin -p password

shell-oracle: ## Open Oracle shell
	docker-compose exec oracle sqlplus admin/password@//localhost:1521/XEPDB1

shell-redis: ## Open Redis shell
	docker-compose exec redis redis-cli -a password

# Database admin interfaces
ui-postgres: ## Open PostgreSQL Admin (pgAdmin)
	@echo "🌐 PostgreSQL Admin: http://localhost:5050"
	@echo "📧 Email: admin@example.com"
	@echo "🔑 Password: admin"

ui-mongodb: ## Open MongoDB Admin (Mongo Express)
	@echo "🌐 MongoDB Admin: http://localhost:8082"
	@echo "🔑 Username: admin"
	@echo "🔑 Password: admin"

ui-oracle: ## Open Oracle Admin (Oracle APEX)
	@echo "🌐 Oracle Admin: http://localhost:8080"
	@echo "🔑 Username: admin"
	@echo "🔑 Password: password"

ui-redis: ## Open Redis Admin (Redis Commander)
	@echo "🌐 Redis Admin: http://localhost:8081"

ui-elasticsearch: ## Open Elasticsearch Admin (Kibana)
	@echo "🌐 Elasticsearch Admin: http://localhost:5601"

ui-kafka: ## Open Kafka Admin (Kafka UI)
	@echo "🌐 Kafka Admin: http://localhost:8080"

ui-rabbitmq: ## Open RabbitMQ Admin
	@echo "🌐 RabbitMQ Admin: http://localhost:15672"
	@echo "🔑 Username: admin"
	@echo "🔑 Password: password"

ui-adminer: ## Open Adminer (Universal DB Admin)
	@echo "🌐 Adminer: http://localhost:8080"

ui-portainer: ## Open Portainer (Docker Admin)
	@echo "🌐 Portainer: http://localhost:9443"

# Database maintenance
clean-postgres: ## Clean PostgreSQL data
	docker-compose down postgres
	docker volume rm microservices_postgres_data

clean-mongodb: ## Clean MongoDB data
	docker-compose down mongodb
	docker volume rm microservices_mongodb_data

clean-oracle: ## Clean Oracle data
	docker-compose down oracle
	docker volume rm microservices_oracle_data

clean-redis: ## Clean Redis data
	docker-compose down redis
	docker volume rm microservices_redis_data

clean-elasticsearch: ## Clean Elasticsearch data
	docker-compose down elasticsearch
	docker volume rm microservices_elasticsearch_data

clean-kafka: ## Clean Kafka data
	docker-compose down kafka zookeeper
	docker volume rm microservices_kafka_data microservices_zookeeper_data microservices_zookeeper_logs

clean-rabbitmq: ## Clean RabbitMQ data
	docker-compose down rabbitmq
	docker volume rm microservices_rabbitmq_data

clean-all-dbs: ## Clean all database data
	docker-compose down
	docker volume rm microservices_postgres_data microservices_mongodb_data microservices_oracle_data microservices_redis_data microservices_elasticsearch_data microservices_kafka_data microservices_zookeeper_data microservices_zookeeper_logs microservices_rabbitmq_data

# Database backups
backup-postgres: ## Backup PostgreSQL
	@echo "🗄️ Backing up PostgreSQL..."
	docker-compose exec postgres pg_dumpall -U admin > backups/postgres_backup_$(shell date +%Y%m%d_%H%M%S).sql

backup-mongodb: ## Backup MongoDB
	@echo "🗄️ Backing up MongoDB..."
	docker-compose exec mongodb mongodump --username admin --password password --out /tmp/backup
	docker-compose exec mongodb tar -czf /tmp/mongodb_backup_$(shell date +%Y%m%d_%H%M%S).tar.gz /tmp/backup

backup-oracle: ## Backup Oracle
	@echo "🗄️ Backing up Oracle..."
	docker-compose exec oracle exp admin/password@//localhost:1521/XEPDB1 file=/tmp/oracle_backup_$(shell date +%Y%m%d_%H%M%S).dmp

# Health checks
health-postgres: ## Check PostgreSQL health
	docker-compose exec postgres pg_isready -U admin

health-mongodb: ## Check MongoDB health
	docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

health-oracle: ## Check Oracle health
	docker-compose exec oracle sqlplus -s admin/password@//localhost:1521/XEPDB1 <<< "SELECT 'Oracle is healthy' FROM dual;"

health-redis: ## Check Redis health
	docker-compose exec redis redis-cli -a password ping

health-elasticsearch: ## Check Elasticsearch health
	curl -f http://localhost:9200/_cluster/health || echo "Elasticsearch is not healthy"

health-kafka: ## Check Kafka health
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

health-rabbitmq: ## Check RabbitMQ health
	docker-compose exec rabbitmq rabbitmqctl status

health-all-dbs: ## Check all database health
	@echo "🏥 Checking database health..."
	@$(MAKE) health-postgres
	@$(MAKE) health-mongodb
	@$(MAKE) health-oracle
	@$(MAKE) health-redis
	@$(MAKE) health-elasticsearch
	@$(MAKE) health-kafka
	@$(MAKE) health-rabbitmq

# Development shortcuts
dev-reset: ## Reset development environment
	docker-compose down
	docker-compose up -d postgres mongodb oracle redis elasticsearch zookeeper kafka rabbitmq
	@echo "⏳ Waiting for databases to be ready..."
	sleep 30
	@$(MAKE) health-all-dbs

dev-quick: ## Quick development start (core services only)
	docker-compose up -d postgres mongodb redis api-gateway

dev-full: ## Full development start (all services)
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Monitoring
monitor-resources: ## Monitor resource usage
	docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

monitor-logs: ## Monitor all logs
	docker-compose logs -f --tail=100

# Help
help-databases: ## Show database help
	@echo "📊 Database Services:"
	@echo "  PostgreSQL: User, Payment, Blog services"
	@echo "  MongoDB: Product, Inventory, Cart services"
	@echo "  Oracle: Order, Analytics services"
	@echo "  Redis: Caching for all services"
	@echo "  Elasticsearch: Search functionality"
	@echo "  Kafka: Event streaming"
	@echo "  RabbitMQ: Message queuing"
	@echo ""
	@echo "🌐 Admin Interfaces:"
	@echo "  pgAdmin: http://localhost:5050"
	@echo "  Mongo Express: http://localhost:8082"
	@echo "  Redis Commander: http://localhost:8081"
	@echo "  Kibana: http://localhost:5601"
	@echo "  Kafka UI: http://localhost:8080"
	@echo "  RabbitMQ: http://localhost:15672"
	@echo "  Adminer: http://localhost:8080"
	@echo "  Portainer: http://localhost:9443"
