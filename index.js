const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- الموديلات (قواعد البيانات) ---

// 1. المستخدمين (تجار ومسوقين)
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String, // (في الواقع يجب تشفيرها، هنا مبسطة)
    role: String, // 'merchant' أو 'affiliate'
    balance: { type: Number, default: 0 }, // المحفظة
    ccp: String, // معلومات الدفع
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. المنتجات
const ProductSchema = new mongoose.Schema({
    merchantId: String, // صاحب المنتج
    title: String,
    price: Number,
    commission: Number, // عمولة المسوق
    image: String,
    category: String,
    stock: { type: Number, default: 100 },
    active: { type: Boolean, default: true }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. الطلبات
const OrderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    merchantId: String,
    affiliateId: String, // من جلب المبيعة؟
    commission: Number,
    customer: { name: String, phone: String, address: String },
    status: { type: String, default: 'pending' }, // pending, delivered, returned
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 4. السحوبات (Withdrawals)
const WithdrawalSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    ccp: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html'))); // لوحة التحكم الموحدة
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html'))); // صفحة المنتج

// --- API (المصادقة) ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, ccp } = req.body;
        const exists = await User.findOne({ email });
        if(exists) return res.json({ success: false, msg: 'البريد مسجل مسبقاً' });
        
        const user = await User.create({ name, email, password, role, ccp });
        res.json({ success: true, user });
    } catch(e) { res.json({ success: false, msg: 'حدث خطأ' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if(user) res.json({ success: true, user });
    else res.json({ success: false, msg: 'بيانات خاطئة' });
});

app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    res.json(user);
});

// --- API (للمسوق) ---
app.get('/api/market/products', async (req, res) => {
    const products = await Product.find({ active: true });
    res.json(products);
});

// طلب سحب الأرباح
app.post('/api/wallet/withdraw', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findById(userId);
    if(user.balance >= amount) {
        user.balance -= amount;
        await user.save();
        await Withdrawal.create({ userId, amount, ccp: user.ccp });
        res.json({ success: true });
    } else {
        res.json({ success: false, msg: 'الرصيد غير كافٍ' });
    }
});

// --- API (للتاجر) ---
app.post('/api/merchant/product', async (req, res) => {
    await Product.create(req.body);
    res.json({ success: true });
});

app.post('/api/merchant/orders', async (req, res) => {
    const orders = await Order.find({ merchantId: req.body.merchantId }).sort({date: -1});
    res.json(orders);
});

// *** أهم دالة: تغيير حالة الطلب ودفع العمولة ***
app.post('/api/order/status', async (req, res) => {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    
    // إذا تغيرت الحالة إلى "تم التوصيل"، ندفع للمسوق
    if (status === 'delivered' && order.status !== 'delivered' && order.affiliateId) {
        const affiliate = await User.findById(order.affiliateId);
        if(affiliate) {
            affiliate.balance += order.commission;
            await affiliate.save();
        }
    }
    
    order.status = status;
    await order.save();
    res.json({ success: true });
});

// --- API (للزبون) ---
app.get('/api/product/:id', async (req, res) => {
    const p = await Product.findById(req.params.id);
    res.json(p);
});

app.post('/api/order/create', async (req, res) => {
    const { productId, affiliateId, customer } = req.body;
    const product = await Product.findById(productId);
    
    await Order.create({
        productId,
        productName: product.title,
        merchantId: product.merchantId,
        affiliateId,
        commission: product.commission,
        customer
    });
    res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 DzAffiliate Pro Running`));
