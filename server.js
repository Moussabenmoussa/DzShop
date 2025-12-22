
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- MODELS ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' }, // صورة الغلاف الجديدة
    bio: { type: String, default: 'بائع جديد في المنصة' }, // النبذة
    isVerified: { type: Boolean, default: false },
    otpCode: String,
    balance: { type: Number, default: 0 },
    sales: { type: Number, default: 0 }, // عدد المبيعات
    rating: { type: Number, default: 5.0 }, // التقييم
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
    userId: String, userName: String, userAvatar: String,
    title: String, desc: String, price: Number, image: String,
    category: String, active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

const ChatSchema = new mongoose.Schema({
    participants: [String], listingId: String, listingTitle: String,
    lastMessage: String, lastMessageDate: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
    chatId: String, senderId: String, type: String, content: String,
    meta: mongoose.Schema.Types.Mixed, date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const OrderSchema = new mongoose.Schema({
    sellerId: String, buyerId: String, listingId: String, listingTitle: String,
    amount: Number, netAmount: Number, status: { type: String, default: 'active' },
    deliveryContent: String, createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- AUTH & USER API ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });
        // إنشاء المستخدم مع تفعيل افتراضي لتسهيل الدخول (يمكنك تغييرها لاحقاً)
        const user = await User.create({ name, email, password, isVerified: true });
        res.json({ success: true, userId: user._id, user });
    } catch (e) { res.json({ success: false, msg: 'خطأ' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
    res.json({ success: true, user });
});

app.post('/api/user/heartbeat', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { lastSeen: new Date() });
    res.json({ success: true });
});

// ** API جلب البروفايل الحقيقي **
app.get('/api/public/profile/:id', async (req, res) => {
    try {
        // جلب بيانات المستخدم (بدون الباسورد)
        const user = await User.findById(req.params.id, '-password -email -otpCode -balance');
        if (!user) return res.json({ error: 'User not found' });
        
        // جلب خدماته النشطة
        const listings = await Listing.find({ userId: user._id, active: true }).sort({ date: -1 });
        
        // حساب حالة الاتصال (آخر دقيقتين)
        const isOnline = (new Date() - new Date(user.lastSeen)) < 2 * 60 * 1000;

        res.json({ 
            user: { ...user.toObject(), isOnline }, 
            listings 
        });
    } catch (e) { res.json({ error: 'Error' }); }
});

// --- MARKET API ---
app.post('/api/listing/create', async (req, res) => {
    const { userId, ...data } = req.body;
    const user = await User.findById(userId);
    await Listing.create({ userId, userName: user.name, userAvatar: user.avatar, ...data });
    res.json({ success: true });
});

app.get('/api/market', async (req, res) => {
    const list = await Listing.find({ active: true }).sort({ date: -1 });
    res.json(list);
});

app.get('/api/public/product/:id', async (req, res) => {
    try {
        const p = await Listing.findById(req.params.id);
        if(!p) return res.json({});
        const seller = await User.findById(p.userId);
        res.json({ ...p.toObject(), seller });
    } catch(e) { res.json({}); }
});

// --- CHAT API ---
app.post('/api/chat/start', async (req, res) => {
    const { buyerId, sellerId, listingId } = req.body;
    let chat = await Chat.findOne({ participants: { $all: [buyerId, sellerId] }, listingId });
    if (!chat) {
        const listing = await Listing.findById(listingId);
        chat = await Chat.create({ participants: [buyerId, sellerId], listingId, listingTitle: listing ? listing.title : 'تواصل عام', lastMessage: 'بداية المحادثة' });
    }
    res.json({ success: true, chatId: chat._id });
});

app.get('/api/chats/:userId', async (req, res) => {
    const chats = await Chat.find({ participants: req.params.userId }).sort({ lastMessageDate: -1 });
    res.json(chats);
});

app.get('/api/chat/history/:chatId', async (req, res) => {
    const msgs = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    res.json(msgs);
});

app.post('/api/chat/send', async (req, res) => {
    const { chatId, senderId, type, content, amount } = req.body;
    const meta = type === 'invoice' ? { amount, status: 'pending' } : null;
    await Message.create({ chatId, senderId, type, content, meta });
    await Chat.findByIdAndUpdate(chatId, { lastMessage: type === 'invoice' ? 'فاتورة' : content, lastMessageDate: new Date() });
    res.json({ success: true });
});

// --- SERVE FILES ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
// 👇 الرابط الجديد للبروفايل 👇
app.get('/u/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`🚀 Server Live`));
