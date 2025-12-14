const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات مع إظهار الأخطاء
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ DB Connected Successfully'))
        .catch(err => console.error('❌ DB Connection Error:', err));
} else {
    console.error('⚠️ تحذير: لم يتم وضع رابط قاعدة البيانات (MONGO_URI) في إعدادات Render');
}

// 1. مودل المنتجات
const ProductSchema = new mongoose.Schema({
    title: String,
    price: Number,
    commission: Number,
    image: String,
    category: String,
    stock: { type: Number, default: 50 },
    sales: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', ProductSchema);

// 2. مودل الطلبات
const OrderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    customerName: String,
    customerPhone: String,
    customerWilaya: String,
    affiliateId: String,
    commission: Number,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 3. مودل المستخدمين (للدخول)
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String, // merchant, affiliate
    balance: { type: Number, default: 0 },
    ccp: String
});
const User = mongoose.model('User', UserSchema);

// تهيئة البيانات
async function initDB() {
    if (!mongoUri) return;
    const count = await Product.countDocuments();
    if (count === 0) {
        await Product.create({
            title: 'ساعة ذكية Ultra',
            price: 3500,
            commission: 600,
            image: 'https://via.placeholder.com/500',
            category: 'إلكترونيات'
        });
        console.log('📦 تم إنشاء منتج تجريبي');
    }
}
initDB();

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));

// صفحة المنتج (تأكدنا من المسار هنا)
app.get('/p/:id', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'product.html'));
});

// --- API ---

// تسجيل الطلب (هنا كان يحدث المشكل غالباً)
app.post('/api/order', async (req, res) => {
    try {
        console.log("📥 طلب جديد وصل:", req.body); // طباعة البيانات في السجل لفحصها

        const { productId, name, phone, wilaya, affiliateId } = req.body;
        
        // التحقق من أن المنتج موجود
        const product = await Product.findById(productId);
        if (!product) {
            console.error("❌ المنتج غير موجود:", productId);
            return res.status(404).json({ success: false, msg: "المنتج غير موجود" });
        }

        // إنشاء الطلب
        await Order.create({
            productId: product._id,
            productName: product.title,
            customerName: name,
            customerPhone: phone,
            customerWilaya: wilaya,
            affiliateId: affiliateId || 'direct',
            commission: product.commission
        });

        // زيادة عداد المبيعات
        product.sales = (product.sales || 0) + 1;
        await product.save();

        console.log("✅ تم حفظ الطلب بنجاح!");
        res.json({ success: true });

    } catch (e) {
        console.error("❌ خطأ أثناء حفظ الطلب:", e); // طباعة الخطأ في السيرفر
        res.status(500).json({ success: false, error: e.message });
    }
});

// باقي الـ APIs (كما هي)
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.get('/api/product/:id', async (req, res) => {
    try {
        const p = await Product.findById(req.params.id);
        res.json(p || { error: true });
    } catch(e) { res.json({ error: true }); }
});

// المصادقة (مبسطة)
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    res.json(user ? { success: true, user } : { success: false, msg: 'خطأ في البيانات' });
});

app.post('/api/auth/register', async (req, res) => {
    const user = await User.create(req.body);
    res.json({ success: true, user });
});

app.post('/api/merchant/orders', async (req, res) => {
    const orders = await Order.find().sort({date: -1}); // جلب كل الطلبات للتجربة
    res.json(orders);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server Running on port ${port}`));
