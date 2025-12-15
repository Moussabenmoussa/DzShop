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
    image: String,
    category: { type: String, default: 'other' },
    active: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
const Listing = mongoose.model('Listing', ListingSchema);

const LeadSchema = new mongoose.Schema({
    listingId: String,
    sellerId: String,
    sellerName: String,
    buyerName: String,
    buyerPhone: String,
    buyerWilaya: String,
    buyerFingerprint: String,
    isRevealed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

const TransSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    amount: Number,
    proof: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
});
const Settings = mongoose.model('Settings', SettingsSchema);

// ============ HELPER: GET SETTING ============
async function getSetting(key, defaultValue) {
    const s = await Settings.findOne({ key });
    return s ? s.value : defaultValue;
}

async function setSetting(key, value) {
    await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
}

// ============ PAGES ============
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

// ============ AUTH API ============
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, fingerprint } = req.body;
        if (!name || !email || !password) return res.json({ success: false, msg: 'جميع الحقول مطلوبة' });
        
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });
        
        const user = await User.create({ name, email: email.toLowerCase(), password, phone, fingerprint });
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

// ============ LEADS API ============
app.post('/api/lead/create', async (req, res) => {
    try {
        const { listingId, buyerName, buyerPhone, buyerWilaya, fingerprint } = req.body;
        const listing = await Listing.findById(listingId);
        if (!listing) return res.json({ success: false, msg: 'الإعلان غير موجود' });
        
        const seller = await User.findById(listing.userId);
        if (seller?.fingerprint === fingerprint) return res.json({ success: false, msg: 'لا يمكنك الطلب من نفسك' });
        
        const exists = await Lead.findOne({ listingId, buyerFingerprint: fingerprint });
        if (exists) return res.json({ success: false, msg: 'تم الطلب مسبقاً' });
        
        await Lead.create({ 
            listingId, 
            sellerId: listing.userId, 
            sellerName: listing.userName,
            buyerName, 
            buyerPhone, 
            buyerWilaya, 
            buyerFingerprint: fingerprint 
        });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/seller/leads', async (req, res) => {
    const leads = await Lead.find({ sellerId: req.body.userId }).sort({ date: -1 });
    res.json(leads.map(l => ({
        ...l.toObject(),
        buyerPhone: l.isRevealed ? l.buyerPhone : l.buyerPhone.substring(0, 4) + '******'
    })));
});

app.post('/api/lead/reveal', async (req, res) => {
    try {
        const { userId, leadId } = req.body;
        const user = await User.findById(userId);
        const lead = await Lead.findById(leadId);
        
        if (!user || !lead) return res.json({ success: false, msg: 'خطأ' });
        if (lead.isRevealed) return res.json({ success: true, phone: lead.buyerPhone, newBalance: user.balance });
        
        const leadPrice = await getSetting('leadPrice', 50);
        if (user.balance < leadPrice) return res.json({ success: false, msg: 'رصيد غير كافٍ' });
        
        user.balance -= leadPrice;
        lead.isRevealed = true;
        await user.save();
        await lead.save();
        
        res.json({ success: true, phone: lead.buyerPhone, newBalance: user.balance });
    } catch (e) {
        res.json({ success: false });
    }
});

// ============ WALLET API ============
app.post('/api/wallet/deposit', async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        await Trans.create({ ...req.body, userName: user?.name });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// ============ ADMIN API ============

// Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [users, listings, leads, pendingDeposits, revealedLeads] = await Promise.all([
            User.countDocuments(),
            Listing.countDocuments(),
            Lead.countDocuments(),
            Trans.countDocuments({ status: 'pending' }),
            Lead.countDocuments({ isRevealed: true })
        ]);
        res.json({ users, listings, leads, pendingDeposits, revealedLeads });
    } catch (e) {
        res.json({ users: 0, listings: 0, leads: 0, pendingDeposits: 0, revealedLeads: 0 });
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
        await Lead.deleteMany({ sellerId: id });
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

// Leads Management
app.get('/api/admin/leads', async (req, res) => {
    const leads = await Lead.find().sort({ date: -1 });
    res.json(leads);
});

app.post('/api/admin/lead/delete', async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/leads/clear-old', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Lead.deleteMany({ date: { $lt: thirtyDaysAgo } });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (e) {
        res.json({ success: false });
    }
});

// Deposits Management
app.get('/api/admin/deposits', async (req, res) => {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 1000;
    const query = status && status !== 'all' ? { status } : {};
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
        } else {
            trans.status = 'rejected';
        }
        
        await trans.save();
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
            case 'leads': data = await Lead.find().lean(); break;
            default: data = [];
        }
        res.json(data);
    } catch (e) {
        res.json([]);
    }
});

// ============ START SERVER ============
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

