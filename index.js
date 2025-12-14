const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ DB Connected'))
        .catch(err => console.error('❌ DB Error:', err));
}

// 1. المستخدمين (تم إضافة الديون والبصمة والحظر)
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String, // merchant, affiliate, admin
    balance: { type: Number, default: 0 }, // للمسوق
    debt: { type: Number, default: 0 }, // للتاجر (كم يدين للمنصة)
    debtDeadline: Date, // موعد الحظر إذا لم يدفع
    isBanned: { type: Boolean, default: false },
    fingerprint: String, // بصمة الجهاز لمنع التلاعب
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. المنتجات
const ProductSchema = new mongoose.Schema({
    merchantId: String,
    title: String,
    price: Number,
    commission: Number,
    image: String,
    category: { type: String, default: 'عام' },
    stock: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. الطلبات
const OrderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    merchantId: String,
    affiliateId: String,
    commission: Number,
    customerName: String,
    customerPhone: String,
    customerWilaya: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 4. السحوبات
const WithdrawalSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    ccp: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html'))); // لوحة التحكم الخاصة بك

// --- API ---

// تسجيل الدخول (مع التحقق من الحظر)
app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });

        // التحقق من الحظر
        if (user.isBanned) return res.json({ success: false, msg: 'تم حظر حسابك بسبب عدم دفع الديون!' });

        // التحقق من مهلة الدفع (إذا انتهت الـ 48 ساعة والمديونية > 1000)
        if (user.role === 'merchant' && user.debt >= 1000 && user.debtDeadline && new Date() > new Date(user.debtDeadline)) {
            user.isBanned = true;
            await user.save();
            return res.json({ success: false, msg: 'تم حظر حسابك لتجاوز مهلة الدفع!' });
        }

        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false }); }
});

// التسجيل (مع كشف البصمة)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fingerprint, email } = req.body;
        
        // 1. هل هذا الجهاز محظور سابقاً؟
        const bannedUser = await User.findOne({ fingerprint, isBanned: true });
        if (bannedUser) return res.json({ success: false, msg: 'جهازك محظور من المنصة بسبب مخالفات سابقة!' });

        // 2. هل البريد موجود؟
        const exists = await User.findOne({ email });
        if (exists) return res.json({ success: false, msg: 'البريد مستخدم' });
        
        const user = await User.create(req.body);
        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false }); }
});

// تحديث الجلسة
app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    if(user && !user.isBanned) res.json({ success: true, user });
    else res.json({ success: false });
});

// --- وظائف التاجر ---
app.post('/api/merchant/product', async (req, res) => {
    await Product.create(req.body);
    res.json({ success: true });
});

app.post('/api/merchant/my-products', async (req, res) => {
    const products = await Product.find({ merchantId: req.body.merchantId }).sort({ createdAt: -1 });
    res.json(products);
});

app.post('/api/merchant/orders', async (req, res) => {
    const orders = await Order.find({ merchantId: req.body.merchantId }).sort({ date: -1 });
    res.json(orders);
});

// تغيير الحالة وحساب الديون (القلب المالي)
app.post('/api/order/status', async (req, res) => {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    const merchant = await User.findById(order.merchantId);
    
    // إذا تم التوصيل:
    if (status === 'delivered' && order.status !== 'delivered') {
        // 1. إضافة العمولة للمسوق (إن وجد)
        if (order.affiliateId !== 'direct') {
            const affiliate = await User.findById(order.affiliateId);
            if (affiliate) {
                affiliate.balance += order.commission;
                await affiliate.save();
            }
        }

        // 2. تسجيل الدين على التاجر
        if(merchant) {
            merchant.debt += order.commission;
            
            // إذا تجاوز 1000 دج ولم يكن هناك مهلة، نضع مهلة 48 ساعة
            if (merchant.debt >= 1000 && !merchant.debtDeadline) {
                const deadline = new Date();
                deadline.setHours(deadline.getHours() + 48); // +48 ساعة
                merchant.debtDeadline = deadline;
            }
            await merchant.save();
        }
    }
    
    order.status = status;
    await order.save();
    res.json({ success: true });
});

// --- وظائف المسوق ---
app.get('/api/market/products', async (req, res) => {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
    res.json(products);
});

app.post('/api/wallet/withdraw', async (req, res) => {
    const { userId, amount, ccp } = req.body;
    const user = await User.findById(userId);
    if(user.balance >= amount) {
        user.balance -= amount;
        await user.save();
        await Withdrawal.create({ userId, amount, ccp });
        res.json({ success: true });
    } else { res.json({ success: false }); }
});

// --- وظائف الأدمن العام (أنت) ---
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find().sort({ debt: -1 }); // الترتيب حسب الديون
    res.json(users);
});

app.post('/api/admin/clear-debt', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    user.debt = 0;
    user.debtDeadline = null;
    user.isBanned = false; // فك الحظر إذا دفع
    await user.save();
    res.json({ success: true });
});

app.post('/api/admin/ban', async (req, res) => {
    const { userId, status } = req.body;
    await User.findByIdAndUpdate(userId, { isBanned: status });
    res.json({ success: true });
});

// --- الطلبات العامة ---
app.post('/api/order', async (req, res) => {
    const { productId, affiliateId, name, phone, wilaya } = req.body;
    const product = await Product.findById(productId);
    await Order.create({
        productId: product._id,
        productName: product.title,
        merchantId: product.merchantId,
        affiliateId: affiliateId || 'direct',
        commission: product.commission,
        customerName: name, customerPhone: phone, customerWilaya: wilaya
    });
    product.sales += 1; await product.save();
    res.json({ success: true });
});

app.get('/api/product/:id', async (req, res) => {
    const p = await Product.findById(req.params.id);
    res.json(p);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 DzAffiliate Pro Running on ${port}`));
