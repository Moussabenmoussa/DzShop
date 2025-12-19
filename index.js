require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// ============ SECURITY MIDDLEWARE ============
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://dzshop.onrender.com').split(','),
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'عدد الطلبات كثير، حاول لاحقاً'
});
app.use('/api/', limiter);

// ============ BODY PARSER MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, 'public')));

// ============ DATABASE CONNECTION ============
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('✅ MongoDB Connected Successfully');
    })
    .catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });
} else {
  console.warn('⚠️ MONGO_URI not configured - database features will be limited');
}

// ============ DATABASE SCHEMAS ============

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  phone: { type: String },
  fingerprint: { type: String },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  type: { type: String, default: 'product' },
  title: { type: String, required: true, trim: true },
  desc: { type: String },
  price: { type: Number, required: true },
  images: [{ type: String }],
  image: { type: String },
  category: { type: String, default: 'other' },
  colors: [{ type: String }],
  sizes: [{ type: String }],
  offerEndTime: { type: Number },
  active: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

const Listing = mongoose.model('Listing', ListingSchema);

const OrderSchema = new mongoose.Schema({
  listingId: { type: String },
  listingTitle: { type: String },
  sellerId: { type: String },
  sellerName: { type: String },
  buyerName: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  buyerWilaya: { type: String, required: true },
  buyerCity: { type: String },
  buyerAddress: { type: String },
  buyerFingerprint: { type: String },
  color: { type: String },
  size: { type: String },
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number },
  isRevealed: { type: Boolean, default: false },
  status: { type: String, default: 'pending' },
  date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

const ChatSchema = new mongoose.Schema({
  listingId: { type: String },
  listingTitle: { type: String },
  sellerId: { type: String },
  sellerName: { type: String },
  buyerId: { type: String },
  buyerName: { type: String },
  buyerFingerprint: { type: String },
  isPaid: { type: Boolean, default: false },
  lastMessage: { type: String },
  lastMessageDate: { type: Date },
  sellerUnread: { type: Number, default: 0 },
  buyerUnread: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String },
  senderName: { type: String },
  content: { type: String },
  fromBuyer: { type: Boolean, default: true },
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String },
  message: { type: String },
  targetId: { type: String },
  read: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);

const PaymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'local' },
  account: { type: String },
  holder: { type: String },
  icon: { type: String, default: 'credit-card' },
  instructions: { type: String },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

const TransSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String },
  type: { type: String, default: 'deposit' },
  amount: { type: Number },
  description: { type: String },
  proof: { type: String },
  paymentMethod: { type: String },
  status: { type: String, default: 'pending' },
  date: { type: Date, default: Date.now }
});

const Trans = mongoose.model('Trans', TransSchema);

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const Settings = mongoose.model('Settings', SettingsSchema);

// ============ HELPER FUNCTIONS ============

async function getSetting(key, defaultValue) {
  try {
    const s = await Settings.findOne({ key });
    return s ? s.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function setSetting(key, value) {
  try {
    await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
  } catch (e) {
    console.error('Error setting:', e);
  }
}

async function sendEmail(to, subject, htmlContent) {
  try {
    if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
      console.log('⚠️ Email settings not configured');
      return false;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'DzMarket',
          email: process.env.SENDER_EMAIL
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (response.ok) {
      console.log('✅ Email sent to:', to);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
}

async function createNotification(userId, type, title, message, targetId = '') {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      targetId
    });
    return notification;
  } catch (e) {
    console.error('Error creating notification:', e);
  }
}

async function deductBalance(userId, amount, description) {
  try {
    const user = await User.findById(userId);
    if (!user || user.balance < amount) return false;

    user.balance -= amount;
    await user.save();

    await Trans.create({
      userId,
      userName: user.name,
      type: 'deduct',
      amount,
      description,
      status: 'completed'
    });

    return user.balance;
  } catch (e) {
    console.error('Error deducting balance:', e);
    return false;
  }
}

// ============ ROUTES - PAGES ============

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dashboard-3.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dashboard-3.html'));
});

app.get('/product/:id', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'product.html'));
});

app.get('/p/:id', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'product.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// ============ API ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Public Settings
app.get('/api/public/settings', async (req, res) => {
  try {
    const orderRevealPrice = await getSetting('orderRevealPrice', 50);
    const chatPrice = await getSetting('chatPrice', 50);
    const freeMode = await getSetting('freeMode', false);
    const currency = await getSetting('currency', 'دج');

    res.json({
      orderRevealPrice,
      chatPrice,
      freeMode,
      currency
    });
  } catch (e) {
    res.json({
      orderRevealPrice: 50,
      chatPrice: 50,
      freeMode: false,
      currency: 'دج'
    });
  }
});

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, fingerprint } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, msg: 'جميع الحقول مطلوبة' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.json({ success: false, msg: 'البريد مستخدم بالفعل' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      fingerprint
    });

    res.json({ success: true, user });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في التسجيل' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      password
    });

    if (!user) {
      return res.json({ success: false, msg: 'بيانات الدخول غير صحيحة' });
    }

    if (user.isBanned) {
      return res.json({ success: false, msg: 'تم حظر هذا الحساب' });
    }

    res.json({ success: true, user });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في تسجيل الدخول' });
  }
});

// ============ USER ROUTES ============

app.post('/api/user/refresh', async (req, res) => {
  try {
    const user = await User.findById(req.body.id);
    res.json(user ? { success: true, user } : { success: false });
  } catch (e) {
    res.json({ success: false });
  }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.json({ success: false });
    }
  } catch (e) {
    res.json({ success: false });
  }
});

// ============ LISTINGS ROUTES ============

app.post('/api/listing/create', async (req, res) => {
  try {
    await Listing.create(req.body);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في الإنشاء' });
  }
});

app.get('/api/market', async (req, res) => {
  try {
    const list = await Listing.find({ active: true }).sort({ date: -1 }).limit(100);
    res.json(list);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/user/listings', async (req, res) => {
  try {
    const list = await Listing.find({ userId: req.body.userId }).sort({ date: -1 });
    res.json(list);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/public/product/:id', async (req, res) => {
  try {
    const p = await Listing.findById(req.params.id);
    if (p) {
      await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    }
    res.json(p || {});
  } catch (e) {
    res.json({});
  }
});

// ============ ORDERS ROUTES ============

app.post('/api/order/create', async (req, res) => {
  try {
    const { listingId, buyerName, buyerPhone, buyerWilaya, buyerCity, buyerAddress, color, size, quantity, totalPrice, fingerprint } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.json({ success: false, msg: 'الإعلان غير موجود' });
    }

    const seller = await User.findById(listing.userId);
    if (seller?.fingerprint === fingerprint) {
      return res.json({ success: false, msg: 'لا يمكنك الطلب من نفسك' });
    }

    const order = await Order.create({
      listingId,
      listingTitle: listing.title,
      sellerId: listing.userId,
      sellerName: listing.userName,
      buyerName,
      buyerPhone,
      buyerWilaya,
      buyerCity,
      buyerAddress,
      buyerFingerprint: fingerprint,
      color,
      size,
      quantity: quantity || 1,
      totalPrice: totalPrice || listing.price
    });

    await createNotification(
      listing.userId,
      'order',
      'طلب جديد! 🎉',
      `لديك طلب جديد على "${listing.title}" من ${buyerName}`,
      order._id
    );

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'خطأ في الطلب' });
  }
});

app.get('/api/seller/orders/:userId', async (req, res) => {
  try {
    const freeMode = await getSetting('freeMode', false);
    const orders = await Order.find({ sellerId: req.params.userId }).sort({ date: -1 });

    res.json(orders.map(o => ({
      ...o.toObject(),
      buyerPhone: (o.isRevealed || freeMode) ? o.buyerPhone : o.buyerPhone.substring(0, 4) + '***',
      buyerAddress: (o.isRevealed || freeMode) ? o.buyerAddress : '***',
    })));
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/order/reveal', async (req, res) => {
  try {
    const { userId, orderId } = req.body;
    const user = await User.findById(userId);
    const order = await Order.findById(orderId);

    if (!user || !order) {
      return res.json({ success: false, msg: 'خطأ' });
    }

    if (order.isRevealed) {
      return res.json({ success: true, newBalance: user.balance });
    }

    const freeMode = await getSetting('freeMode', false);
    if (freeMode) {
      order.isRevealed = true;
      await order.save();
      return res.json({ success: true, newBalance: user.balance });
    }

    const revealPrice = await getSetting('orderRevealPrice', 50);
    if (user.balance < revealPrice) {
      return res.json({ success: false, msg: 'رصيد غير كافٍ' });
    }

    const newBalance = await deductBalance(userId, revealPrice, `كشف طلب: ${order.listingTitle}`);
    if (newBalance === false) {
      return res.json({ success: false, msg: 'رصيد غير كافٍ' });
    }

    order.isRevealed = true;
    await order.save();

    res.json({ success: true, newBalance });
  } catch (e) {
    res.json({ success: false });
  }
});

// ============ CHAT ROUTES ============

app.post('/api/chat/check', async (req, res) => {
  try {
    const { listingId, fingerprint } = req.body;
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.json({ success: false, msg: 'الخدمة غير موجودة' });
    }

    const chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });

    if (chat) {
      return res.json({
        success: true,
        chatId: chat._id,
        isPaid: chat.isPaid,
        exists: true
      });
    }

    res.json({ success: true, exists: false });
  } catch (e) {
    res.json({ success: false });
  }
});

app.post('/api/chat/request', async (req, res) => {
  try {
    const { listingId, fingerprint, buyerName } = req.body;
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.json({ success: false, msg: 'الخدمة غير موجودة' });
    }

    let chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });

    if (chat) {
      return res.json({
        success: true,
        chatId: chat._id,
        isPaid: chat.isPaid
      });
    }

    chat = await Chat.create({
      listingId,
      listingTitle: listing.title,
      sellerId: listing.userId,
      sellerName: listing.userName,
      buyerName: buyerName || 'مشتري',
      buyerFingerprint: fingerprint,
      isPaid: false
    });

    await createNotification(
      listing.userId,
      'chat_request',
      'طلب محادثة جديد! 💬',
      `${buyerName || 'مشتري'} يريد التواصل معك`,
      chat._id
    );

    res.json({
      success: true,
      chatId: chat._id,
      isPaid: false
    });
  } catch (e) {
    res.json({ success: false });
  }
});

app.post('/api/chat/accept', async (req, res) => {
  try {
    const { chatId, sellerId } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.json({ success: false, msg: 'المحادثة غير موجودة' });
    }

    if (chat.sellerId !== sellerId) {
      return res.json({ success: false, msg: 'غير مصرح' });
    }

    if (chat.isPaid) {
      return res.json({ success: true, msg: 'المحادثة مفتوحة بالفعل' });
    }

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.json({ success: false, msg: 'البائع غير موجود' });
    }

    const freeMode = await getSetting('freeMode', false);
    if (!freeMode) {
      const chatPrice = await getSetting('chatPrice', 50);
      if (seller.balance < chatPrice) {
        return res.json({
          success: false,
          msg: `رصيدك غير كافٍ. تحتاج ${chatPrice} لفتح المحادثة`
        });
      }

      await deductBalance(sellerId, chatPrice, `فتح محادثة: ${chat.listingTitle}`);
    }

    chat.isPaid = true;
    await chat.save();

    res.json({ success: true, msg: 'تم فتح المحادثة بنجاح' });
  } catch (e) {
    res.json({ success: false });
  }
});

app.get('/api/chat/pending/:sellerId', async (req, res) => {
  try {
    const chats = await Chat.find({
      sellerId: req.params.sellerId,
      isPaid: false
    }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/chats/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const chats = await Chat.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
      isPaid: true
    }).sort({ lastMessageDate: -1 });

    const result = chats.map(c => ({
      ...c.toObject(),
      unreadCount: c.sellerId === userId ? c.sellerUnread : c.buyerUnread
    }));

    res.json(result);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/chat/messages/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    res.json(messages);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/chat/send', async (req, res) => {
  try {
    const { chatId, senderId, content, fromBuyer } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) return res.json({ success: false });
    if (!chat.isPaid) return res.json({ success: false, msg: 'المحادثة غير مفتوحة' });

    const sender = await User.findById(senderId);
    await Message.create({
      chatId,
      senderId,
      senderName: sender?.name || 'مستخدم',
      content,
      fromBuyer: fromBuyer !== false
    });

    chat.lastMessage = content;
    chat.lastMessageDate = new Date();

    if (fromBuyer !== false) {
      chat.sellerUnread = (chat.sellerUnread || 0) + 1;
    } else {
      chat.buyerUnread = (chat.buyerUnread || 0) + 1;
    }

    await chat.save();
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

app.post('/api/chat/read', async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) return res.json({ success: false });

    if (chat.sellerId === userId) {
      chat.sellerUnread = 0;
    } else {
      chat.buyerUnread = 0;
    }

    await chat.save();
    await Message.updateMany(
      { chatId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// ============ NOTIFICATIONS ROUTES ============

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifs = await Notification.find({
      userId: req.params.userId
    }).sort({ date: -1 }).limit(50);
    res.json(notifs);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/unread-counts/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const chats = await Chat.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
      isPaid: true
    });

    let messages = 0;
    chats.forEach(c => {
      messages += c.sellerId === userId ? (c.sellerUnread || 0) : (c.buyerUnread || 0);
    });

    const pendingChats = await Chat.countDocuments({
      sellerId: userId,
      isPaid: false
    });

    const orders = await Order.countDocuments({
      sellerId: userId,
      isRevealed: false
    });

    res.json({ messages, orders, pendingChats });
  } catch (e) {
    res.json({ messages: 0, orders: 0, pendingChats: 0 });
  }
});

// ============ ADMIN ROUTES ============

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      listings: await Listing.countDocuments(),
      orders: await Order.countDocuments(),
      chats: await Chat.countDocuments({ isPaid: true }),
      revenue: 0
    };
    res.json(stats);
  } catch (e) {
    res.json({ users: 0, listings: 0, orders: 0, chats: 0, revenue: 0 });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const users = await User.find().sort({ createdAt: -1 }).limit(limit);
    res.json(users);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/admin/listings', async (req, res) => {
  try {
    const listings = await Listing.find().sort({ date: -1 });
    res.json(listings);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch (e) {
    res.json([]);
  }
});

// ============ PAYMENT METHODS ROUTES ============

app.get('/api/payment-methods', async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).sort({ order: 1 });
    res.json(methods);
  } catch (e) {
    res.json([]);
  }
});

// ============ WALLET ROUTES ============

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const trans = await Trans.find({
      userId: req.params.userId
    }).sort({ date: -1 }).limit(50);
    res.json(trans);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/wallet/deposit', async (req, res) => {
  try {
    const { userId, amount, proof, paymentMethod } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false });
    }

    await Trans.create({
      userId,
      userName: user.name,
      type: 'deposit',
      amount,
      proof,
      paymentMethod,
      description: 'طلب شحن رصيد'
    });

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    msg: 'حدث خطأ في الخادم'
  });
});

// ============ 404 HANDLER ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: 'الصفحة غير موجودة'
  });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DzMarket Server Started Successfully');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`⏱️  Time: ${new Date().toLocaleString('ar-DZ')}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
