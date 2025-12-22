
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

// ============ CONFIGURATION ============
const PORT = process.env.PORT || 3000;
const AUTO_RELEASE_HOURS = 72; // القبول التلقائي بعد 3 أيام
const COMMISSION_RATE = 15; // نسبة عمولة الموقع

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ DATABASE ============
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ MongoDB Connected (Social Market Engine)'))
        .catch(err => console.error('❌ MongoDB Error:', err));
}

// ============ MODELS ============

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    
    // الهوية والبروفايل
    avatar: { type: String, default: '' }, // رابط الصورة
    bio: { type: String, default: '' }, // نبذة تعريفية
    isVerified: { type: Boolean, default: false }, // هل أكد الإيميل؟
    otpCode: String, // كود التحقق المؤقت
    otpExpiry: Date,
    
    // الحالة
    balance: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now }, // لحالة الأونلاين
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: String,
    userAvatar: String, // لتسريع العرض
    title: { type: String, required: true },
    desc: String,
    price: { type: Number, required: true }, // السعر المقترح (قابل للتفاوض في الشات)
    image: String, // صورة الغلاف
    category: { type: String, default: 'other' },
    active: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

const OrderSchema = new mongoose.Schema({
    sellerId: String,
    buyerId: String,
    listingId: String, // اختياري (قد يكون اتفاقاً خاصاً)
    listingTitle: String,
    
    amount: Number, // المبلغ المدفوع
    netAmount: Number, // المبلغ للبائع
    commission: Number,
    
    status: { type: String, default: 'active', enum: ['active', 'delivered', 'completed', 'disputed', 'cancelled'] },
    
    deliveryContent: String,
    disputeReason: String,
    
    createdAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    completedAt: Date
});
const Order = mongoose.model('Order', OrderSchema);

const ChatSchema = new mongoose.Schema({
    participants: [{ type: String }], // [SellerId, BuyerId]
    listingId: String,
    listingTitle: String,
    lastMessage: String,
    lastMessageDate: { type: Date, default: Date.now },
    unreadCounts: { type: Map, of: Number, default: {} } // {'userId': 2}
});
const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
    chatId: String,
    senderId: String,
    type: { type: String, default: 'text' }, // text, image, invoice
    content: String, // النص أو الرابط
    meta: mongoose.Schema.Types.Mixed, // بيانات إضافية (مثل تفاصيل الفاتورة)
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const NotificationSchema = new mongoose.Schema({
    userId: String,
    type: String, // message, order_update, system
    title: String,
    body: String,
    link: String,
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

const TransSchema = new mongoose.Schema({
    userId: String,
    type: String, // deposit, withdraw, sale, purchase, refund
    amount: Number,
    description: String,
    status: { type: String, default: 'completed' },
    date: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

// ============ HELPER FUNCTIONS ============

// إرسال إيميل (Brevo API)
async function sendEmail(to, subject, htmlContent) {
    if (!process.env.BREVO_API_KEY) return console.log('⚠️ No Email API Key');
    try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: { name: 'DzMarket', email: process.env.SENDER_EMAIL || 'no-reply@dzmarket.com' }, to: [{ email: to }], subject, htmlContent })
        });
    } catch (e) { console.error('Email Error', e.message); }
}

async function notify(userId, type, title, body, link = '') {
    await Notification.create({ userId, type, title, body, link });
}

// ============ AUTH & PROFILE (OTP + Heartbeat) ============

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.json({ success: false, msg: 'البريد مسجل مسبقاً' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const user = await User.create({
            name, email: email.toLowerCase(), password,
            otpCode: otp,
            otpExpiry: new Date(Date.now() + 10 * 60000) // 10 دقائق
        });

        // إرسال الكود
        sendEmail(email, 'كود التفعيل - DzMarket', `<h1>كود تفعيل حسابك هو: ${otp}</h1>`);

        res.json({ success: true, userId: user._id, msg: 'تم التسجيل! راجع بريدك لتفعيل الحساب' });
    } catch (e) { res.json({ success: false, msg: 'خطأ في السيرفر' }); }
});

app.post('/api/auth/verify', async (req, res) => {
    try {
        const { userId, code } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, msg: 'مستخدم غير موجود' });
        
        if (user.otpCode !== code || new Date() > user.otpExpiry) {
            return res.json({ success: false, msg: 'الكود خاطئ أو منتهي الصلاحية' });
        }

        user.isVerified = true;
        user.otpCode = null;
        await user.save();

        res.json({ success: true, user });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email.toLowerCase(), password: req.body.password });
        if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
        if (!user.isVerified) return res.json({ success: false, msg: 'الحساب غير مفعل', needsVerification: true, userId: user._id });
        if (user.isBanned) return res.json({ success: false, msg: 'الحساب محظور' });
        
        res.json({ success: true, user });
    } catch (e) { res.json({ success: false }); }
});

// تحديث حالة الاتصال (Heartbeat) - يستدعى كل دقيقة من الفرونت
app.post('/api/user/heartbeat', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { lastSeen: new Date() });
    res.json({ success: true });
});

app.post('/api/user/update', async (req, res) => {
    try {
        const { userId, avatar, bio, phone } = req.body;
        await User.findByIdAndUpdate(userId, { avatar, bio, phone });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// جلب بروفايل عام
app.get('/api/profile/:id', async (req, res) => {
    const user = await User.findById(req.params.id, '-password -otpCode -balance');
    if (!user) return res.json({ success: false });
    
    // حساب حالة الأونلاين (نشط في آخر دقيقتين)
    const isOnline = (new Date() - new Date(user.lastSeen)) < 2 * 60 * 1000;
    
    const listings = await Listing.find({ userId: user._id, active: true });
    
    res.json({ success: true, user: { ...user.toObject(), isOnline }, listings });
});

// ============ CHAT & TRANSACTION FLOW ============

// بدء محادثة جديدة (من زر "أنا مهتم")
app.post('/api/chat/start', async (req, res) => {
    try {
        const { buyerId, sellerId, listingId } = req.body;
        
        // البحث عن محادثة سابقة
        let chat = await Chat.findOne({ participants: { $all: [buyerId, sellerId] }, listingId });
        
        if (!chat) {
            const listing = await Listing.findById(listingId);
            chat = await Chat.create({
                participants: [buyerId, sellerId],
                listingId,
                listingTitle: listing ? listing.title : 'خدمة عامة',
                lastMessage: 'بداية المحادثة',
                unreadCounts: { [sellerId]: 1, [buyerId]: 0 }
            });
            // رسالة ترحيبية تلقائية
            await Message.create({ chatId: chat._id, senderId: 'system', content: '👋 بدأت المحادثة. اتفقا على التفاصيل ثم أنشئ الفاتورة.' });
        }
        
        res.json({ success: true, chatId: chat._id });
    } catch (e) { res.json({ success: false }); }
});

// إرسال رسالة (نص، صورة، أو فاتورة)
app.post('/api/chat/send', async (req, res) => {
    try {
        const { chatId, senderId, type, content, amount } = req.body;
        
        // إذا كانت فاتورة
        let meta = null;
        if (type === 'invoice') {
            meta = { amount: Number(amount), status: 'pending' };
        }

        const msg = await Message.create({ chatId, senderId, type, content, meta });
        
        // تحديث الشات
        const chat = await Chat.findById(chatId);
        const receiverId = chat.participants.find(p => p !== senderId);
        
        chat.lastMessage = type === 'invoice' ? `💰 فاتورة: ${amount}$` : (type === 'image' ? '📷 صورة' : content);
        chat.lastMessageDate = new Date();
        // زيادة العداد للطرف الآخر
        chat.unreadCounts.set(receiverId, (chat.unreadCounts.get(receiverId) || 0) + 1);
        await chat.save();

        res.json({ success: true, message: msg });
    } catch (e) { res.json({ success: false }); }
});

app.get('/api/chat/history/:chatId', async (req, res) => {
    const msgs = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    // تصفير العداد للقارئ
    const userId = req.query.userId;
    if (userId) {
        const chat = await Chat.findById(req.params.chatId);
        if (chat) { chat.unreadCounts.set(userId, 0); await chat.save(); }
    }
    res.json(msgs);
});

// ============ PAY & ESCROW ============

// دفع الفاتورة (داخل الشات) -> إنشاء طلب وحجز المال
app.post('/api/order/pay-invoice', async (req, res) => {
    try {
        const { messageId, buyerId } = req.body;
        const msg = await Message.findById(messageId);
        if (!msg || msg.type !== 'invoice' || msg.meta.status !== 'pending') return res.json({ success: false, msg: 'الفاتورة غير صالحة' });

        const buyer = await User.findById(buyerId);
        const amount = msg.meta.amount;
        
        if (buyer.balance < amount) return res.json({ success: false, msg: 'الرصيد غير كافٍ' });

        // 1. خصم وحجز
        buyer.balance -= amount;
        await buyer.save();

        // 2. إنشاء الطلب
        const chat = await Chat.findById(msg.chatId);
        const sellerId = chat.participants.find(p => p !== buyerId);
        const seller = await User.findById(sellerId);

        const commission = (amount * COMMISSION_RATE) / 100;
        const netAmount = amount - commission;

        const order = await Order.create({
            sellerId, buyerId, listingId: chat.listingId, listingTitle: chat.listingTitle,
            amount, netAmount, commission, status: 'active'
        });

        // 3. تحديث رسالة الفاتورة لتظهر كـ "مدفوعة"
        msg.meta.status = 'paid';
        msg.meta.orderId = order._id;
        await msg.save();

        // 4. رسالة سيستم في الشات
        await Message.create({ chatId: chat._id, senderId: 'system', content: `✅ تم دفع الفاتورة (${amount}$). المبلغ محجوز الآن لدى الإدارة.` });

        await notify(sellerId, 'order_update', 'تم الدفع!', `دفع المشتري ${amount}$. يمكنك تسليم العمل الآن.`);

        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// تسليم العمل (يرسل إشعاراً ويحدث الطلب)
app.post('/api/order/deliver', async (req, res) => {
    try {
        const { orderId, sellerId, content } = req.body;
        const order = await Order.findOneAndUpdate(
            { _id: orderId, sellerId },
            { status: 'delivered', deliveryContent: content, deliveredAt: new Date() },
            { new: true }
        );
        
        // إشعار للمشتري
        await notify(order.buyerId, 'order_update', 'تم التسليم 📦', 'قام البائع بتسليم العمل. راجعه الآن.');
        
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// قبول وإنهاء (تحرير المال)
app.post('/api/order/complete', async (req, res) => {
    try {
        const { orderId, buyerId } = req.body;
        const order = await Order.findOne({ _id: orderId, buyerId });
        
        if (order.status !== 'delivered') return res.json({ success: false });

        // تحويل المال للبائع
        const seller = await User.findById(order.sellerId);
        seller.balance += order.netAmount;
        seller.reviewsCount += 1; // زيادة عداد المبيعات
        await seller.save();

        order.status = 'completed';
        order.completedAt = new Date();
        await order.save();

        await notify(order.sellerId, 'wallet', 'مبروك! 💵', `تم تحرير ${order.netAmount}$ لمحفظتك.`);

        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// ============ ADMIN CONTROL ============

app.get('/api/admin/stats', async (req, res) => {
    // إحصائيات سريعة للرادار
    const users = await User.countDocuments();
    const activeOrders = await Order.countDocuments({ status: { $in: ['active', 'delivered'] } });
    const disputes = await Order.countDocuments({ status: 'disputed' });
    res.json({ users, activeOrders, disputes });
});

// مراقبة الشات (للأدمن فقط)
app.get('/api/admin/chat-monitor/:chatId', async (req, res) => {
    // هنا يجب إضافة middleware للتحقق من isAdmin
    const msgs = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    res.json(msgs);
});

// حل النزاع
app.post('/api/admin/resolve-dispute', async (req, res) => {
    const { orderId, decision } = req.body; // decision: 'refund_buyer' or 'release_seller'
    const order = await Order.findById(orderId);
    if (order.status !== 'disputed') return res.json({ success: false });

    if (decision === 'release_seller') {
        const seller = await User.findById(order.sellerId);
        seller.balance += order.netAmount;
        await seller.save();
        order.status = 'completed';
    } else {
        const buyer = await User.findById(order.buyerId);
        buyer.balance += order.amount; // إرجاع كامل المبلغ
        await buyer.save();
        order.status = 'cancelled';
    }
    await order.save();
    res.json({ success: true });
});

// ============ LISTINGS & SEARCH ============
app.post('/api/listing/create', async (req, res) => {
    await Listing.create(req.body);
    res.json({ success: true });
});

app.get('/api/market', async (req, res) => {
    const listings = await Listing.find({ active: true }).sort({ date: -1 }).limit(50);
    res.json(listings);
});

// ============ SERVE FILES ============
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

app.listen(PORT, () => console.log(`🚀 Social Market Server running on port ${PORT}`));
