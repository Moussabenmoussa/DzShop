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
    isVerified: { type: Boolean, default: false }, // يجب التفعيل
    otpCode: String,
    balance: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now }
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

// --- EMAIL FUNCTION ---
async function sendEmail(to, code) {
    if (!process.env.BREVO_API_KEY) return;
    await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: { name: 'DzMarket', email: process.env.SENDER_EMAIL || 'verify@dzshop.com' },
            to: [{ email: to }],
            subject: 'كود تفعيل حسابك',
            htmlContent: `<h1>كود التفعيل: ${code}</h1>`
        })
    });
}

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.create({ name, email, password, otpCode: otp, isVerified: false });
        
        // إرسال الكود
        await sendEmail(email, otp);
        
        res.json({ success: true, userId: user._id, needsVerification: true });
    } catch (e) { res.json({ success: false, msg: 'خطأ' }); }
});

app.post('/api/auth/verify', async (req, res) => {
    const { userId, code } = req.body;
    const user = await User.findById(userId);
    if (user && user.otpCode === code) {
        user.isVerified = true;
        user.otpCode = null;
        await user.save();
        res.json({ success: true, user });
    } else {
        res.json({ success: false, msg: 'كود خاطئ' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
    if (!user.isVerified) return res.json({ success: false, msg: 'غير مفعل', needsVerification: true, userId: user._id });
    res.json({ success: true, user });
});

app.post('/api/user/heartbeat', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { lastSeen: new Date() });
    res.json({ success: true });
});

// --- MARKET ROUTES ---
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

// --- CHAT ROUTES ---
app.post('/api/chat/start', async (req, res) => {
    const { buyerId, sellerId, listingId } = req.body;
    let chat = await Chat.findOne({ participants: { $all: [buyerId, sellerId] }, listingId });
    if (!chat) {
        const listing = await Listing.findById(listingId);
        chat = await Chat.create({ participants: [buyerId, sellerId], listingId, listingTitle: listing.title, lastMessage: 'بداية التفاوض' });
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

// --- FILES ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

// 👇👇 أضف هذا السطر لكي تعمل لوحة الأدمن 👇👇
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`🚀 Server OK`));
