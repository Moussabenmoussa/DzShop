
require('dotenv').config();
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
    emailNotifications: { type: Boolean, default: true },
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


rating: { type: Number, default: 0 }, 
    reviews: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    isAffiliate: { type: Boolean, default: false },
    commission: { type: Number, default: 0 },
    boostExpiry: { type: Date },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);
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
    affiliateId: String,
    commissionAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);
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
const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    title: String,
    message: String,
    targetId: String,
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);
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

// إرسال بريد إلكتروني عبر Brevo API
async function sendEmail(to, subject, htmlContent) {
    try {
        if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
            console.log('⚠️ Email settings not configured, skipping email send');
            return false;
        }

        const siteName = await getSetting('siteName', 'DzMarket');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: siteName,
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
        } else {
            const error = await response.json();
            console.error('❌ Email error:', JSON.stringify(error));
            return false;
        }
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return false;
    }
}

// قالب البريد الإلكتروني
function getEmailTemplate(title, message, actionUrl = null, actionText = null) {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #e63946 0%, #c1121f 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">DzMarket</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">السوق الجزائري</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #1d3557; margin: 0 0 20px 0; font-size: 20px;">${title}</h2>
                <p style="color: #64748b; line-height: 1.8; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
                ${actionUrl ? `
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #e63946 0%, #c1121f 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: bold; font-size: 16px;">${actionText || 'عرض التفاصيل'}</a>
                </div>
                ` : ''}
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">هذا البريد مرسل تلقائياً من DzMarket</p>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">© ${new Date().getFullYear()} DzMarket - جميع الحقوق محفوظة</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// إنشاء إشعار مع إرسال بريد إلكتروني
async function createNotification(userId, type, title, message, targetId = '') {
    const notification = await Notification.create({ userId, type, title, message, targetId });

    try {
        const user = await User.findById(userId);
        if (user && user.email && user.emailNotifications !== false) {
            const siteUrl = process.env.SITE_URL || 'https://dzshop.onrender.com';
            let actionUrl = siteUrl;
            let actionText = 'زيارة الموقع';

            switch(type) {
                case 'order':
                    actionUrl = `${siteUrl}/#orders`;
                    actionText = 'عرض الطلبات';
                    break;
                case 'chat_request':
                    actionUrl = `${siteUrl}/#chat-requests`;
                    actionText = 'عرض طلبات المحادثة';
                    break;
                case 'message':
                    actionUrl = `${siteUrl}/#messages`;
                    actionText = 'عرض الرسائل';
                    break;
                case 'deposit':
                    actionUrl = `${siteUrl}/#wallet`;
                    actionText = 'عرض المحفظة';
                    break;
            }

            const emailHtml = getEmailTemplate(title, message, actionUrl, actionText);
            const emailSent = await sendEmail(user.email, `${title} - DzMarket`, emailHtml);

            if (emailSent) {
                notification.emailSent = true;
                await notification.save();
            }
        }
    } catch (emailError) {
        console.error('Error sending notification email:', emailError.message);
    }

    return notification;
}

async function deductBalance(userId, amount, description) {
    const user = await User.findById(userId);
    if (!user || user.balance < amount) return false;
    user.balance -= amount;
    await user.save();
    await Trans.create({ userId, userName: user.name, type: 'deduct', amount, description, status: 'completed' });
    return user.balance;
}


app.get('/api/market', async (req, res) => {
    // الترتيب: من يملك تاريخ ترويج (في المستقبل) يظهر في القمة، ثم الباقي حسب الأحدث
    const list = await Listing.find({ active: true })
        .sort({ boostExpiry: -1, date: -1 }) // -1 يعني من الأكبر (المستقبل) للأصغر
        .limit(100);
    res.json(list);
});
// ============ PAGES ============
// 1. الصفحة الرئيسية (واجهة الزوار الجديدة)
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// 2. لوحة التحكم (الملف الأصلي)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dashboard.html'));
});

// 3. عرض المنتج (رابط ديناميكي)
app.get('/p/:id', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'product.html'));
});

// 4. لوحة الإدارة
app.get('/super-admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});
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

// ============ ORDERS API ============
app.post('/api/order/create', async (req, res) => {
    try {
        const { listingId, buyerName, buyerPhone, buyerWilaya, buyerCity, buyerAddress, color, size, quantity, totalPrice, fingerprint, affiliateId } = req.body;

        const listing = await Listing.findById(listingId);
        if (!listing) return res.json({ success: false, msg: 'الإعلان غير موجود' });

        const seller = await User.findById(listing.userId);
        if (seller?.fingerprint === fingerprint) return res.json({ success: false, msg: 'لا يمكنك الطلب من نفسك' });

        let commissionAmount = 0;
        if (listing.isAffiliate && listing.commission > 0 && affiliateId && affiliateId !== listing.userId) {
            commissionAmount = (listing.price * listing.commission) / 100;
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
            totalPrice: totalPrice || listing.price,
            affiliateId: affiliateId || null,
            commissionAmount
        });

        await createNotification(listing.userId, 'order', 'طلب جديد! 🎉', `لديك طلب جديد على "${listing.title}" من ${buyerName}`, order._id);

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
        buyerPhone: (o.isRevealed || freeMode) ? o.buyerPhone : o.buyerPhone.substring(0, 4) + '******',
        buyerAddress: (o.isRevealed || freeMode) ? o.buyerAddress : '********',
        isRevealed: o.isRevealed || freeMode
    })));
});

app.post('/api/order/reveal', async (req, res) => {
    try {
        const { userId, orderId } = req.body;
        const user = await User.findById(userId); // This is the SELLER
        const order = await Order.findById(orderId);

        if (!user || !order) return res.json({ success: false, msg: 'خطأ في العثور على الطلب أو المستخدم' });
        if (order.isRevealed) return res.json({ success: true, newBalance: user.balance });

        const freeMode = await getSetting('freeMode', false);
        if (freeMode) {
            order.isRevealed = true;
            await order.save();
            return res.json({ success: true, newBalance: user.balance });
        }

        const revealPrice = await getSetting('orderRevealPrice', 50);
        const commissionAmount = order.commissionAmount || 0;
        const totalDeduct = revealPrice + commissionAmount;

        if (user.balance < totalDeduct) {
            return res.json({ success: false, msg: `رصيد غير كافٍ. المطلوب: ${totalDeduct}` });
        }

        // 1. Deduct from Seller's balance
        const newBalance = await deductBalance(userId, totalDeduct, `كشف طلب وعمولة: ${order.listingTitle}`);
        if (newBalance === false) {
            return res.json({ success: false, msg: 'حدث خطأ أثناء خصم الرصيد' });
        }

        // 2. Add to Affiliate's balance
        if (commissionAmount > 0 && order.affiliateId) {
            const affiliateUser = await User.findById(order.affiliateId);
            if (affiliateUser) {
                affiliateUser.balance += commissionAmount;
                await affiliateUser.save();
                await Trans.create({
                    userId: order.affiliateId,
                    userName: affiliateUser.name,
                    type: 'commission',
                    amount: commissionAmount,
                    description: `عمولة من بيع: ${order.listingTitle}`,
                    status: 'completed'
                });
                await createNotification(order.affiliateId, 'deposit', 'أرباح جديدة! 💰', `لقد ربحت ${commissionAmount} كعمولة من بيع المنتج "${order.listingTitle}"`);
            }
        }

        order.isRevealed = true;
        await order.save();

        res.json({ success: true, newBalance });
    } catch (e) {
        console.error('Reveal Error:', e);
        res.json({ success: false, msg: 'حدث خطأ غير متوقع' });
    }
});
// ============ CHAT API (UPDATED FOR TEASER SYSTEM) ============
// التحقق من وجود محادثة
app.post('/api/chat/check', async (req, res) => {
    try {
        const { listingId, fingerprint } = req.body;
        const chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });
        if (chat) return res.json({ success: true, chatId: chat._id, isPaid: chat.isPaid, exists: true });
        return res.json({ success: true, exists: false });
    } catch(e) { res.json({ success: false }); }
});

// طلب محادثة (إنشاء محادثة جديدة)
app.post('/api/chat/request', async (req, res) => {
    try {
        const { listingId, fingerprint, buyerName } = req.body;
        const listing = await Listing.findById(listingId);
        
        // البحث عن محادثة سابقة
        let chat = await Chat.findOne({ listingId, buyerFingerprint: fingerprint });
        if (chat) return res.json({ success: true, chatId: chat._id, isPaid: chat.isPaid });

        // إنشاء محادثة جديدة (غير مدفوعة)
        chat = await Chat.create({
            listingId, 
            listingTitle: listing.title, 
            sellerId: listing.userId, 
            sellerName: listing.userName,
            buyerName: buyerName || 'مشتري', 
            buyerFingerprint: fingerprint, 
            isPaid: false
        });

        // إشعار للبائع بطلب جديد
        await createNotification(listing.userId, 'chat_request', 'طلب محادثة جديد! 💬', `${buyerName || 'مشتري'} يريد التواصل معك حول "${listing.title}"`, chat._id);
        
        res.json({ success: true, chatId: chat._id, isPaid: false });
    } catch (e) { res.json({ success: false }); }
});

// قبول المحادثة (الدفع)
app.post('/api/chat/accept', async (req, res) => {
    try {
        const { chatId, sellerId } = req.body;
        const chat = await Chat.findById(chatId);
        
        if (!chat || chat.sellerId !== sellerId) return res.json({ success: false });
        if (chat.isPaid) return res.json({ success: true }); // مدفوعة مسبقاً

        // خصم الرصيد
        const freeMode = await getSetting('freeMode', false);
        if (!freeMode) {
            const chatPrice = await getSetting('chatPrice', 50);
            const newBalance = await deductBalance(sellerId, chatPrice, `فتح محادثة: ${chat.listingTitle}`);
            if (newBalance === false) return res.json({ success: false, msg: 'رصيد غير كافٍ' });
        }
        
        chat.isPaid = true; 
        await chat.save();

        // إشعار للمشتري أن البائع قبل
        await createNotification(chat.buyerId, 'message', 'وافق البائع! ✅', `يمكنك الآن الدردشة بحرية مع ${chat.sellerName}`, chatId);
        
        // رسالة نظام داخل الشات
        await Message.create({ chatId, senderId: 'system', content: '✅ قام البائع بقبول المحادثة.', fromBuyer: false });

        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// جلب المحادثات المعلقة للبائع
app.get('/api/chat/pending/:sellerId', async (req, res) => {
    try {
        const chats = await Chat.find({ sellerId: req.params.sellerId, isPaid: false }).sort({ createdAt: -1 });
        res.json(chats);
    } catch (e) { res.json([]); }
});

// جلب بيانات محادثة واحدة
app.get('/api/chat/:chatId', async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    res.json(chat || {});
});

// جلب قائمة المحادثات (للمشتري والبائع) - فقط المدفوعة تظهر في القائمة الرئيسية
app.get('/api/chats/:userId', async (req, res) => {
    const userId = req.params.userId;
    // نظهر المحادثات المدفوعة + المحادثات التي أنا فيها كمشتري (حتى لو لم تُدفع بعد لكي أرى رسائلي)
    const chats = await Chat.find({ 
        $or: [
            { sellerId: userId, isPaid: true }, // البائع يرى فقط المدفوعة هنا
            { buyerId: userId } // المشتري يرى كل محادثاته
        ]
    }).sort({ lastMessageDate: -1 });
    
    res.json(chats.map(c => ({ ...c.toObject(), unreadCount: c.sellerId === userId ? c.sellerUnread : c.buyerUnread })));
});

// جلب الرسائل
app.get('/api/chat/messages/:chatId', async (req, res) => {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ date: 1 });
    res.json(messages);
});

// إرسال رسالة (التعديل الجوهري هنا)
app.post('/api/chat/send', async (req, res) => {
    try {
        const { chatId, senderId, content, fromBuyer } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) return res.json({ success: false });

        // === منطق الحظر ===
        // إذا كان المرسل هو البائع (ليس مشتري) والمحادثة غير مدفوعة -> نمنعه
        if (!fromBuyer && !chat.isPaid) {
            return res.json({ success: false, msg: 'يجب قبول المحادثة أولاً' });
        }

        // حفظ الرسالة
        await Message.create({ chatId, senderId, content, fromBuyer: fromBuyer !== false });
        
        chat.lastMessage = content; 
        chat.lastMessageDate = new Date();
        
        if (fromBuyer !== false) {
            // رسالة من المشتري
            chat.sellerUnread = (chat.sellerUnread || 0) + 1;
            
            // إشعار للبائع (ليتحمس ويفتح الرسالة)
            await createNotification(chat.sellerId, 'chat_request', 'رسالة من مشتري 💬', content.substring(0, 50), chatId);

            // === الرد الآلي (BOT) ===
            // إذا كانت الدردشة غير مدفوعة، نرسل رد آلي للمشتري
            if (!chat.isPaid) {
                // نتحقق لكي لا نكرر الرد الآلي كثيراً (مثلاً مرة واحدة)
                const botMsgs = await Message.countDocuments({ chatId, senderId: 'system' });
                if (botMsgs === 0) {
                    const botText = "مرحباً! 👋\nوصلت رسالتك للبائع. سيقوم بالرد عليك قريباً.";
                    await Message.create({ chatId, senderId: 'system', content: botText, fromBuyer: false });
                }
            }

        } else {
            // رسالة من البائع
            chat.buyerUnread = (chat.buyerUnread || 0) + 1;
            if (chat.buyerId) {
                await createNotification(chat.buyerId, 'message', 'رد جديد 💬', content.substring(0, 50), chatId);
            }
        }

        await chat.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// قراءة الرسائل
app.post('/api/chat/read', async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        const chat = await Chat.findById(chatId);
        if (chat) {
            if (chat.sellerId === userId) chat.sellerUnread = 0; else chat.buyerUnread = 0;
            await chat.save();
            await Message.updateMany({ chatId, isRead: false }, { isRead: true });
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// حذف محادثة
app.post('/api/chat/delete', async (req, res) => {
    try {
        const { id, userId } = req.body;
        const chat = await Chat.findOne({ _id: id, $or: [{ sellerId: userId }, { buyerId: userId }] });
        if (chat) {
            await Chat.findByIdAndDelete(id);
            await Message.deleteMany({ chatId: id });
            res.json({ success: true });
        } else { res.json({ success: false }); }
    } catch (e) { res.json({ success: false }); }
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
// إضافة طلب سحب جديد
app.post('/api/wallet/withdraw', async (req, res) => {
    try {
        // نستقبل البيانات بأسماء واضحة
        const { userId, amount, method, accountDetails } = req.body;
        
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, msg: 'المستخدم غير موجود' });
        
        if (!amount || amount <= 0) return res.json({ success: false, msg: 'مبلغ غير صالح' });
        
        if (user.balance < amount) {
            return res.json({ success: false, msg: 'رصيدك غير كافٍ للسحب' });
        }

        // خصم الرصيد
        user.balance -= amount;
        await user.save();

        // === هنا الحل للمشكلة ===
        // نقوم بصياغة وصف واضح جداً ليظهر للأدمن
        const fullDescription = `طلب سحب - الطريقة: ${method} - الحساب: ${accountDetails}`;

        await Trans.create({
            userId,
            userName: user.name,
            type: 'withdraw',
            amount,
            // نضع رقم الحساب في حقل proof أيضاً لأن الأدمن قد ينظر إليه
            proof: accountDetails, 
            paymentMethod: method,
            description: fullDescription, // هذا ما سيقرأه الأدمن
            status: 'pending'
        });

        // إشعار للمستخدم
        await createNotification(userId, 'withdraw', 'تم استلام طلب السحب ⏳', `طلبك لسحب ${amount} دج قيد المراجعة.`);

        res.json({ success: true, newBalance: user.balance });
    } catch (e) {
        console.error(e);
        res.json({ success: false, msg: 'حدث خطأ في السيرفر' });
    }
});
// ============ ADMIN API ============

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

app.get('/api/admin/chats', async (req, res) => {
    const chats = await Chat.find({ isPaid: true }).sort({ createdAt: -1 });
    res.json(chats);
});
app.get('/api/admin/deposits', async (req, res) => {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 1000;
    
    // التعديل هنا: السماح بجلب 'deposit' و 'withdraw'
    let query = {};
    if (status && status !== 'all') {
        query.status = status;
        query.type = { $in: ['deposit', 'withdraw'] };
    } else {
        query.type = { $in: ['deposit', 'withdraw'] };
    }
    
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

        const user = await User.findById(trans.userId);
        if (!user) return res.json({ success: false, msg: 'المستخدم غير موجود' });

        if (trans.type === 'deposit') {
            // === حالة الشحن (إيداع) ===
            if (action === 'approve') {
                user.balance += trans.amount;
                await user.save();
                trans.status = 'approved';
                await createNotification(trans.userId, 'deposit', 'تم شحن رصيدك! 💰', `تم إضافة ${trans.amount} لرصيدك`);
            } else {
                trans.status = 'rejected';
                await createNotification(trans.userId, 'deposit', 'تم رفض طلب الشحن', 'يرجى التواصل مع الدعم');
            }
        } else if (trans.type === 'withdraw') {
            // === حالة السحب ===
            if (action === 'approve') {
                // الرصيد خُصم مسبقاً عند الطلب، لذا فقط نغير الحالة
                trans.status = 'approved';
                await createNotification(trans.userId, 'withdraw', 'تم تنفيذ السحب ✅', `تم إرسال ${trans.amount} دج إلى حسابك.`);
            } else {
                // في حالة الرفض، يجب إعادة الرصيد للمستخدم
                user.balance += trans.amount;
                await user.save();
                trans.status = 'rejected';
                await createNotification(trans.userId, 'withdraw', 'تم رفض طلب السحب ❌', 'تم إعادة المبلغ إلى محفظتك.');
            }
        }

        await trans.save();
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.json({ success: false });
    }
});
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

app.post('/api/admin/orders/clear-old', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Order.deleteMany({ date: { $lt: thirtyDaysAgo } });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (e) {
        res.json({ success: false });
    }
});
// ============ REVIEWS SCHEMA ============
const ReviewSchema = new mongoose.Schema({
    listingId: { type: String, required: true },
    userName: String,
    rating: { type: Number, required: true }, // 1 to 5
    comment: String,
    images: [{ type: String }], // روابط الصور
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

// ============ REVIEWS API ============

// إضافة مراجعة جديدة
app.post('/api/review/add', async (req, res) => {
    try {
        const { listingId, userName, rating, comment, images } = req.body;
        
        // 1. حفظ المراجعة
        await Review.create({
            listingId,
            userName: userName || 'مشتري',
            rating: Number(rating),
            comment,
            images
        });

        // 2. تحديث تقييم المنتج الكلي
        const reviews = await Review.find({ listingId });
        const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);

        await Listing.findByIdAndUpdate(listingId, {
            rating: Number(avgRating),
            reviews: reviews.length
        });

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.json({ success: false, msg: 'حدث خطأ أثناء إضافة المراجعة' });
    }
});

// جلب مراجعات منتج معين
app.get('/api/public/reviews/:listingId', async (req, res) => {
    try {
        const reviews = await Review.find({ listingId: req.params.listingId }).sort({ date: -1 });
        res.json(reviews);
    } catch (e) {
        res.json([]);
    }
});
// ============ DELETE APIs (New) ============

// 1. حذف إشعار
app.post('/api/notification/delete', async (req, res) => {
    try {
        const { id, userId } = req.body;
        // نحذف الإشعار بشرط أن يكون خاصاً بالمستخدم نفسه (للأمان)
        await Notification.findOneAndDelete({ _id: id, userId });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// 2. حذف معاملة (سجل مالي)
app.post('/api/transaction/delete', async (req, res) => {
    try {
        const { id, userId } = req.body;
        // حذف المعاملة من السجل
        await Trans.findOneAndDelete({ _id: id, userId });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// 3. حذف محادثة
app.post('/api/chat/delete', async (req, res) => {
    try {
        const { id, userId } = req.body;
        // التحقق أن المستخدم طرف في المحادثة
        const chat = await Chat.findOne({ 
            _id: id, 
            $or: [{ sellerId: userId }, { buyerId: userId }] 
        });

        if (chat) {
            // حذف المحادثة
            await Chat.findByIdAndDelete(id);
            // حذف الرسائل التابعة لها لتنظيف القاعدة
            await Message.deleteMany({ chatId: id });
            res.json({ success: true });
        } else {
            res.json({ success: false, msg: 'غير مصرح' });
        }
    } catch (e) {
        res.json({ success: false });
    }
});
// 4. حذف إعلان (للمستخدم صاحب الإعلان حصراً)
app.post('/api/user/listing/delete', async (req, res) => {
    try {
        const { id, userId } = req.body;
        // نتحقق أولاً أن الإعلان يملكه هذا المستخدم
        const listing = await Listing.findOne({ _id: id, userId: userId });
        
        if (listing) {
            await Listing.findByIdAndDelete(id);
            // اختياري: حذف الطلبات والمحادثات المرتبطة به لتنظيف القاعدة
            // await Order.deleteMany({ listingId: id });
            // await Chat.deleteMany({ listingId: id });
            res.json({ success: true });
        } else {
            res.json({ success: false, msg: 'غير مصرح لك بحذف هذا الإعلان' });
        }
    } catch (e) {
        res.json({ success: false });
    }
});
// 5. حذف طلب (للبائع حصراً)
app.post('/api/user/order/delete', async (req, res) => {
    try {
        const { id, userId } = req.body; // userId هنا هو البائع (Seller)
        // نتحقق أن الطلب تابع لهذا البائع
        const order = await Order.findOne({ _id: id, sellerId: userId });
        
        if (order) {
            await Order.findByIdAndDelete(id);
            res.json({ success: true });
        } else {
            res.json({ success: false, msg: 'غير مصرح' });
        }
    } catch (e) {
        res.json({ success: false });
    }
});
// شراء خدمة الترويج (Boost)
app.post('/api/user/listing/boost', async (req, res) => {
    try {
        const { listingId, userId, days } = req.body;
        const user = await User.findById(userId);
        
        // جلب سعر اليوم من الإعدادات (افتراضياً 200)
        const boostPrice = await getSetting('boostPricePerDay', 200);
        const totalCost = boostPrice * days;

        if (user.balance < totalCost) {
            return res.json({ success: false, msg: 'رصيدك غير كافٍ للعملية' });
        }

        // 1. خصم الرصيد وتوثيق العملية
        user.balance -= totalCost;
        await user.save();
        
        await Trans.create({
            userId, userName: user.name, type: 'deduct', amount: totalCost,
            description: `ترويج إعلان لمدة ${days} أيام 🚀`, status: 'completed'
        });

        // 2. تحديث تاريخ انتهاء الترويج للمنتج
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        await Listing.findByIdAndUpdate(listingId, { boostExpiry: expiryDate });

        res.json({ success: true, newBalance: user.balance });
    } catch (e) {
        res.json({ success: false, msg: 'حدث خطأ في السيرفر' });
    }
});
// ============ START SERVER ============
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

