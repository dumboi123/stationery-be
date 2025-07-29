# 🚀 Kiến Trúc Microservices Đa Ngôn Ngữ

> **Hệ sinh thái microservices học tập toàn diện với Go, Python, Node.js, và Java**

**Dành cho:** Backend developers, System architects, DevOps engineers muốn thành thạo kiến trúc microservices hiện đại.

## 🎯 Những Gì Bạn Sẽ Học

- **3 Ngôn Ngữ**: Go, Node.js, Java trong môi trường production
- **4 Database**: PostgreSQL, MongoDB, Oracle, Redis với use cases thực tế
- **Microservices Patterns**: API Gateway, Circuit Breakers, Event Sourcing, CQRS
- **Cloud-Native**: Docker, Kubernetes, gRPC, REST APIs
- **DevOps**: CI/CD, Infrastructure as Code, Monitoring & Security

## 🏗️ Kiến Trúc 9 Services

**API Gateway** (Node.js + Redis) -> Trình
**User Service** (Go + PostgreSQL) -> Trình + Hiệu
**Order Service** (Java + Oracle) or (Go + PostgreSQL) -> Chánh
**Product Service** (Nodejs + MongoDB) -> Khải + Nam
**Inventory Service** (Go + MongoDB) -> Nam
**Cart Service** (Node.js + Redis) -> Chánh
**Payment Service** (Go + PostgreSQL) -> Khải

<!-- **Analytics Service** (Java + Oracle)  -->
<!-- **Blog Service** (Node.js + PostgreSQL) -->


### Lý Do Chọn Tech Stack

- **Go**: Concurrency tuyệt vời, hiệu năng cao cho User/Payment/Inventory
- **Python**: FastAPI rapid development cho Product Service  
- **Node.js**: Event-driven cho API Gateway/Cart/Blog
- **Java**: Spring Boot enterprise cho Order/Analytics
- **PostgreSQL**: ACID cho financial data (User/Payment/Blog)
- **MongoDB**: Schema flexibility cho Product/Inventory
- **Oracle**: Enterprise analytics cho Order/Analytics  
- **Redis**: In-memory performance cho Gateway/Cart

## 🏛️ Microservices Patterns Chính

### Core Patterns
- **API Gateway**: Single entry point, routing, authentication, rate limiting
- **Database Per Service**: Service independence, technology diversity
- **Event-Driven**: Kafka messaging, loose coupling, async communication
- **Circuit Breaker**: Fault tolerance, graceful degradation

### Communication
- **Synchronous**: REST (external), gRPC (internal high-performance)
- **Asynchronous**: Message queues, event streaming

## 🔒 Security & Performance

### Security Strategy
- **Authentication**: JWT stateless, OAuth2 integration
- **Authorization**: RBAC (Role-Based Access Control)
- **Data Protection**: Encryption at rest/transit, input validation
- **API Security**: Rate limiting, CORS, security headers

### Performance Optimization
- **Caching**: Multi-level (app, distributed, database, CDN)
- **Database**: Indexing strategies, connection pooling, read replicas
- **Scaling**: Docker containerization, Kubernetes orchestration
- **Monitoring**: Prometheus + Grafana, centralized logging, distributed tracing

## 🎓 Kỹ Năng Phát Triển

### Technical Skills
- **Backend**: Multi-language proficiency (Go, Python, Node.js, Java)
- **Database**: ACID vs NoSQL trade-offs, performance optimization
- **Architecture**: Distributed systems, CAP theorem, microservices patterns
- **DevOps**: Containerization, CI/CD, monitoring, infrastructure as code

### Industry Patterns
Học từ các công ty lớn: **Netflix** (Circuit breaker), **Amazon** (Event-driven), **Google** (Container orchestration), **Uber** (Real-time processing)

### Career Path
- **Senior Backend Developer**: System design + multi-language expertise
- **System Architect**: Distributed systems understanding
- **DevOps Engineer**: CI/CD + containerization expertise
- **SRE**: Performance optimization + reliability

---

> **Chú ý**: Để có hướng dẫn chi tiết về setup, cài đặt, và code examples, vui lòng tham khảo file [SETUP.md](./SETUP.md) và [EXAMPLES.md](./EXAMPLES.md)
