const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

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
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    phone: String,
    fingerprint: String,
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: String,
    type: { type: String, default: 'product' },
    title: { type: String, required: true },
    desc: String,
    price: { type: Number, required: true },
    images: [{ type: String }],
    image: String,
    category: { type: String, default: 'other' },
    colors: [{ type: String }],
    sizes: [{ type: String }],
    offerEndTime: { type: Number },
    active: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

// طلبات المنتجات المادية
const OrderSchema = new mongoose.Schema({
    listingId: String,
    listingTitle: String,
    sellerId: String,
    sellerName: String,
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true },
    buyerWilaya: { type: String, required: true },
    buyerCity: String,
    buyerAddress: String,
    buyerFingerprint: String,
    color: String,
    size: String,
    quantity: { type: Number, default: 1 },
    totalPrice: Number,
    isRevealed: { type: Boolean, default: false },
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// المحادثات للخدمات
const ChatSchema = new mongoose.Schema({
    listingId: String,
    listingTitle: String,
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
    fromBuyer: { type: Boolean, default: true },
    isRead: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// الإشعارات
const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    title: String,
    message: String,
    targetId: String,
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

// طرق الدفع
const PaymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, default: 'local' },
    account: String,
    holder: String,
    icon: { type: String, default: 'credit-card' },
    instructions: String,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
});
const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

const TransSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    type: { type: String, default: 'deposit' },
    amount: Number,
    description: String,
    proof: String,
    paymentMethod: String,
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
    const s = await Settings.findOne({ key });
    return s ? s.value : defaultValue;
}

async function setSetting(key, value) {
    await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
}

async function createNotification(userId, type, title, message, targetId = '') {
    await Notification.create({ userId, type, title, message, targetId });
}

async function deductBalance(userId, amount, description) {
    const user = await User.findById(userId);
    if (!user || user.balance < amount) return false;
    user.balance -= amount;
    await user.save();
    await Trans.create({ userId, userName: user.name, type: 'deduct', amount, description, status: 'completed' });
    return user.balance;
}

// ============ PAGES ============
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

// ============ PUBLIC SETTINGS API ============
app.get('/api/public/settings', async (req, res) => {
    try {
        const orderRevealPrice = await getSetting('orderRevealPrice', 50);
        const chatPrice = await getSetting('chatPrice', 50);
        const freeMode = await getSetting('freeMode', false);
        const currency = await getSetting('currency', 'دج');
        res.json({ orderRevealPrice, chatPrice, freeMode, currency });
    } catch (e) {
        res.json({ orderRevealPrice: 50, chatPrice: 50, freeMode: false, currency: 'دج' });
    }
});

// ============ AUTH API ============
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, fingerprint } = req.body;
        if (!name || !email || !password) return res.json({ success: false, msg: 'جميع الحقول مطلوبة' });
        
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });
        
        const user = await User.create({ name, email: email.toLowerCase(), password, phone, fingerprint });
        await createNotification(user._id, 'system', 'مرحباً بك!', 'تم إنشاء حسابك بنجاح في DzMarket');
        res.json({ success: true, user });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ في التسجيل' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase(), password });
        
        if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
        if (user.isBanned) return res.json({ success: false, msg: 'حسابك محظور' });
        
        res.json({ success: true, user });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ' });
    }
});

app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    res.json(user ? { success: true, user } : { success: false });
});

// ============ LISTINGS API ============
app.post('/api/listing/create', async (req, res) => {
    try {
        await Listing.create(req.body);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.get('/api/market', async (req, res) => {
    const list = await Listing.find({ active: true }).sort({ date: -1 }).limit(100);
    res.json(list);
});

app.post('/api/user/listings', async (req, res) => {
    const list = await Listing.find({ userId: req.body.userId }).sort({ date: -1 });
    res.json(list);
});

app.get('/api/public/product/:id', async (req, res) => {
    const p = await Listing.findById(req.params.id);
    if (p) await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(p || {});
});

// ============ ORDERS API (للمنتجات المادية) ============
app.post('/api/order/create', async (req, res) => {
    try {
        const { listingId, buyerName, buyerPhone, buyerWilaya, buyerCity, buyerAddress, color, size, quantity, totalPrice, fingerprint } = req.body;
        
        const listing = await Listing.findById(listingId);
        if (!listing) return res.json({ success: false, msg: 'الإعلان غير موجود' });
        
        const seller = await User.findById(listing.userId);
        if (seller?.fingerprint === fingerprint) return res.json({ success: false, msg: 'لا يمكنك الطلب من نفسك' });
        
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
        
        // إشعار للبائع
        await createNotification(listing.userId, 'order', 'طلب جديد! 🎉', `لديك طلب جديد على "${listing.title}"`, order._id);
        
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ في إنشاء الطلب' });
    }
});

app.get('/api/seller/orders/:userId', async (req, res) => {
    const freeMode = await getSetting('freeMode', false);
    const orders = await Order.find({ sellerId: req.params.userId }).sort({ date: -1 });
    res.json(orders.map(o => ({
        ...o.toObject(),
        // إذا كان الوضع المجاني مفعل، أظهر كل المعلومات
        buyerPhone: (o.isRevealed || freeMode) ? o.buyerPhone : o.buyerPhone.substring(0, 4) + '******',
        buyerAddress: (o.isRevealed || freeMode) ? o.buyerAddress : '********',
        isRevealed: o.isRevealed || freeMode
    })));
});

app.post('/api/order/reveal', async (req, res) => {
    try {
        const { userId, orderId } = req.body;
        const user = await User.findById(userId);
        const order = await Order.findById(orderId);
        
        if (!user || !order) return res.json({ success: false, msg: 'خطأ' });
        if (order.isRevealed) return res.json({ success: true, newBalance: user.balance });
        
        // تحقق من الوضع المجاني
        const freeMode = await getSetting('freeMode', false);
        if (freeMode) {
            order.isRevealed = true;
            await order.save();
            return res.json({ success: true, newBalance: user.balance });
        }
        
        const revealPrice = await getSetting('orderRevealPrice', 50);
        if (user.balance < revealPrice) return res.json({ success: false, msg: 'رصيد غير كافٍ' });
        
        const newBalance = await deductBalance(userId, revealPrice, `كشف طلب: ${order.listingTitle}`);
        if (newBalance === false) return res.json({ success: false, msg: 'رصيد غير كافٍ' });
        
        order.isRevealed = true;
        await order.save();
        
        res.json({ success: true, newBalance });
    } catch (e) {
        res.json({ success: false });
    }
});

// ============ CHAT API (للخدمات) - البائع يدفع ============

// طلب محادثة من المشتري (لا يدفع المشتري)
app.post('/api/chat/request', async (req, res) => {
    try {
        const { listingId, fingerprint, buyerName } = req.body;
        
        const listing = await Listing.findById(listingId);
        if (!listing) return res.json({ success: false, msg: 'الخدمة غير موجودة' });
        
        if (listing.type !== 'service') return res.json({ success: false, msg: 'هذا ليس خدمة' });
        
        // تحقق إذا كانت محادثة موجودة
        let chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });
        
        if (chat) {
            return res.json({ success: true, chatId: chat._id, isPaid: chat.isPaid });
        }
        
        // إنشاء محادثة جديدة (غير مدفوعة بعد)
        chat = await Chat.create({
            listingId,
            listingTitle: listing.title,
            sellerId: listing.userId,
            sellerName: listing.userName,
            buyerName: buyerName || 'مشتري',
            buyerFingerprint: fingerprint,
            isPaid: false
        });
        
        // إشعار للبائع بوجود طلب محادثة جديد
        await createNotification(listing.userId, 'chat_request', 'طلب محادثة جديد! 💬', `${buyerName || 'مشتري'} يريد التواصل معك حول "${listing.title}"`, chat._id);
        
        return res.json({ success: true, chatId: chat._id, isPaid: false, msg: 'تم إرسال طلب المحادثة للبائع' });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ' });
    }
});

// البائع يقبل المحادثة ويدفع
app.post('/api/chat/accept', async (req, res) => {
    try {
        const { chatId, sellerId } = req.body;
        
        const chat = await Chat.findById(chatId);
        if (!chat) return res.json({ success: false, msg: 'المحادثة غير موجودة' });
        
        if (chat.sellerId !== sellerId) return res.json({ success: false, msg: 'غير مصرح' });
        
        if (chat.isPaid) return res.json({ success: true, msg: 'المحادثة مفتوحة بالفعل' });
        
        const seller = await User.findById(sellerId);
        if (!seller) return res.json({ success: false, msg: 'البائع غير موجود' });
        
        // تحقق من الوضع المجاني
        const freeMode = await getSetting('freeMode', false);
        
        if (!freeMode) {
            const chatPrice = await getSetting('chatPrice', 50);
            
            if (seller.balance < chatPrice) {
                return res.json({ success: false, msg: `رصيدك غير كافٍ. تحتاج ${chatPrice} لفتح المحادثة` });
            }
            
            // خصم الرصيد من البائع
            const newBalance = await deductBalance(sellerId, chatPrice, `فتح محادثة: ${chat.listingTitle}`);
            if (newBalance === false) return res.json({ success: false, msg: 'رصيد غير كافٍ' });
        }
        
        chat.isPaid = true;
        await chat.save();
        
        // إشعار للمشتري
        if (chat.buyerId) {
            await createNotification(chat.buyerId, 'message', 'تم قبول طلبك! ✅', `${chat.sellerName} قبل طلب المحادثة حول "${chat.listingTitle}"`, chatId);
        }
        
        return res.json({ success: true, msg: 'تم فتح المحادثة بنجاح' });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ' });
    }
});

// الحصول على طلبات المحادثات المعلقة للبائع
app.get('/api/chat/pending/:sellerId', async (req, res) => {
    try {
        const chats = await Chat.find({ sellerId: req.params.sellerId, isPaid: false }).sort({ createdAt: -1 });
        res.json(chats);
    } catch (e) {
        res.json([]);
    }
});

// إبقاء الـ API القديم للتوافق (لكن بمنطق جديد)
app.post('/api/chat/start', async (req, res) => {
    try {
        const { listingId, fingerprint, userId, userName } = req.body;
        
        const listing = await Listing.findById(listingId);
        if (!listing) return res.json({ success: false, msg: 'الخدمة غير موجودة' });
        
        if (listing.type !== 'service') return res.json({ success: false, msg: 'هذا ليس خدمة' });
        
        // تحقق إذا كانت محادثة موجودة ومدفوعة
        let chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });
        
        if (chat && chat.isPaid) {
            return res.json({ success: true, chatId: chat._id });
        }
        
        // إنشاء أو تحديث المحادثة
        if (chat) {
            chat.buyerId = userId;
            chat.buyerName = userName;
            await chat.save();
        } else {
            chat = await Chat.create({
                listingId,
                listingTitle: listing.title,
                sellerId: listing.userId,
                sellerName: listing.userName,
                buyerId: userId,
                buyerName: userName,
                buyerFingerprint: fingerprint,
                isPaid: false
            });
        }
        
        // إشعار للبائع
        await createNotification(listing.userId, 'chat_request', 'طلب محادثة جديد! 💬', `${userName || 'مشتري'} يريد التواصل معك حول "${listing.title}"`, chat._id);
        
        return res.json({ success: true, chatId: chat._id, isPaid: false, msg: 'تم إرسال طلب المحادثة للبائع. انتظر قبوله.' });
    } catch (e) {
        res.json({ success: false, msg: 'خطأ' });
    }
});

app.get('/api/chat/:chatId', async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    res.json(chat || {});
});

app.get('/api/chats/:userId', async (req, res) => {
    const userId = req.params.userId;
    const chats = await Chat.find({
        $or: [{ sellerId: userId }, { buyerId: userId }],
        isPaid: true
    }).sort({ lastMessageDate: -1 });
    
    // إضافة عدد الرسائل غير المقروءة
    const result = chats.map(c => ({
        ...c.toObject(),
        unreadCount: c.sellerId === userId ? c.sellerUnread : c.buyerUnread
    }));
    
    res.json(result);
});

app.get('/api/chat/messages/:chatId', async (req, res) => {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    res.json(messages);
});

app.post('/api/chat/send', async (req, res) => {
    try {
        const { chatId, senderId, content, fromBuyer } = req.body;
        
        const chat = await Chat.findById(chatId);
        if (!chat) return res.json({ success: false });
        
        // التحقق من أن المحادثة مدفوعة
        if (!chat.isPaid) return res.json({ success: false, msg: 'المحادثة غير مفتوحة بعد' });
        
        const sender = await User.findById(senderId);
        
        await Message.create({
            chatId,
            senderId,
            senderName: sender?.name || 'مستخدم',
            content,
            fromBuyer: fromBuyer !== false
        });
        
        // تحديث آخر رسالة
        chat.lastMessage = content;
        chat.lastMessageDate = new Date();
        
        // زيادة عداد غير المقروء
        if (fromBuyer !== false) {
            chat.sellerUnread = (chat.sellerUnread || 0) + 1;
            await createNotification(chat.sellerId, 'message', 'رسالة جديدة 💬', content.substring(0, 50), chatId);
        } else {
            chat.buyerUnread = (chat.buyerUnread || 0) + 1;
            if (chat.buyerId) {
                await createNotification(chat.buyerId, 'message', 'رسالة جديدة 💬', content.substring(0, 50), chatId);
            }
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
        await Message.updateMany({ chatId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// ============ NOTIFICATIONS API ============
app.get('/api/notifications/:userId', async (req, res) => {
    const notifs = await Notification.find({ userId: req.params.userId }).sort({ date: -1 }).limit(50);
    res.json(notifs);
});

app.post('/api/notification/read', async (req, res) => {
    await Notification.findByIdAndUpdate(req.body.id, { read: true });
    res.json({ success: true });
});

app.post('/api/notifications/read-all', async (req, res) => {
    await Notification.updateMany({ userId: req.body.userId }, { read: true });
    res.json({ success: true });
});

app.get('/api/unread-counts/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    const chats = await Chat.find({
        $or: [{ sellerId: userId }, { buyerId: userId }],
        isPaid: true
    });
    
    let messages = 0;
    chats.forEach(c => {
        messages += c.sellerId === userId ? (c.sellerUnread || 0) : (c.buyerUnread || 0);
    });
    
    // عد طلبات المحادثات المعلقة للبائع
    const pendingChats = await Chat.countDocuments({ sellerId: userId, isPaid: false });
    
    const orders = await Order.countDocuments({ sellerId: userId, isRevealed: false });
    
    res.json({ messages, orders, pendingChats });
});

// ============ PAYMENT METHODS API ============
app.get('/api/payment-methods', async (req, res) => {
    const methods = await PaymentMethod.find({ isActive: true }).sort({ order: 1 });
    res.json(methods);
});

// ============ TRANSACTIONS API ============
app.get('/api/transactions/:userId', async (req, res) => {
    const trans = await Trans.find({ userId: req.params.userId }).sort({ date: -1 }).limit(50);
    res.json(trans);
});

// ============ WALLET API ============
app.post('/api/wallet/deposit', async (req, res) => {
    try {
        const { userId, amount, proof, paymentMethod } = req.body;
        const user = await User.findById(userId);
        await Trans.create({ 
            userId, 
            userName: user?.name, 
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

// ============ ADMIN API ============

// Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [users, listings, orders, pendingDeposits, chats] = await Promise.all([
            User.countDocuments(),
            Listing.countDocuments(),
            Order.countDocuments(),
            Trans.countDocuments({ status: 'pending', type: 'deposit' }),
            Chat.countDocuments({ isPaid: true })
        ]);
        
        const revealedOrders = await Order.countDocuments({ isRevealed: true });
        const orderRevealPrice = await getSetting('orderRevealPrice', 50);
        const chatPrice = await getSetting('chatPrice', 50);
        const revenue = (revealedOrders * orderRevealPrice) + (chats * chatPrice);
        
        res.json({ users, listings, orders, pendingDeposits, chats, revenue });
    } catch (e) {
        res.json({ users: 0, listings: 0, orders: 0, pendingDeposits: 0, chats: 0, revenue: 0 });
    }
});

// Users Management
app.get('/api/admin/users', async (req, res) => {
    const limit = parseInt(req.query.limit) || 1000;
    const users = await User.find().sort({ createdAt: -1 }).limit(limit);
    res.json(users);
});

app.post('/api/admin/user/update', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        await User.findByIdAndUpdate(id, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/user/add-balance', async (req, res) => {
    try {
        const { id, amount } = req.body;
        await User.findByIdAndUpdate(id, { $inc: { balance: amount } });
        
        const user = await User.findById(id);
        await Trans.create({
            userId: id,
            userName: user?.name,
            type: 'deposit',
            amount,
            description: 'إضافة رصيد من الإدارة',
            status: 'completed'
        });
        
        await createNotification(id, 'deposit', 'تم شحن رصيدك! 💰', `تم إضافة ${amount} لرصيدك`);
        
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/user/delete', async (req, res) => {
    try {
        const { id } = req.body;
        await User.findByIdAndDelete(id);
        await Listing.deleteMany({ userId: id });
        await Order.deleteMany({ sellerId: id });
        await Chat.deleteMany({ $or: [{ sellerId: id }, { buyerId: id }] });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Listings Management
app.get('/api/admin/listings', async (req, res) => {
    const listings = await Listing.find().sort({ date: -1 });
    res.json(listings);
});

app.post('/api/admin/listing/update', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        await Listing.findByIdAndUpdate(id, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/listing/toggle', async (req, res) => {
    try {
        const { id, active } = req.body;
        await Listing.findByIdAndUpdate(id, { active });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/listing/delete', async (req, res) => {
    try {
        await Listing.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/listings/clear-inactive', async (req, res) => {
    try {
        const result = await Listing.deleteMany({ active: false });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (e) {
        res.json({ success: false });
    }
});

// Orders Management
app.get('/api/admin/orders', async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

app.post('/api/admin/order/delete', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Chats Management
app.get('/api/admin/chats', async (req, res) => {
    const chats = await Chat.find({ isPaid: true }).sort({ createdAt: -1 });
    res.json(chats);
});

// Deposits Management
app.get('/api/admin/deposits', async (req, res) => {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 1000;
    const query = status && status !== 'all' ? { status, type: 'deposit' } : { type: 'deposit' };
    const deposits = await Trans.find(query).sort({ date: -1 }).limit(limit);
    res.json(deposits);
});

app.post('/api/admin/approve-deposit', async (req, res) => {
    try {
        const { transId, action } = req.body;
        const trans = await Trans.findById(transId);
        
        if (!trans || trans.status !== 'pending') {
            return res.json({ success: false, msg: 'الطلب غير موجود أو تمت معالجته' });
        }
        
        if (action === 'approve') {
            await User.findByIdAndUpdate(trans.userId, { $inc: { balance: trans.amount } });
            trans.status = 'approved';
            await createNotification(trans.userId, 'deposit', 'تم شحن رصيدك! 💰', `تم إضافة ${trans.amount} لرصيدك`);
        } else {
            trans.status = 'rejected';
            await createNotification(trans.userId, 'deposit', 'تم رفض طلب الشحن', 'يرجى التواصل مع الدعم');
        }
        
        await trans.save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Payment Methods Management
app.get('/api/admin/payment-methods', async (req, res) => {
    const methods = await PaymentMethod.find().sort({ order: 1 });
    res.json(methods);
});

app.post('/api/admin/payment-method/create', async (req, res) => {
    try {
        await PaymentMethod.create(req.body);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/payment-method/update', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        await PaymentMethod.findByIdAndUpdate(id, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/payment-method/delete', async (req, res) => {
    try {
        await PaymentMethod.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Settings
app.get('/api/admin/settings', async (req, res) => {
    try {
        const settings = await Settings.find();
        const obj = {};
        settings.forEach(s => obj[s.key] = s.value);
        res.json(obj);
    } catch (e) {
        res.json({});
    }
});

app.post('/api/admin/settings', async (req, res) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            await setSetting(key, value);
        }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Export Data
app.get('/api/admin/export/:type', async (req, res) => {
    try {
        let data;
        switch (req.params.type) {
            case 'users': data = await User.find().lean(); break;
            case 'listings': data = await Listing.find().lean(); break;
            case 'orders': data = await Order.find().lean(); break;
            case 'chats': data = await Chat.find().lean(); break;
            default: data = [];
        }
        res.json(data);
    } catch (e) {
        res.json([]);
    }
});

// Clear old data
app.post('/api/admin/orders/clear-old', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Order.deleteMany({ date: { $lt: thirtyDaysAgo } });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (e) {
        res.json({ success: false });
    }
});

// ============ START SERVER ============
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

