const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // زيادة الحجم لاستقبال الصور
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// 1. المستخدمين
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    balance: { type: Number, default: 0 }, // للمسوق (أرباح) وللتاجر (مبيعات)
    debt: { type: Number, default: 0 }, // ديون المنصة
    debtDeadline: Date,
    isBanned: { type: Boolean, default: false },
    fingerprint: String, // بصمة الجهاز
    messages: [{ from: String, text: String, image: String, date: { type: Date, default: Date.now } }] // شات
});
const User = mongoose.model('User', UserSchema);

// 2. المنتجات
const ProductSchema = new mongoose.Schema({
    merchantId: String,
    title: String,
    price: Number,
    commission: Number,
    image: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. الطلبات (مع البصمة لمنع الغش)
const OrderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    merchantId: String,
    affiliateId: String,
    commission: Number,
    price: Number, // سعر البيع
    customer: { name: String, phone: String, wilaya: String },
    customerFingerprint: String, // بصمة المشتري
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

// --- API ---

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
    if (user.isBanned) return res.json({ success: false, msg: 'حسابك محظور' });
    res.json({ success: true, user });
});

// التسجيل (حماية البصمة)
app.post('/api/auth/register', async (req, res) => {
    const { fingerprint, email } = req.body;
    const banned = await User.findOne({ fingerprint, isBanned: true });
    if (banned) return res.json({ success: false, msg: 'جهازك محظور نهائياً!' });
    
    try {
        const user = await User.create(req.body);
        res.json({ success: true, user });
    } catch(e) { res.json({ success: false, msg: 'البريد مستخدم' }); }
});

app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    res.json(user ? { success: true, user } : { success: false });
});

// --- التاجر ---
app.post('/api/merchant/product', async (req, res) => {
    await Product.create(req.body);
    res.json({ success: true });
});

app.post('/api/merchant/data', async (req, res) => {
    const products = await Product.find({ merchantId: req.body.merchantId }).sort({_id:-1});
    const orders = await Order.find({ merchantId: req.body.merchantId }).sort({_id:-1});
    res.json({ products, orders });
});

// المراسلة (إرسال إثبات الدفع)
app.post('/api/merchant/message', async (req, res) => {
    const { userId, text, image } = req.body;
    const user = await User.findById(userId);
    user.messages.push({ from: 'merchant', text, image });
    await user.save();
    res.json({ success: true });
});

// --- الطلبات وتأكيدها ---
app.post('/api/order/confirm', async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    
    if (order.status !== 'delivered') {
        const merchant = await User.findById(order.merchantId);
        
        // 1. إضافة سعر البيع لرصيد التاجر
        merchant.balance += order.price;
        
        // 2. حساب دين المنصة (العمولة)
        if (order.affiliateId !== 'direct') {
            const affiliate = await User.findById(order.affiliateId);
            if (affiliate) {
                affiliate.balance += order.commission;
                await affiliate.save();
            }
            merchant.debt += order.commission; // الدين هو عمولة المسوق التي دفعتها المنصة عنه
        }

        // قفل الحساب إذا تجاوز الدين
        if (merchant.debt >= 1000 && !merchant.debtDeadline) {
            const d = new Date(); d.setHours(d.getHours() + 48);
            merchant.debtDeadline = d;
        }
        
        order.status = 'delivered';
        await merchant.save();
        await order.save();
    }
    res.json({ success: true });
});

// --- إنشاء طلب (مع كشف الغش) ---
app.post('/api/order', async (req, res) => {
    const { productId, affiliateId, customer, fingerprint } = req.body;
    
    // كشف الغش: هل المسوق يشتري لنفسه؟
    if (affiliateId !== 'direct') {
        const affiliate = await User.findById(affiliateId);
        if (affiliate && affiliate.fingerprint === fingerprint) {
            return res.json({ success: false, msg: 'لا يمكنك الشراء من رابطك الخاص! (Fraud Detected)' });
        }
    }

    const product = await Product.findById(productId);
    await Order.create({
        productId, productName: product.title,
        merchantId: product.merchantId,
        affiliateId: affiliateId || 'direct',
        commission: product.commission,
        price: product.price,
        customer, customerFingerprint: fingerprint
    });
    
    product.sales++; await product.save();
    res.json({ success: true });
});

// --- المسوق ---
app.get('/api/market/products', async (req, res) => {
    const p = await Product.find({ active: true }).sort({_id:-1});
    res.json(p);
});

// --- الأدمن (جلب الرسائل) ---
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({ role: 'merchant' }).sort({ debt: -1 });
    res.json(users);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Pro System Running on ${port}`));
