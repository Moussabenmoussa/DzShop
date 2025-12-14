const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); // إضافة مهمة
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ DB Connected'))
        .catch(err => console.error('❌ DB Error:', err));
}

// 1. المستخدمين
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String, // merchant, affiliate
    balance: { type: Number, default: 0 },
    ccp: String
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
    sales: { type: Number, default: 0 },
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

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));

// --- API ---

// دخول
app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (user) res.json({ success: true, user });
        else res.json({ success: false, msg: 'بيانات خاطئة' });
    } catch(e) { res.status(500).json({ success: false }); }
});

// تسجيل
app.post('/api/auth/register', async (req, res) => {
    try {
        const exists = await User.findOne({ email: req.body.email });
        if (exists) return res.json({ success: false, msg: 'المستخدم مسجل مسبقاً' });
        const user = await User.create(req.body);
        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false }); }
});

// تحديث بيانات المستخدم (للحفاظ على الجلسة)
app.post('/api/user/refresh', async (req, res) => {
    try {
        const user = await User.findById(req.body.id);
        res.json(user);
    } catch(e) { res.status(404).json(null); }
});

// إضافة منتج (للتاجر)
app.post('/api/merchant/product', async (req, res) => {
    try {
        console.log("Adding Product:", req.body); // للتأكد في السجلات
        await Product.create(req.body);
        res.json({ success: true });
    } catch (e) {
        console.error("Product Error:", e);
        res.status(500).json({ success: false, msg: e.message });
    }
});

// جلب منتجات التاجر
app.post('/api/merchant/my-products', async (req, res) => {
    const products = await Product.find({ merchantId: req.body.merchantId }).sort({ createdAt: -1 });
    res.json(products);
});

// جلب المنتجات للمسوقين (السوق)
app.get('/api/market/products', async (req, res) => {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
    res.json(products);
});

// تسجيل طلب
app.post('/api/order', async (req, res) => {
    try {
        const { productId, affiliateId, name, phone, wilaya } = req.body;
        const product = await Product.findById(productId);
        
        if(!product) return res.status(404).json({success: false});

        await Order.create({
            productId: product._id,
            productName: product.title,
            merchantId: product.merchantId,
            affiliateId: affiliateId || 'direct',
            commission: product.commission,
            customerName: name,
            customerPhone: phone,
            customerWilaya: wilaya
        });

        // زيادة عداد المبيعات
        product.sales += 1;
        await product.save();

        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// جلب طلبات التاجر
app.post('/api/merchant/orders', async (req, res) => {
    const orders = await Order.find({ merchantId: req.body.merchantId }).sort({ date: -1 });
    res.json(orders);
});

// تغيير حالة الطلب
app.post('/api/order/status', async (req, res) => {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    
    // إذا تم التوصيل، ندفع للمسوق
    if (status === 'delivered' && order.status !== 'delivered' && order.affiliateId !== 'direct') {
        const affiliate = await User.findById(order.affiliateId);
        if (affiliate) {
            affiliate.balance += order.commission;
            await affiliate.save();
        }
    }
    
    order.status = status;
    await order.save();
    res.json({ success: true });
});

// جلب منتج واحد (للصفحة العامة)
app.get('/api/product/:id', async (req, res) => {
    try {
        const p = await Product.findById(req.params.id);
        res.json(p);
    } catch(e) { res.json({ error: true }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 DzAffiliate Pro Running on ${port}`));
