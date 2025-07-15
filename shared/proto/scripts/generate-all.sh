#!/bin/bash

# Script to generate gRPC code for all services and languages

echo "🚀 Generating gRPC code for all microservices..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTO_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PROTO_DIR")")"

echo "📁 Proto directory: $PROTO_DIR"
echo "📁 Root directory: $ROOT_DIR"

# Create service proto directories
echo "📂 Creating proto directories for each service..."

# Go services
mkdir -p "$ROOT_DIR/services/user-service/internal/proto"
mkdir -p "$ROOT_DIR/services/inventory-service/internal/proto"
mkdir -p "$ROOT_DIR/services/payment-service/internal/proto"

# Python services
mkdir -p "$ROOT_DIR/services/product-service/app/proto"

# Node.js services
mkdir -p "$ROOT_DIR/services/api-gateway/src/proto"
mkdir -p "$ROOT_DIR/services/cart-service/src/proto"
mkdir -p "$ROOT_DIR/services/blog-service/src/proto"

# Java services
mkdir -p "$ROOT_DIR/services/order-service/src/main/java/proto"
mkdir -p "$ROOT_DIR/services/analytics-service/src/main/java/proto"

# Generate Go code for Go services
echo "🔄 Generating Go code..."
cd "$PROTO_DIR"

# User Service (Go)
protoc --go_out="$ROOT_DIR/services/user-service/internal/proto" \
       --go_opt=paths=source_relative \
       --go-grpc_out="$ROOT_DIR/services/user-service/internal/proto" \
       --go-grpc_opt=paths=source_relative \
       user.proto

# Inventory Service (Go)
protoc --go_out="$ROOT_DIR/services/inventory-service/internal/proto" \
       --go_opt=paths=source_relative \
       --go-grpc_out="$ROOT_DIR/services/inventory-service/internal/proto" \
       --go-grpc_opt=paths=source_relative \
       inventory.proto

# Payment Service (Go)
protoc --go_out="$ROOT_DIR/services/payment-service/internal/proto" \
       --go_opt=paths=source_relative \
       --go-grpc_out="$ROOT_DIR/services/payment-service/internal/proto" \
       --go-grpc_opt=paths=source_relative \
       payment.proto

# Generate Python code for Python services
echo "🐍 Generating Python code..."

# Product Service (Python)
python -m grpc_tools.protoc -I. \
       --python_out="$ROOT_DIR/services/product-service/app/proto" \
       --grpc_python_out="$ROOT_DIR/services/product-service/app/proto" \
       product.proto

# Generate Node.js code for Node.js services
echo "🟢 Generating Node.js code..."

# API Gateway (Node.js) - needs all proto files for routing
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:"$ROOT_DIR/services/api-gateway/src/proto" \
                       --grpc_out=grpc_js:"$ROOT_DIR/services/api-gateway/src/proto" \
                       *.proto

# Cart Service (Node.js)
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:"$ROOT_DIR/services/cart-service/src/proto" \
                       --grpc_out=grpc_js:"$ROOT_DIR/services/cart-service/src/proto" \
                       cart.proto

# Blog Service (Node.js)
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:"$ROOT_DIR/services/blog-service/src/proto" \
                       --grpc_out=grpc_js:"$ROOT_DIR/services/blog-service/src/proto" \
                       blog.proto

# Generate Java code for Java services
echo "☕ Generating Java code..."

# Order Service (Java)
protoc --java_out="$ROOT_DIR/services/order-service/src/main/java" \
       --grpc-java_out="$ROOT_DIR/services/order-service/src/main/java" \
       order.proto

# Analytics Service (Java)
protoc --java_out="$ROOT_DIR/services/analytics-service/src/main/java" \
       --grpc-java_out="$ROOT_DIR/services/analytics-service/src/main/java" \
       analytics.proto

echo "✅ gRPC code generation completed for all services!"
echo ""
echo "📋 Generated files:"
echo "   🔷 Go services: user-service, inventory-service, payment-service"
echo "   🔷 Python services: product-service"
echo "   🔷 Node.js services: api-gateway, cart-service, blog-service"
echo "   🔷 Java services: order-service, analytics-service"
