#!/bin/bash

# Script to generate gRPC code for all languages

echo "Generating gRPC code for all services..."

# Create output directories
mkdir -p ../libraries/golang/proto
mkdir -p ../libraries/python/proto
mkdir -p ../libraries/nodejs/proto
mkdir -p ../libraries/rust/proto

# Generate Go code
echo "Generating Go code..."
protoc --go_out=../libraries/golang/proto --go_opt=paths=source_relative \
       --go-grpc_out=../libraries/golang/proto --go-grpc_opt=paths=source_relative \
       *.proto

# Generate Python code
echo "Generating Python code..."
python -m grpc_tools.protoc -I. --python_out=../libraries/python/proto \
       --grpc_python_out=../libraries/python/proto \
       *.proto

# Generate Node.js code
echo "Generating Node.js code..."
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:../libraries/nodejs/proto \
                       --grpc_out=grpc_js:../libraries/nodejs/proto \
                       *.proto

# Generate TypeScript definitions for Node.js
grpc_tools_node_protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
                       --ts_out=grpc_js:../libraries/nodejs/proto \
                       *.proto

# Generate Rust code
echo "Generating Rust code..."
protoc --rust_out=../libraries/rust/proto *.proto

echo "Code generation completed!"
