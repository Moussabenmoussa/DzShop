require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'عدد الطلبات كثير، حاول لاحقاً'
});
app.use('/api/', limiter);

// ============ DATABASE ============
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));
}

// ============ MODELS ============

// نموذج المستخدم (محسّن)
const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true },
  avatar: { type: String },
  balance: { type: Number, default: 0 },
  isSeller: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  
  // معلومات الحساب
  storeCount: { type: Number, default: 0 },
  subscriptionPlan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'free' },
  subscriptionExpires: { type: Date },
  subscriptionActive: { type: Boolean, default: true },
  
  // الإعدادات
  language: { type: String, default: 'ar' },
  currency: { type: String, default: 'DZD' },
  emailNotifications: { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  
  // التتبع
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// نموذج المتجر
const StoreSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  ownerId: { type: String, required: true },
  ownerName: { type: String },
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  description: { type: String },
  logo: { type: String },
  cover: { type: String },
  
  // البيانات الأساسية
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  address: { type: String },
  city: { type: String },
  wilaya: { type: String },
  
  // الإحصائيات
  totalProducts: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  followers: { type: Number, default: 0 },
  
  // الإعدادات
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  shippingMethods: [String],
  paymentMethods: [String],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Store = mongoose.model('Store', StoreSchema);

// نموذج المنتج (محسّن)
const ProductSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  storeId: { type: String, required: true },
  storeName: { type: String },
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  description: { type: String },
  shortDesc: { type: String },
  
  // البيانات المالية
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  
  // الصور والملفات
  images: [String],
  mainImage: { type: String },
  video: { type: String },
  
  // المتغيرات
  category: { type: String },
  subcategory: { type: String },
  colors: [String],
  sizes: [String],
  variants: [{
    name: String,
    options: [String]
  }],
  
  // المخزون
  sku: { type: String },
  barcode: { type: String },
  quantity: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 10 },
  
  // الإحصائيات
  views: { type: Number, default: 0 },
  sales: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  
  // الحالة
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  offerEndTime: { type: Date },
  
  // التوصيل
  shippingWeight: { type: Number },
  shippingPrice: { type: Number, default: 0 },
  freeShipping: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// نموذج الطلب
const OrderSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  storeId: { type: String, required: true },
  storeName: { type: String },
  
  // معلومات المشتري
  buyerId: { type: String },
  buyerName: { type: String, required: true },
  buyerEmail: { type: String },
  buyerPhone: { type: String, required: true },
  
  // معلومات التسليم
  shippingAddress: {
    address: String,
    city: String,
    wilaya: String,
    postalCode: String
  },
  
  // تفاصيل الطلب
  items: [{
    productId: String,
    productTitle: String,
    quantity: Number,
    price: Number,
    variant: {
      color: String,
      size: String
    }
  }],
  
  // الأسعار
  subtotal: { type: Number },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  // الدفع
  paymentMethod: { type: String, default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String },
  
  // الحالة
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'], default: 'pending' },
  trackingNumber: { type: String },
  
  // الملاحظات
  notes: { type: String },
  adminNotes: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// نموذج الاشتراك
const SubscriptionSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  userId: { type: String, required: true },
  plan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], required: true },
  price: { type: Number, default: 0 },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
  paymentStatus: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  stripeSubscriptionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// نموذج الإعدادات
const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const Settings = mongoose.model('Settings', SettingsSchema);

// ============ HELPER FUNCTIONS ============

async function getSetting(key, defaultValue) {
  const s = await Settings.findOne({ key });
  return s ? s.value : defaultValue;
}

async function setSetting(key, value) {
  await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
}

// ============ PAGES ============
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard-3.html')));
app.get('/product/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));
app.get('/store-builder', (req, res) => res.sendFile(path.resolve(__dirname, 'store-builder.html')));
app.get('/analytics', (req, res) => res.sendFile(path.resolve(__dirname, 'analytics.html')));

// ============ PUBLIC SETTINGS API ============
app.get('/api/public/settings', async (req, res) => {
  try {
    const settings = {
      platformName: await getSetting('platformName', 'DzMarket Pro'),
      currency: await getSetting('currency', 'DZD'),
      language: await getSetting('language', 'ar'),
      platformCommission: await getSetting('platformCommission', 15),
      minWithdraw: await getSetting('minWithdraw', 5000),
      maxWithdraw: await getSetting('maxWithdraw', 50000000)
    };
    res.json(settings);
  } catch (e) {
    res.json({
      platformName: 'DzMarket Pro',
      currency: 'DZD',
      language: 'ar',
      platformCommission: 15
    });
  }
});

// ============ AUTH API ============

// التسجيل
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!email || !password || !name) {
      return res.json({ success: false, msg: 'يرجى ملء جميع البيانات المطلوبة' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, msg: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    
    const user = await User.create({
      name,
      email,
      password,
      phone,
      subscriptionPlan: 'free'
    });
    
    res.json({ success: true, userId: user._id, msg: 'تم التسجيل بنجاح' });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في التسجيل' });
  }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.json({ success: false, msg: 'بيانات الدخول غير صحيحة' });
    }
    
    if (user.isBanned) {
      return res.json({ success: false, msg: 'تم حظر هذا الحساب' });
    }
    
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    
    res.json({ 
      success: true, 
      userId: user._id,
      name: user.name,
      email: user.email,
      isSeller: user.isSeller,
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في تسجيل الدخول' });
  }
});

// ============ USERS API ============

// الحصول على بيانات المستخدم
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.json({ success: false });
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        balance: user.balance,
        subscriptionPlan: user.subscriptionPlan,
        isSeller: user.isSeller
      }
    });
  } catch (e) {
    res.json({ success: false });
  }
});

// تحديث بيانات المستخدم
app.post('/api/user/update', async (req, res) => {
  try {
    const { userId, ...data } = req.body;
    await User.findByIdAndUpdate(userId, data);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// ============ STORE API ============

// إنشاء متجر جديد
app.post('/api/store/create', async (req, res) => {
  try {
    const { userId, name, slug, description } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, msg: 'المستخدم غير موجود' });
    
    // التحقق من حد الخطة
    const maxStores = {
      'free': 1,
      'starter': 3,
      'professional': 10,
      'enterprise': 999
    };
    
    const storeCount = await Store.countDocuments({ ownerId: userId });
    if (storeCount >= maxStores[user.subscriptionPlan]) {
      return res.json({ success: false, msg: 'لقد وصلت لحد الخطة' });
    }
    
    const store = await Store.create({
      ownerId: userId,
      ownerName: user.name,
      name,
      slug,
      description
    });
    
    user.isSeller = true;
    user.storeCount += 1;
    await user.save();
    
    res.json({ success: true, storeId: store._id });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في إنشاء المتجر' });
  }
});

// الحصول على متاجر المستخدم
app.get('/api/stores/:userId', async (req, res) => {
  try {
    const stores = await Store.find({ ownerId: req.params.userId });
    res.json(stores);
  } catch (e) {
    res.json([]);
  }
});

// ============ PRODUCTS API ============

// إنشاء منتج
app.post('/api/product/create', async (req, res) => {
  try {
    const { storeId, title, price, description } = req.body;
    
    const store = await Store.findById(storeId);
    if (!store) return res.json({ success: false });
    
    const product = await Product.create({
      storeId,
      storeName: store.name,
      title,
      price,
      description
    });
    
    store.totalProducts += 1;
    await store.save();
    
    res.json({ success: true, productId: product._id });
  } catch (e) {
    res.json({ success: false });
  }
});

// الحصول على منتجات المتجر
app.get('/api/store/products/:storeId', async (req, res) => {
  try {
    const products = await Product.find({ storeId: req.params.storeId });
    res.json(products);
  } catch (e) {
    res.json([]);
  }
});

// ============ ORDERS API ============

// إنشاء طلب
app.post('/api/order/create', async (req, res) => {
  try {
    const { storeId, items, buyerInfo, total } = req.body;
    
    const order = await Order.create({
      storeId,
      storeName: items[0]?.storeName,
      items,
      buyerName: buyerInfo.name,
      buyerPhone: buyerInfo.phone,
      buyerEmail: buyerInfo.email,
      shippingAddress: buyerInfo.address,
      total
    });
    
    // تحديث الإحصائيات
    await Store.findByIdAndUpdate(storeId, {
      $inc: { totalOrders: 1, totalRevenue: total }
    });
    
    // تقليل المخزون
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity, sales: 1 }
      });
    }
    
    res.json({ success: true, orderId: order._id });
  } catch (e) {
    res.json({ success: false });
  }
});

// الحصول على طلبات المتجر
app.get('/api/store/orders/:storeId', async (req, res) => {
  try {
    const orders = await Order.find({ storeId: req.params.storeId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.json([]);
  }
});

// ============ ADMIN API ============

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [users, stores, products, orders, totalRevenue] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
    ]);
    
    res.json({
      users,
      stores,
      products,
      orders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (e) {
    res.json({ users: 0, stores: 0, products: 0, orders: 0, totalRevenue: 0 });
  }
});

// ============ SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DzMarket Pro SaaS Platform`);
  console.log(`📍 Server running at http://localhost:${PORT}`);
  console.log(`⏱️  ${new Date().toLocaleString('ar-DZ')}\n`);
});
