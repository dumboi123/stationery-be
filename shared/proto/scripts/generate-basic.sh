#!/bin/bash

# Proto generation script for Windows/Unix compatibility
echo "🚀 Generating Protocol Buffer files..."

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows paths
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROTO_DIR="$(dirname "$SCRIPT_DIR")"
    ROOT_DIR="$(dirname "$(dirname "$PROTO_DIR")")"
else
    # Unix/Linux paths
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROTO_DIR="$(dirname "$SCRIPT_DIR")"
    ROOT_DIR="$(dirname "$(dirname "$PROTO_DIR")")"
fi

echo "📁 Proto directory: $PROTO_DIR"
echo "📁 Root directory: $ROOT_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo "🔍 Checking required tools..."
if ! command_exists protoc; then
    echo "❌ protoc not found. Please install Protocol Buffer compiler."
    exit 1
fi

if ! command_exists python; then
    echo "❌ python not found. Please install Python."
    exit 1
fi

echo "✅ All required tools found."

# Create service proto directories
echo "📂 Creating proto directories for each service..."

# Create directories (cross-platform)
mkdir -p "$ROOT_DIR/services/user-service/internal/proto"
mkdir -p "$ROOT_DIR/services/inventory-service/internal/proto"
mkdir -p "$ROOT_DIR/services/payment-service/internal/proto"
mkdir -p "$ROOT_DIR/services/product-service/app/proto"
mkdir -p "$ROOT_DIR/services/api-gateway/src/proto"
mkdir -p "$ROOT_DIR/services/cart-service/src/proto"
mkdir -p "$ROOT_DIR/services/blog-service/src/proto"
mkdir -p "$ROOT_DIR/services/order-service/src/main/java/proto"
mkdir -p "$ROOT_DIR/services/analytics-service/src/main/java/proto"

# Change to proto directory
cd "$PROTO_DIR" || exit 1

# Generate Go code for Go services
echo "🔄 Generating Go code..."

# User Service (Go)
if [ -f "user.proto" ]; then
    protoc --go_out="$ROOT_DIR/services/user-service/internal/proto" \
           --go_opt=paths=source_relative \
           --go-grpc_out="$ROOT_DIR/services/user-service/internal/proto" \
           --go-grpc_opt=paths=source_relative \
           user.proto
    echo "   ✅ User service proto generated"
fi

# Inventory Service (Go)
if [ -f "inventory.proto" ]; then
    protoc --go_out="$ROOT_DIR/services/inventory-service/internal/proto" \
           --go_opt=paths=source_relative \
           --go-grpc_out="$ROOT_DIR/services/inventory-service/internal/proto" \
           --go-grpc_opt=paths=source_relative \
           inventory.proto
    echo "   ✅ Inventory service proto generated"
fi

# Payment Service (Go)
if [ -f "payment.proto" ]; then
    protoc --go_out="$ROOT_DIR/services/payment-service/internal/proto" \
           --go_opt=paths=source_relative \
           --go-grpc_out="$ROOT_DIR/services/payment-service/internal/proto" \
           --go-grpc_opt=paths=source_relative \
           payment.proto
    echo "   ✅ Payment service proto generated"
fi

# Generate Python code for Python services
echo "🐍 Generating Python code..."

# Product Service (Python)
if [ -f "product.proto" ]; then
    python -m grpc_tools.protoc -I. \
           --python_out="$ROOT_DIR/services/product-service/app/proto" \
           --grpc_python_out="$ROOT_DIR/services/product-service/app/proto" \
           product.proto
    echo "   ✅ Product service proto generated"
fi

echo "✅ Protocol Buffer generation completed!"
echo ""
echo "📋 Generated files for:"
echo "   🔷 Go services: user-service, inventory-service, payment-service"
echo "   🔷 Python services: product-service"
echo ""
echo "💡 Note: Node.js and Java proto generation requires additional tools:"
echo "   - Node.js: npm install grpc-tools"
echo "   - Java: protoc-gen-grpc-java plugin"
