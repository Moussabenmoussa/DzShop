// Seed data for DzMarket SaaS Platform
// Run: mongosh < seed-data.js

const dbName = 'dzmarket';
db = db.getSiblingDB(dbName);

// Clear existing data
db.plans.deleteMany({});
db.tenants.deleteMany({});

console.log('🌱 Creating Plans...');

// Create subscription plans
const plans = db.plans.insertMany([
  {
    name: 'Starter',
    slug: 'starter',
    price: 500,
    currency: 'DZD',
    billingCycle: 'monthly',
    features: [
      { name: 'متجر واحد', limit: 1 },
      { name: 'منتجات', limit: 100 },
      { name: 'تقارير أساسية', limit: 1 }
    ],
    maxStores: 1,
    maxProducts: 100,
    customDomain: false,
    apiAccess: false,
    priority: 1,
    createdAt: new Date()
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 2000,
    currency: 'DZD',
    billingCycle: 'monthly',
    features: [
      { name: 'متاجر متعددة', limit: 5 },
      { name: 'منتجات', limit: 5000 },
      { name: 'تقارير متقدمة', limit: 1 },
      { name: 'نطاق مخصص', limit: 1 }
    ],
    maxStores: 5,
    maxProducts: 5000,
    customDomain: true,
    apiAccess: true,
    priority: 2,
    createdAt: new Date()
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 10000,
    currency: 'DZD',
    billingCycle: 'monthly',
    features: [
      { name: 'متاجر غير محدودة', limit: -1 },
      { name: 'منتجات غير محدودة', limit: -1 },
      { name: 'تقارير مخصصة', limit: -1 },
      { name: 'دعم 24/7', limit: -1 }
    ],
    maxStores: -1,
    maxProducts: -1,
    customDomain: true,
    apiAccess: true,
    priority: 3,
    createdAt: new Date()
  }
]);

console.log('✅ Plans created: ' + plans.insertedIds.length);

// Create sample tenant
console.log('🌱 Creating Sample Tenant...');

const starterPlan = db.plans.findOne({ slug: 'starter' });

const tenants = db.tenants.insertMany([
  {
    name: 'Test Store',
    slug: 'test-store',
    email: 'test@example.com',
    phone: '+213612345678',
    plan: starterPlan._id,
    status: 'active',
    subscription: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoRenew: true,
      status: 'active'
    },
    billing: {
      address: 'Address',
      city: 'Algiers',
      country: 'Algeria'
    },
    apiKey: 'test_api_key_' + require('crypto').randomBytes(16).toString('hex'),
    createdAt: new Date()
  }
]);

console.log('✅ Tenants created: ' + tenants.insertedIds.length);

// Create sample store
console.log('🌱 Creating Sample Store...');

const stores = db.stores.insertMany([
  {
    tenant: tenants.insertedIds[0],
    name: 'My Test Store',
    slug: 'my-test-store',
    description: 'متجري الاختباري',
    status: 'active',
    seo: {
      metaTitle: 'My Test Store - DzMarket',
      metaDescription: 'متجري الاختباري على منصة DzMarket',
      metaKeywords: ['test', 'store', 'dzmarket']
    },
    createdAt: new Date()
  }
]);

console.log('✅ Stores created: ' + stores.insertedIds.length);

// Create sample products
console.log('🌱 Creating Sample Products...');

const products = db.products.insertMany([
  {
    store: stores.insertedIds[0],
    name: 'Product 1',
    slug: 'product-1',
    description: 'First test product',
    price: 1000,
    currency: 'DZD',
    stock: 50,
    images: ['https://via.placeholder.com/300x300?text=Product+1'],
    category: 'Electronics',
    tags: ['test', 'product'],
    seo: {
      title: 'Product 1 - My Test Store',
      description: 'First test product on DzMarket',
      keywords: ['product', 'test']
    },
    status: 'active',
    createdAt: new Date()
  },
  {
    store: stores.insertedIds[0],
    name: 'Product 2',
    slug: 'product-2',
    description: 'Second test product',
    price: 2000,
    currency: 'DZD',
    stock: 30,
    images: ['https://via.placeholder.com/300x300?text=Product+2'],
    category: 'Electronics',
    tags: ['test', 'product'],
    seo: {
      title: 'Product 2 - My Test Store',
      description: 'Second test product on DzMarket',
      keywords: ['product', 'test']
    },
    status: 'active',
    createdAt: new Date()
  }
]);

console.log('✅ Products created: ' + products.insertedIds.length);

// Create indexes for better performance
console.log('🌱 Creating Indexes...');

db.plans.createIndex({ slug: 1 });
db.tenants.createIndex({ slug: 1 });
db.tenants.createIndex({ email: 1 });
db.tenants.createIndex({ apiKey: 1 });
db.stores.createIndex({ tenant: 1 });
db.stores.createIndex({ slug: 1 });
db.products.createIndex({ store: 1 });
db.products.createIndex({ slug: 1 });
db.products.createIndex({ status: 1 });

console.log('✅ Indexes created');

console.log('\n✅ Database seeded successfully!');
console.log('\n📝 Test API Key: ' + tenants.insertedIds[0]);
console.log('📧 Test Email: test@example.com');
console.log('\n🚀 You can now start the server with: npm run dev');