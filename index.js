const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- الإعدادات الثابتة ---
const LEAD_PRICE = 50; // سعر كشف الرقم (50 دج)
const USDT_RATE = 245; // سعر الصرف

// --- الموديلات ---

// 1. المستخدم (بائع ومشتري في نفس الوقت)
const UserSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    balance: { type: Number, default: 0 }, // الرصيد لكشف الأرقام
    fingerprint: String,
    phone: String,
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. العروض (منتجات أو خدمات)
const ListingSchema = new mongoose.Schema({
    userId: String, // صاحب العرض
    userName: String,
    type: String, // 'product' (مادي) أو 'service' (رقمي)
    title: String, desc: String, price: Number, image: String,
    active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

// 3. الطلبات (Leads) - هنا يتم إخفاء الرقم
const LeadSchema = new mongoose.Schema({
    listingId: String,
    sellerId: String, // من سيدفع لكشف الرقم
    buyerName: String,
    buyerPhone: String, // هذا هو الكنز
    buyerWilaya: String,
    buyerFingerprint: String,
    isRevealed: { type: Boolean, default: false }, // هل دفع البائع لكشفه؟
    date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

// 4. السحوبات والإيداعات (Transactions)
const TransSchema = new mongoose.Schema({
    userId: String, type: String, // 'deposit' (شحن)
    amount: Number, proof: String, // صورة الوصل
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

// --- API ---

// المصادقة
app.post('/api/auth/register', async (req, res) => {
    try {
        const exists = await User.findOne({ email: req.body.email });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });
        const user = await User.create(req.body);
        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (user) res.json({ success: true, user });
    else res.json({ success: false, msg: 'بيانات خاطئة' });
});

app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    res.json(user ? { success: true, user } : { success: false });
});

// --- السوق والعروض ---
app.post('/api/listing/create', async (req, res) => {
    await Listing.create(req.body);
    res.json({ success: true });
});

app.get('/api/market', async (req, res) => {
    const list = await Listing.find({ active: true }).sort({ date: -1 });
    res.json(list);
});

app.post('/api/user/listings', async (req, res) => {
    const list = await Listing.find({ userId: req.body.userId }).sort({ date: -1 });
    res.json(list);
});

// --- نظام الطلبات وكشف الأرقام (Core Business) ---

// 1. الزبون يطلب (مجاني للزبون)
app.post('/api/lead/create', async (req, res) => {
    const { listingId, buyerName, buyerPhone, buyerWilaya, fingerprint } = req.body;
    
    // جلب تفاصيل العرض لمعرفة البائع
    const listing = await Listing.findById(listingId);
    if (!listing) return res.json({ success: false, msg: 'العرض غير موجود' });

    // منع الغش: هل البائع يطلب من نفسه؟
    const seller = await User.findById(listing.userId);
    if (seller.fingerprint === fingerprint) return res.json({ success: false, msg: 'لا يمكنك الطلب من نفسك!' });

    // هل طلب هذا الشخص نفس المنتج من قبل؟
    const exists = await Lead.findOne({ listingId, buyerFingerprint: fingerprint });
    if (exists) return res.json({ success: false, msg: 'لقد طلبت هذا العرض مسبقاً' });

    await Lead.create({
        listingId, sellerId: listing.userId,
        buyerName, buyerPhone, buyerWilaya, buyerFingerprint: fingerprint
    });

    res.json({ success: true });
});

// 2. البائع يرى طلباته (مخفية)
app.post('/api/seller/leads', async (req, res) => {
    const leads = await Lead.find({ sellerId: req.body.userId }).sort({ date: -1 });
    // تشفير الرقم إذا لم يكن مكشوفاً
    const protectedLeads = leads.map(l => {
        let obj = l.toObject();
        if (!l.isRevealed) {
            obj.buyerPhone = l.buyerPhone.substring(0, 4) + '******'; // إخفاء الرقم
        }
        return obj;
    });
    res.json(protectedLeads);
});

// 3. البائع يدفع لكشف الرقم
app.post('/api/lead/reveal', async (req, res) => {
    const { userId, leadId } = req.body;
    const user = await User.findById(userId);
    const lead = await Lead.findById(leadId);

    if (lead.isRevealed) return res.json({ success: true, phone: lead.buyerPhone }); // مكشوف مسبقاً

    if (user.balance >= LEAD_PRICE) {
        user.balance -= LEAD_PRICE; // خصم الرصيد
        lead.isRevealed = true;
        await user.save();
        await lead.save();
        res.json({ success: true, phone: lead.buyerPhone, newBalance: user.balance });
    } else {
        res.json({ success: false, msg: 'رصيدك غير كافٍ! يرجى الشحن.' });
    }
});

// --- المحفظة والشحن ---
app.post('/api/wallet/deposit', async (req, res) => {
    // طلب شحن رصيد (يرسل صورة RedotPay)
    await Trans.create({ ...req.body, type: 'deposit' });
    res.json({ success: true });
});

// الحصول على منتج واحد (للصفحة الخارجية)
app.get('/api/public/product/:id', async (req, res) => {
    const p = await Listing.findById(req.params.id);
    res.json(p);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Marketplace Running on ${port}`));
