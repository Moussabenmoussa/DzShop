require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ DATABASE ============
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));
}

// ============ JWT SECRET ============
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============ MODELS ============

// Store Model (متجر/عميل SaaS)
const StoreSchema = new mongoose.Schema({
  ownerUserId: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  logo: String,
  banner: String,
  customDomain: String,
  currency: { type: String, default: 'دج' },
  theme: { type: String, default: 'light' },
  plan: { type: String, default: 'free' }, // free, starter, professional, enterprise
  status: { type: String, default: 'active' }, // active, suspended, deleted
  trialEndsAt: { type: Date },
  features: {
    productsLimit: { type: Number, default: 50 },
    usersLimit: { type: Number, default: 3 },
    storageGB: { type: Number, default: 1 },
    customDomain: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    customTemplate: { type: Boolean, default: false }
  },
  analytics: {
    totalSales: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Store = mongoose.model('Store', StoreSchema);

// Plan Model
const PlanSchema = new mongoose.Schema({
  name: String,
  slug: String,
  price: Number,
  currency: String,
  billingCycle: { type: String, enum: ['monthly', 'yearly'] },
  features: {
    productsLimit: Number,
    usersLimit: Number,
    storageGB: Number,
    customDomain: Boolean,
    advancedAnalytics: Boolean,
    customTemplate: Boolean,
    apiAccess: Boolean
  },
  description: String,
  isActive: { type: Boolean, default: true }
});
const Plan = mongoose.model('Plan', PlanSchema);

// Subscription Model
const SubscriptionSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  planId: String,
  status: { type: String, default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  autoRenew: { type: Boolean, default: true },
  paymentMethod: String,
  lastPaymentDate: Date,
  nextPaymentDate: Date
});
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// User (محدّث بـ storeId)
const UserSchema = new mongoose.Schema({
  storeId: String, // معرّف المتجر
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'staff', enum: ['owner', 'admin', 'staff', 'viewer'] },
  avatar: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  permissions: [String],
  createdAt: { type: Date, default: Date.now },
  deletedAt: Date
});
const User = mongoose.model('User', UserSchema);

// Listing (المنتج/الخدمة - محدّث بـ storeId)
const ListingSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  userId: String,
  type: { type: String, default: 'product', enum: ['product', 'service'] },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  cost: Number, // تكلفة المنتج (لحساب الهامش)
  images: [String],
  category: { type: String, default: 'other' },
  colors: [String],
  sizes: [String],
  sku: String,
  barcode: String,
  stock: { type: Number, default: 0 },
  reservedStock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  offerEndTime: Date,
  discount: { type: Number, default: 0 },
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

// Order (محدّث بـ storeId)
const OrderSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  orderNumber: String,
  listingId: String,
  listingTitle: String,
  sellerId: String,
  sellerName: String,
  buyerName: { type: String, required: true },
  buyerEmail: String,
  buyerPhone: { type: String, required: true },
  buyerWilaya: String,
  buyerCity: String,
  buyerAddress: String,
  buyerFingerprint: String,
  color: String,
  size: String,
  quantity: { type: Number, default: 1 },
  unitPrice: Number,
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalPrice: Number,
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'refunded'] },
  paymentMethod: String,
  shippingStatus: { type: String, default: 'pending', enum: ['pending', 'shipped', 'delivered', 'returned'] },
  isRevealed: { type: Boolean, default: false },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// Chat & Message (محدّثة بـ storeId)
const ChatSchema = new mongoose.Schema({
  storeId: String,
  listingId: String,
  sellerId: String,
  sellerName: String,
  buyerId: String,
  buyerName: String,
  buyerFingerprint: String,
  isPaid: { type: Boolean, default: false },
  lastMessage: String,
  lastMessageDate: Date,
  sellerUnread: { type: Number, default: 0 },
  buyerUnread: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: String,
  senderName: String,
  content: String,
  attachments: [String],
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Inventory (إدارة المخزون)
const InventorySchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  productId: String,
  quantity: Number,
  reserved: Number,
  sold: Number,
  lastUpdated: Date,
  movements: [{
    type: String, // in, out, return, adjust
    quantity: Number,
    reason: String,
    date: Date,
    userId: String
  }]
});
const Inventory = mongoose.model('Inventory', InventorySchema);

// StoreSettings (إعدادات المتجر)
const StoreSettingsSchema = new mongoose.Schema({
  storeId: { type: String, required: true, unique: true },
  key: String,
  value: mongoose.Schema.Types.Mixed
});
const StoreSettings = mongoose.model('StoreSettings', StoreSettingsSchema);

// Transaction (محدّثة)
const TransSchema = new mongoose.Schema({
  storeId: String,
  userId: String,
  userName: String,
  type: { type: String, default: 'order' },
  amount: Number,
  currency: String,
  description: String,
  proof: String,
  paymentMethod: String,
  status: { type: String, default: 'completed' },
  orderId: String,
  createdAt: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

// Notification
const NotificationSchema = new mongoose.Schema({
  storeId: String,
  userId: String,
  type: String,
  title: String,
  message: String,
  targetId: String,
  read: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

// ============ MIDDLEWARE: AUTHENTICATION & AUTHORIZATION ============

// Verify JWT Token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Extract Tenant/Store
function extractTenant(req, res, next) {
  req.storeId = req.body.storeId || req.query.storeId || req.user?.storeId;
  if (!req.storeId) {
    return res.status(400).json({ success: false, message: 'Store ID required' });
  }
  next();
}

// Check Role
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

// ============ HELPER FUNCTIONS ============

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare passwords
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, storeId: user.storeId, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ============ AUTH ROUTES ============

// Register (Onboarding جديد)
app.post('/api/auth/register-store', async (req, res) => {
  try {
    const { storeName, storeSlug, ownerName, ownerEmail, ownerPassword } = req.body;

    if (!storeName || !storeSlug || !ownerName || !ownerEmail || !ownerPassword) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    // Check if slug already exists
    const existingStore = await Store.findOne({ slug: storeSlug.toLowerCase() });
    if (existingStore) {
      return res.json({ success: false, message: 'Store slug already exists' });
    }

    // Create owner user first
    const hashedPassword = await hashPassword(ownerPassword);
    const store = await Store.create({
      name: storeName,
      slug: storeSlug.toLowerCase(),
      ownerUserId: 'temp-id' // سيتم تحديثه
    });

    const owner = await User.create({
      storeId: store._id.toString(),
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      role: 'owner'
    });

    // Update store with owner ID
    store.ownerUserId = owner._id.toString();
    await store.save();

    // Generate token
    const token = generateToken(owner);

    // Create free trial subscription
    await Subscription.create({
      storeId: store._id.toString(),
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    });

    res.json({
      success: true,
      message: 'Store created successfully',
      store: { id: store._id, name: store.name, slug: store.slug },
      user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
      token
    });
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, storeSlug } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: false, message: 'User not found' });

    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) return res.json({ success: false, message: 'Invalid password' });

    // If storeSlug provided, verify user belongs to that store
    if (storeSlug) {
      const store = await Store.findOne({ slug: storeSlug.toLowerCase() });
      if (store._id.toString() !== user.storeId) {
        return res.json({ success: false, message: 'User does not belong to this store' });
      }
    }

    const token = generateToken(user);
    const store = await Store.findById(user.storeId);

    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId },
      store: { id: store._id, name: store.name, slug: store.slug },
      token
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ============ DASHBOARD ROUTES ============

// Get Store Dashboard Stats
app.get('/api/dashboard/stats/:storeId', verifyToken, extractTenant, async (req, res) => {
  try {
    const store = await Store.findById(req.storeId);
    const totalOrders = await Order.countDocuments({ storeId: req.storeId });
    const totalProducts = await Listing.countDocuments({ storeId: req.storeId });
    const totalUsers = await User.countDocuments({ storeId: req.storeId });
    const totalRevenue = await Trans.aggregate([
      { $match: { storeId: req.storeId, type: 'order', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        storeName: store.name,
        totalOrders,
        totalProducts,
        totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        plan: store.plan,
        trialEndsAt: store.trialEndsAt
      }
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Get Products/Listings
app.get('/api/store/:storeId/products', async (req, res) => {
  try {
    const products = await Listing.find({ storeId: req.params.storeId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, products });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Create Product
app.post('/api/dashboard/products/create', verifyToken, extractTenant, async (req, res) => {
  try {
    const { title, price, description, category, images, stock } = req.body;

    const product = await Listing.create({
      storeId: req.storeId,
      userId: req.user.id,
      title,
      price,
      description,
      category,
      images: images || [],
      stock: stock || 0
    });

    // Create inventory record
    await Inventory.create({
      storeId: req.storeId,
      productId: product._id.toString(),
      quantity: stock || 0
    });

    res.json({ success: true, product });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Update Product
app.post('/api/dashboard/products/update', verifyToken, extractTenant, async (req, res) => {
  try {
    const { productId, ...updateData } = req.body;

    const product = await Listing.findByIdAndUpdate(productId, updateData, { new: true });
    res.json({ success: true, product });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Delete Product
app.post('/api/dashboard/products/delete', verifyToken, extractTenant, async (req, res) => {
  try {
    const { productId } = req.body;

    await Listing.findByIdAndUpdate(productId, { isActive: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Get Orders
app.get('/api/dashboard/orders/:storeId', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ storeId: req.params.storeId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, orders });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Update Order Status
app.post('/api/dashboard/orders/update-status', verifyToken, extractTenant, async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { shippingStatus: status, updatedAt: new Date() },
      { new: true }
    );

    res.json({ success: true, order });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ============ STORE FRONT (PUBLIC) ============

// Get Store by Slug
app.get('/api/public/store/:slug', async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug.toLowerCase() });
    if (!store) return res.json({ success: false, message: 'Store not found' });

    const products = await Listing.find({ storeId: store._id.toString(), isActive: true }).limit(100);

    res.json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        currency: store.currency,
        theme: store.theme
      },
      products
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ============ PAGES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/:storeSlug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'storefront.html')));

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DzMarket SaaS Platform running on port ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}`);
});