// Initialize MongoDB databases for microservices
print('=== Initializing MongoDB for Microservices ===');

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create databases and users
const databases = [
    {
        name: 'product_db',
        user: 'product_user',
        collections: ['products', 'categories', 'product_reviews', 'product_analytics']
    },
    {
        name: 'inventory_db', 
        user: 'inventory_user',
        collections: ['inventory', 'stock_movements', 'reservations', 'suppliers']
    },
    {
        name: 'cart_db',
        user: 'cart_user', 
        collections: ['carts', 'cart_items', 'abandoned_carts']
    },
    {
        name: 'blog_db',
        user: 'blog_user',
        collections: ['posts', 'comments', 'categories', 'tags']
    }
];

databases.forEach(dbConfig => {
    print(`Creating database: ${dbConfig.name}`);
    
    // Switch to target database
    db = db.getSiblingDB(dbConfig.name);
    
    // Create user with read/write access
    db.createUser({
        user: dbConfig.user,
        pwd: `${dbConfig.user}_password`,
        roles: [
            { role: 'readWrite', db: dbConfig.name },
            { role: 'dbAdmin', db: dbConfig.name }
        ]
    });
    
    // Create collections with initial documents
    dbConfig.collections.forEach(collection => {
        db.createCollection(collection);
        
        // Insert initial seed data based on collection type
        if (collection === 'products') {
            db.products.insertMany([
                {
                    name: 'Sample Product 1',
                    description: 'This is a sample product for testing',
                    price: 29.99,
                    category: 'Electronics',
                    sku: 'PROD-001',
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    name: 'Sample Product 2', 
                    description: 'Another sample product',
                    price: 49.99,
                    category: 'Clothing',
                    sku: 'PROD-002',
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }
        
        if (collection === 'categories') {
            db.categories.insertMany([
                {
                    name: 'Electronics',
                    description: 'Electronic devices and accessories',
                    parent_id: null,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    name: 'Clothing',
                    description: 'Apparel and fashion items',
                    parent_id: null,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }
        
        if (collection === 'inventory') {
            db.inventory.insertMany([
                {
                    product_id: 'PROD-001',
                    product_name: 'Sample Product 1',
                    quantity: 100,
                    reserved: 0,
                    available: 100,
                    min_stock: 10,
                    max_stock: 500,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    product_id: 'PROD-002',
                    product_name: 'Sample Product 2',
                    quantity: 50,
                    reserved: 0,
                    available: 50,
                    min_stock: 5,
                    max_stock: 200,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }
    });
    
    print(`Database ${dbConfig.name} created successfully with ${dbConfig.collections.length} collections`);
});

// Create indexes for better performance
db = db.getSiblingDB('product_db');
db.products.createIndex({ "name": "text", "description": "text" });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "price": 1 });
db.products.createIndex({ "status": 1 });
db.products.createIndex({ "created_at": -1 });

db = db.getSiblingDB('inventory_db');
db.inventory.createIndex({ "product_id": 1 }, { unique: true });
db.inventory.createIndex({ "available": 1 });
db.inventory.createIndex({ "quantity": 1 });
db.stock_movements.createIndex({ "product_id": 1 });
db.stock_movements.createIndex({ "created_at": -1 });

db = db.getSiblingDB('cart_db');
db.carts.createIndex({ "user_id": 1 });
db.carts.createIndex({ "status": 1 });
db.carts.createIndex({ "created_at": -1 });
db.cart_items.createIndex({ "cart_id": 1 });
db.cart_items.createIndex({ "product_id": 1 });

db = db.getSiblingDB('blog_db');
db.posts.createIndex({ "title": "text", "content": "text" });
db.posts.createIndex({ "status": 1 });
db.posts.createIndex({ "created_at": -1 });
db.comments.createIndex({ "post_id": 1 });
db.comments.createIndex({ "user_id": 1 });

print('=== MongoDB initialization completed ===');
