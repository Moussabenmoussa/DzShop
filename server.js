require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

// ============ CONFIGURATION ============
const PORT = process.env.PORT || 3000;
const AUTO_RELEASE_HOURS = 72;
const COMMISSION_RATE = 15;

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ DATABASE ============
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ MongoDB Connected'))
        .catch(err => console.error('❌ MongoDB Error:', err));
}

// ============ MODELS ============
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    otpCode: String, otpExpiry: Date,
    balance: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: String,
    userAvatar: String,
    title: { type: String, required: true },
    desc: String,
    price: { type: Number, required: true },
    image: String, // الصورة الرئيسية
    category: { type: String, default: 'other' },
    active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

const OrderSchema = new mongoose.Schema({
    sellerId: String, buyerId: String, listingId: String, listingTitle: String,
    amount: Number, netAmount: Number, status: { type: String, default: 'active' },
    deliveryContent: String, createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const ChatSchema = new mongoose.Schema({
    participants: [String], listingId: String, listingTitle: String,
    lastMessage: String, lastMessageDate: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
    chatId: String, senderId: String, type: { type: String, default: 'text' },
    content: String, meta: mongoose.Schema.Types.Mixed, date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// ============ API ROUTES ============

// 1. PUBLIC PRODUCT (Fixing the connection error)
app.get('/api/public/product/:id', async (req, res) => {
    try {
        const p = await Listing.findById(req.params.id);
        if (!p) return res.json({ error: 'الخدمة غير موجودة' });
        
        // جلب بيانات البائع بأمان
        const seller = await User.findById(p.userId, 'name avatar isVerified lastSeen');
        
        // إرجاع البيانات مدمجة
        res.json({
            ...p.toObject(),
            seller: seller ? seller.toObject() : { name: 'مستخدم محذوف', avatar: '' }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 2. MARKET LISTINGS
app.get('/api/market', async (req, res) => {
    try {
        const listings = await Listing.find({ active: true }).sort({ date: -1 }).limit(50);
        res.json(listings);
    } catch (e) { res.json([]); }
});

// 3. CREATE LISTING
app.post('/api/listing/create', async (req, res) => {
    try {
        const { userId, ...data } = req.body;
        const user = await User.findById(userId);
        await Listing.create({
            userId,
            userName: user.name,
            userAvatar: user.avatar,
            ...data
        });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// 4. AUTH
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase(), password: req.body.password });
    if (!user) return res.json({ success: false, msg: 'خطأ في البيانات' });
    res.json({ success: true, user });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // تسجيل مباشر بدون تفعيل مؤقتاً لتسريع التجربة (يمكنك تفعيل الكود السابق لاحقاً)
        const user = await User.create({ name, email: email.toLowerCase(), password, isVerified: true });
        res.json({ success: true, user });
    } catch (e) { res.json({ success: false, msg: 'البريد مستخدم' }); }
});

// 5. CHAT START
app.post('/api/chat/start', async (req, res) => {
    const { buyerId, sellerId, listingId } = req.body;
    let chat = await Chat.findOne({ participants: { $all: [buyerId, sellerId] }, listingId });
    if (!chat) {
        const listing = await Listing.findById(listingId);
        chat = await Chat.create({
            participants: [buyerId, sellerId],
            listingId,
            listingTitle: listing ? listing.title : 'خدمة',
            lastMessage: 'بداية التفاوض'
        });
    }
    res.json({ success: true, chatId: chat._id });
});

// ... (يمكنك إضافة باقي الروابط الخاصة بالطلبات والمحفظة هنا كما في الكود السابق)

// SERVE FILES
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html'))); // تأكد أن index.html يحتوي على كود dashboard
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
