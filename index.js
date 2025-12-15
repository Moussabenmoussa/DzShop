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

// --- الإعدادات ---
const LEAD_PRICE = 50; 

// --- الموديلات ---
const UserSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    balance: { type: Number, default: 0 },
    fingerprint: String, phone: String,
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ListingSchema = new mongoose.Schema({
    userId: String, userName: String, type: String,
    title: String, desc: String, price: Number, image: String,
    active: { type: Boolean, default: true },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

const LeadSchema = new mongoose.Schema({
    listingId: String, sellerId: String, buyerName: String, buyerPhone: String,
    buyerWilaya: String, buyerFingerprint: String, isRevealed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

// مودل التحويلات المالية (طلبات الشحن)
const TransSchema = new mongoose.Schema({
    userId: String, userName: String, amount: Number, proof: String, // صورة الوصل
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    date: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

// --- المسارات (Routes) ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

// ✅ هذا هو المسار الذي كان ناقصاً
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

// --- API ---

// Auth
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

// Listings
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
app.get('/api/public/product/:id', async (req, res) => {
    const p = await Listing.findById(req.params.id);
    res.json(p);
});

// Leads
app.post('/api/lead/create', async (req, res) => {
    const { listingId, buyerName, buyerPhone, buyerWilaya, fingerprint } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.json({ success: false });
    
    // منع البائع من الطلب من نفسه
    const seller = await User.findById(listing.userId);
    if(seller && seller.fingerprint === fingerprint) return res.json({ success: false, msg: 'لا تطلب من نفسك!' });

    const exists = await Lead.findOne({ listingId, buyerFingerprint: fingerprint });
    if (exists) return res.json({ success: false, msg: 'تم الطلب مسبقاً' });

    await Lead.create({ listingId, sellerId: listing.userId, buyerName, buyerPhone, buyerWilaya, buyerFingerprint: fingerprint });
    res.json({ success: true });
});

app.post('/api/seller/leads', async (req, res) => {
    const leads = await Lead.find({ sellerId: req.body.userId }).sort({ date: -1 });
    const protectedLeads = leads.map(l => {
        let obj = l.toObject();
        if (!l.isRevealed) obj.buyerPhone = l.buyerPhone.substring(0, 4) + '******';
        return obj;
    });
    res.json(protectedLeads);
});

app.post('/api/lead/reveal', async (req, res) => {
    const { userId, leadId } = req.body;
    const user = await User.findById(userId);
    const lead = await Lead.findById(leadId);

    if (lead.isRevealed) return res.json({ success: true, phone: lead.buyerPhone });

    if (user.balance >= LEAD_PRICE) {
        user.balance -= LEAD_PRICE;
        lead.isRevealed = true;
        await user.save();
        await lead.save();
        res.json({ success: true, phone: lead.buyerPhone, newBalance: user.balance });
    } else {
        res.json({ success: false, msg: 'رصيد غير كاف' });
    }
});

// Wallet
app.post('/api/wallet/deposit', async (req, res) => {
    const user = await User.findById(req.body.userId);
    await Trans.create({ ...req.body, userName: user.name, type: 'deposit' });
    res.json({ success: true });
});

// --- أدوات الأدمن (Admin APIs) ---
app.get('/api/admin/deposits', async (req, res) => {
    const trans = await Trans.find({ status: 'pending' }).sort({ date: -1 });
    res.json(trans);
});

app.post('/api/admin/approve-deposit', async (req, res) => {
    const { transId, action } = req.body; // action: 'approve' or 'reject'
    const trans = await Trans.findById(transId);
    
    if (trans.status === 'pending') {
        if (action === 'approve') {
            const user = await User.findById(trans.userId);
            user.balance += trans.amount;
            await user.save();
            trans.status = 'approved';
        } else {
            trans.status = 'rejected';
        }
        await trans.save();
    }
    res.json({ success: true });
});

app.get('/api/admin/stats', async (req, res) => {
    const users = await User.countDocuments();
    const leads = await Lead.countDocuments();
    const listings = await Listing.countDocuments();
    res.json({ users, leads, listings });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 System Ready on ${port}`));
