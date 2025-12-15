const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- الموديلات ---

// 1. إعدادات المنصة (لتغيير طرق الدفع دون كود)
const SettingsSchema = new mongoose.Schema({
    id: { type: String, default: 'admin_settings' },
    redotpayId: { type: String, default: '12345678' },
    ccp: { type: String, default: '000000000000' },
    usdtRate: { type: Number, default: 245 },
    minWithdraw: { type: Number, default: 2000 }
});
const Settings = mongoose.model('Settings', SettingsSchema);

// 2. المستخدمين
const UserSchema = new mongoose.Schema({
    name: String, email: String, password: String, role: String,
    balance: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    debtDeadline: Date,
    isBanned: { type: Boolean, default: false },
    fingerprint: String,
    ccp: String, // للمسوق لاستقبال المال
    messages: [{ 
        text: String, image: String, 
        read: { type: Boolean, default: false }, // حالة القراءة
        date: { type: Date, default: Date.now } 
    }]
});
const User = mongoose.model('User', UserSchema);

// 3. المنتجات (أضفنا الوصف desc)
const ProductSchema = new mongoose.Schema({
    merchantId: String, title: String, desc: String, 
    price: Number, commission: Number, image: String,
    category: String, active: { type: Boolean, default: true },
    stock: { type: Number, default: 100 }, sales: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 4. الطلبات
const OrderSchema = new mongoose.Schema({
    productId: String, productName: String, merchantId: String, affiliateId: String,
    commission: Number, price: Number,
    customer: { name: String, phone: String, wilaya: String },
    customerFingerprint: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 5. السحوبات (للمسوقين)
const WithdrawalSchema = new mongoose.Schema({
    userId: String, userName: String, amount: Number, ccp: String,
    status: { type: String, default: 'pending' }, // pending, paid
    date: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// تهيئة الإعدادات
async function init() {
    if(!mongoUri) return;
    const s = await Settings.findOne({ id: 'admin_settings' });
    if(!s) await Settings.create({ id: 'admin_settings' });
}
init();

// --- المسارات ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/p/:id', (req, res) => res.sendFile(path.resolve(__dirname, 'product.html')));
app.get('/super-admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));

// --- API ---

// إعدادات المنصة
app.get('/api/settings', async (req, res) => {
    const s = await Settings.findOne({ id: 'admin_settings' });
    res.json(s);
});
app.post('/api/settings', async (req, res) => {
    await Settings.findOneAndUpdate({ id: 'admin_settings' }, req.body, { upsert: true });
    res.json({ success: true });
});

// المصادقة
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (!user) return res.json({ success: false, msg: 'بيانات خاطئة' });
    if (user.isBanned) return res.json({ success: false, msg: 'حسابك محظور لدين غير مدفوع' });
    res.json({ success: true, user });
});

app.post('/api/auth/register', async (req, res) => {
    const { fingerprint, email } = req.body;
    const banned = await User.findOne({ fingerprint, isBanned: true });
    if (banned) return res.json({ success: false, msg: 'جهاز محظور' });
    try {
        const user = await User.create(req.body);
        res.json({ success: true, user });
    } catch(e) { res.json({ success: false, msg: 'البريد مستخدم' }); }
});

app.post('/api/user/refresh', async (req, res) => {
    const user = await User.findById(req.body.id);
    res.json(user ? { success: true, user } : { success: false });
});

// التاجر
app.post('/api/merchant/product', async (req, res) => {
    await Product.create(req.body);
    res.json({ success: true });
});
app.post('/api/merchant/data', async (req, res) => {
    const products = await Product.find({ merchantId: req.body.merchantId }).sort({_id:-1});
    const orders = await Order.find({ merchantId: req.body.merchantId }).sort({_id:-1});
    res.json({ products, orders });
});
app.post('/api/merchant/message', async (req, res) => {
    const { userId, text, image } = req.body;
    const user = await User.findById(userId);
    user.messages.push({ text, image });
    await user.save();
    res.json({ success: true });
});

// الطلبات
app.post('/api/order/confirm', async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (order.status !== 'delivered') {
        const merchant = await User.findById(order.merchantId);
        merchant.balance += order.price;
        if (order.affiliateId !== 'direct') {
            const affiliate = await User.findById(order.affiliateId);
            if (affiliate) { affiliate.balance += order.commission; await affiliate.save(); }
            merchant.debt += order.commission;
        }
        if (merchant.debt >= 1000 && !merchant.debtDeadline) {
            const d = new Date(); d.setHours(d.getHours() + 48);
            merchant.debtDeadline = d;
        }
        order.status = 'delivered';
        await merchant.save(); await order.save();
    }
    res.json({ success: true });
});

// إنشاء طلب
app.post('/api/order', async (req, res) => {
    const { productId, affiliateId, customer, fingerprint } = req.body;
    if (affiliateId !== 'direct') {
        const affiliate = await User.findById(affiliateId);
        if (affiliate && affiliate.fingerprint === fingerprint) return res.json({ success: false, msg: 'غش!' });
    }
    const product = await Product.findById(productId);
    if(!product) return res.json({ success: false, msg: 'المنتج غير موجود' });

    await Order.create({
        productId, productName: product.title, merchantId: product.merchantId,
        affiliateId: affiliateId || 'direct', commission: product.commission, price: product.price,
        customer, customerFingerprint: fingerprint
    });
    product.sales++; await product.save();
    res.json({ success: true });
});

// المسوق
app.get('/api/market/products', async (req, res) => {
    const p = await Product.find({ active: true }).sort({_id:-1});
    res.json(p);
});
app.post('/api/wallet/withdraw', async (req, res) => {
    const { userId, amount, ccp } = req.body;
    const user = await User.findById(userId);
    const settings = await Settings.findOne({ id: 'admin_settings' });
    
    if(amount < settings.minWithdraw) return res.json({ success: false, msg: `الحد الأدنى ${settings.minWithdraw} دج` });
    if(user.balance < amount) return res.json({ success: false, msg: 'الرصيد غير كاف' });

    user.balance -= amount;
    user.ccp = ccp; // تحديث الـ CCP
    await user.save();
    
    await Withdrawal.create({ userId, userName: user.name, amount, ccp });
    res.json({ success: true });
});

// الأدمن
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({ role: 'merchant' }).sort({ debt: -1 });
    res.json(users);
});
app.get('/api/admin/withdrawals', async (req, res) => {
    const w = await Withdrawal.find().sort({ status: -1, date: -1 }); // المعلق أولاً
    res.json(w);
});
app.post('/api/admin/confirm-withdraw', async (req, res) => {
    await Withdrawal.findByIdAndUpdate(req.body.id, { status: 'paid' });
    res.json({ success: true });
});
app.post('/api/admin/clear-debt', async (req, res) => {
    const user = await User.findById(req.body.userId);
    user.debt = 0; user.debtDeadline = null; user.isBanned = false;
    await user.save();
    res.json({ success: true });
});
app.post('/api/admin/read-msg', async (req, res) => {
    const { userId, msgIndex } = req.body;
    const user = await User.findById(userId);
    // قراءة كل الرسائل أو واحدة محددة (هنا نجعلها تقرأ الكل للسهولة)
    user.messages.forEach(m => m.read = true);
    await user.save();
    res.json({ success: true });
});

// المنتج
app.get('/api/product/:id', async (req, res) => {
    const p = await Product.findById(req.params.id);
    res.json(p);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 System Online`));
