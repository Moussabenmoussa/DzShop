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
        .then(() => console.log('✅ MongoDB Connected Successfully'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// ============ SETTINGS ============
const LEAD_PRICE = 50; // سعر كشف الرقم

// ============ MODELS ============

// User Model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0, min: 0 },
    phone: { type: String, trim: true },
    fingerprint: String,
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Listing Model
const ListingSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['product', 'service'], default: 'product' },
    title: { type: String, required: true, trim: true },
    desc: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true },
    category: { type: String, default: 'other' },
    active: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
ListingSchema.index({ active: 1, date: -1 });
const Listing = mongoose.model('Listing', ListingSchema);

// Lead Model
const LeadSchema = new mongoose.Schema({
    listingId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true },
    buyerWilaya: { type: String, required: true, trim: true },
    buyerFingerprint: String,
    isRevealed: { type: Boolean, default: false },
    revealedAt: Date,
    date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

// Transaction Model (Deposits)
const TransSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    userName: String,
    amount: { type: Number, required: true, min: 0 },
    proof: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    processedBy: String,
    processedAt: Date,
    date: { type: Date, default: Date.now }
});
const Trans = mongoose.model('Trans', TransSchema);

// ============ HELPER FUNCTIONS ============

// Error response helper
const errorResponse = (res, message, status = 400) => {
    return res.status(status).json({ success: false, msg: message });
};

// Success response helper
const successResponse = (res, data = {}) => {
    return res.json({ success: true, ...data });
};

// ============ ROUTES - PAGES ============

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dashboard.html'));
});

app.get('/p/:id', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'product.html'));
});

app.get('/super-admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// ============ ROUTES - AUTH API ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, fingerprint } = req.body;

        // Validation
        if (!name || !email || !password) {
            return errorResponse(res, 'جميع الحقول مطلوبة');
        }

        // Check existing email
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return errorResponse(res, 'البريد الإلكتروني مستخدم مسبقاً');
        }

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password, // Note: In production, hash the password!
            phone: phone?.trim(),
            fingerprint
        });

        successResponse(res, { user });

    } catch (e) {
        console.error('Register Error:', e);
        errorResponse(res, 'حدث خطأ في التسجيل', 500);
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'البريد وكلمة المرور مطلوبان');
        }

        const user = await User.findOne({ 
            email: email.toLowerCase(), 
            password 
        });

        if (!user) {
            return errorResponse(res, 'البريد أو كلمة المرور غير صحيحة');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        successResponse(res, { user });

    } catch (e) {
        console.error('Login Error:', e);
        errorResponse(res, 'حدث خطأ في تسجيل الدخول', 500);
    }
});

// Refresh user data
app.post('/api/user/refresh', async (req, res) => {
    try {
        const user = await User.findById(req.body.id);
        if (user) {
            successResponse(res, { user });
        } else {
            errorResponse(res, 'المستخدم غير موجود');
        }
    } catch (e) {
        errorResponse(res, 'خطأ في تحديث البيانات', 500);
    }
});

// ============ ROUTES - LISTINGS API ============

// Create listing
app.post('/api/listing/create', async (req, res) => {
    try {
        const { userId, userName, type, title, desc, price, image, category } = req.body;

        if (!userId || !title || !price) {
            return errorResponse(res, 'البيانات غير مكتملة');
        }

        await Listing.create({
            userId,
            userName,
            type: type || 'product',
            title: title.trim(),
            desc: desc?.trim(),
            price: Number(price),
            image: image?.trim(),
            category: category || 'other'
        });

        successResponse(res);

    } catch (e) {
        console.error('Create Listing Error:', e);
        errorResponse(res, 'خطأ في نشر الإعلان', 500);
    }
});

// Get all active listings (market)
app.get('/api/market', async (req, res) => {
    try {
        const listings = await Listing.find({ active: true })
            .sort({ date: -1 })
            .limit(100)
            .lean();
        res.json(listings);
    } catch (e) {
        console.error('Market Error:', e);
        res.json([]);
    }
});

// Get user's listings
app.post('/api/user/listings', async (req, res) => {
    try {
        const listings = await Listing.find({ userId: req.body.userId })
            .sort({ date: -1 })
            .lean();
        res.json(listings);
    } catch (e) {
        res.json([]);
    }
});

// Get single product (public)
app.get('/api/public/product/:id', async (req, res) => {
    try {
        const product = await Listing.findById(req.params.id).lean();
        
        if (product) {
            // Increment views
            await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        }
        
        res.json(product || {});
    } catch (e) {
        res.json({});
    }
});

// Delete listing
app.post('/api/listing/delete', async (req, res) => {
    try {
        const { userId, listingId } = req.body;
        
        const listing = await Listing.findById(listingId);
        if (!listing) {
            return errorResponse(res, 'الإعلان غير موجود');
        }
        
        if (listing.userId !== userId) {
            return errorResponse(res, 'غير مصرح لك بحذف هذا الإعلان');
        }
        
        await Listing.findByIdAndDelete(listingId);
        successResponse(res);
        
    } catch (e) {
        errorResponse(res, 'خطأ في حذف الإعلان', 500);
    }
});

// ============ ROUTES - LEADS API ============

// Create lead (buyer interest)
app.post('/api/lead/create', async (req, res) => {
    try {
        const { listingId, buyerName, buyerPhone, buyerWilaya, fingerprint } = req.body;

        if (!listingId || !buyerName || !buyerPhone || !buyerWilaya) {
            return errorResponse(res, 'جميع الحقول مطلوبة');
        }

        const listing = await Listing.findById(listingId);
        if (!listing) {
            return errorResponse(res, 'الإعلان غير موجود');
        }

        // Prevent seller from ordering their own product
        const seller = await User.findById(listing.userId);
        if (seller && seller.fingerprint === fingerprint) {
            return errorResponse(res, 'لا يمكنك الطلب من إعلانك الخاص!');
        }

        // Check for duplicate lead
        const existingLead = await Lead.findOne({ 
            listingId, 
            buyerFingerprint: fingerprint 
        });
        
        if (existingLead) {
            return errorResponse(res, 'لقد أرسلت طلباً لهذا الإعلان مسبقاً');
        }

        await Lead.create({
            listingId,
            sellerId: listing.userId,
            buyerName: buyerName.trim(),
            buyerPhone: buyerPhone.trim(),
            buyerWilaya: buyerWilaya.trim(),
            buyerFingerprint: fingerprint
        });

        successResponse(res);

    } catch (e) {
        console.error('Create Lead Error:', e);
        errorResponse(res, 'خطأ في إرسال الطلب', 500);
    }
});

// Get seller's leads
app.post('/api/seller/leads', async (req, res) => {
    try {
        const leads = await Lead.find({ sellerId: req.body.userId })
            .sort({ date: -1 })
            .lean();

        // Protect unrevealed phone numbers
        const protectedLeads = leads.map(lead => ({
            ...lead,
            buyerPhone: lead.isRevealed 
                ? lead.buyerPhone 
                : lead.buyerPhone.substring(0, 4) + '******'
        }));

        res.json(protectedLeads);

    } catch (e) {
        res.json([]);
    }
});

// Reveal lead phone number
app.post('/api/lead/reveal', async (req, res) => {
    try {
        const { userId, leadId } = req.body;

        const user = await User.findById(userId);
        const lead = await Lead.findById(leadId);

        if (!user || !lead) {
            return errorResponse(res, 'بيانات غير صحيحة');
        }

        // Already revealed
        if (lead.isRevealed) {
            return successResponse(res, { 
                phone: lead.buyerPhone, 
                newBalance: user.balance 
            });
        }

        // Check balance
        if (user.balance < LEAD_PRICE) {
            return errorResponse(res, `رصيدك غير كافٍ. تحتاج ${LEAD_PRICE} دج على الأقل`);
        }

        // Deduct balance and reveal
        user.balance -= LEAD_PRICE;
        lead.isRevealed = true;
        lead.revealedAt = new Date();

        await user.save();
        await lead.save();

        successResponse(res, { 
            phone: lead.buyerPhone, 
            newBalance: user.balance 
        });

    } catch (e) {
        console.error('Reveal Lead Error:', e);
        errorResponse(res, 'خطأ في كشف الرقم', 500);
    }
});

// ============ ROUTES - WALLET API ============

// Request deposit
app.post('/api/wallet/deposit', async (req, res) => {
    try {
        const { userId, amount, proof } = req.body;

        if (!userId || !amount || !proof) {
            return errorResponse(res, 'جميع الحقول مطلوبة');
        }

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, 'المستخدم غير موجود');
        }

        await Trans.create({
            userId,
            userName: user.name,
            amount: Number(amount),
            proof: proof.trim()
        });

        successResponse(res);

    } catch (e) {
        console.error('Deposit Request Error:', e);
        errorResponse(res, 'خطأ في إرسال طلب الشحن', 500);
    }
});

// ============ ROUTES - ADMIN API ============

// Get pending deposits
app.get('/api/admin/deposits', async (req, res) => {
    try {
        const deposits = await Trans.find({ status: 'pending' })
            .sort({ date: -1 })
            .lean();
        res.json(deposits);
    } catch (e) {
        res.json([]);
    }
});

// Process deposit (approve/reject)
app.post('/api/admin/approve-deposit', async (req, res) => {
    try {
        const { transId, action } = req.body;

        const trans = await Trans.findById(transId);
        if (!trans) {
            return errorResponse(res, 'الطلب غير موجود');
        }

        if (trans.status !== 'pending') {
            return errorResponse(res, 'تمت معالجة هذا الطلب مسبقاً');
        }

        if (action === 'approve') {
            const user = await User.findById(trans.userId);
            if (user) {
                user.balance += trans.amount;
                await user.save();
            }
            trans.status = 'approved';
        } else {
            trans.status = 'rejected';
        }

        trans.processedAt = new Date();
        await trans.save();

        successResponse(res);

    } catch (e) {
        console.error('Process Deposit Error:', e);
        errorResponse(res, 'خطأ في معالجة الطلب', 500);
    }
});

// Get admin statistics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [users, leads, listings, pendingDeposits] = await Promise.all([
            User.countDocuments(),
            Lead.countDocuments(),
            Listing.countDocuments(),
            Trans.countDocuments({ status: 'pending' })
        ]);

        res.json({ users, leads, listings, pendingDeposits });

    } catch (e) {
        res.json({ users: 0, leads: 0, listings: 0, pendingDeposits: 0 });
    }
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ success: false, msg: 'خطأ في الخادم' });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, msg: 'الصفحة غير موجودة' });
});

// ============ START SERVER ============

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 DzMarket Server Running on port ${port}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

