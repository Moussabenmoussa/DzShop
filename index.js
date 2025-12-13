const express = require('express');
const mongoose = require('mongoose');
const app = express();

// إعدادات أساسية
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. الاتصال بقاعدة البيانات ---
// يأخذ الرابط من إعدادات السيرفر (Render)
const mongoUri = process.env.MONGO_URI;

// التحقق من وجود الرابط قبل الاتصال
if (!mongoUri) {
  console.error("❌ هام جداً: لم يتم العثور على رابط قاعدة البيانات (MONGO_URI)");
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ تم الاتصال بنجاح مع MongoDB Atlas'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));
}

// --- 2. تصميم شكل البيانات (Schema) ---
const OrderSchema = new mongoose.Schema({
  customerName: String,
  phone: String,
  wilaya: String,
  price: Number,
  status: { type: String, default: 'قيد المراجعة' }, // قيد المراجعة، تم الشحن، ملغى
  trackingCode: { type: String, default: '---' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- 3. تصميم الواجهة (HTML) ---
const htmlTemplate = (bodyContent) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة إدارة الطلبات - DzManager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #f0f2f5; }
        .header { background: #004d40; color: white; padding: 20px; text-align: center; margin-bottom: 30px; }
        .card { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-radius: 10px; }
        .status-badge { padding: 5px 12px; border-radius: 15px; font-size: 0.85em; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 DzManager - نظام إدارة الطلبات</h1>
        <p>نسخة متصلة بقاعدة بيانات حقيقية</p>
    </div>

    <div class="container">
        ${bodyContent}
    </div>

    <footer class="text-center mt-5 text-muted">
        <small>تم التطوير بواسطة مساعدك الذكي Gemini</small>
    </footer>
</body>
</html>
`;

// --- 4. الروابط والتحكم (Routes) ---

// الصفحة الرئيسية: عرض الطلبات
app.get('/', async (req, res) => {
    try {
        // جلب الطلبات من قاعدة البيانات (الأحدث أولاً)
        const orders = await Order.find().sort({ createdAt: -1 });

        // تحويل البيانات إلى جدول HTML
        let rowsHtml = orders.map(order => `
            <tr>
                <td>${order.customerName}</td>
                <td>${order.phone}</td>
                <td>${order.wilaya}</td>
                <td>${order.price} دج</td>
                <td>
                    <span class="status-badge" style="background:${order.status === 'تم الشحن' ? '#d4edda; color:#155724' : '#fff3cd; color:#856404'}">
                        ${order.status}
                    </span>
                </td>
                <td>${order.trackingCode}</td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
            </tr>
        `).join('');

        if (orders.length === 0) {
            rowsHtml = '<tr><td colspan="7" class="text-center p-3 text-muted">لا توجد طلبات حتى الآن. أضف أول طلب!</td></tr>';
        }

        const content = `
            <div class="row">
                <div class="col-md-4 mb-4">
                    <div class="card p-4">
                        <h4 class="mb-3">➕ إضافة طلب جديد</h4>
                        <form action="/add-order" method="POST">
                            <div class="mb-3">
                                <label>اسم الزبون</label>
                                <input type="text" name="name" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label>رقم الهاتف</label>
                                <input type="number" name="phone" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label>الولاية</label>
                                <select name="wilaya" class="form-select">
                                    <option value="الجزائر">الجزائر العاصمة</option>
                                    <option value="وهران">وهران</option>
                                    <option value="قسنطينة">قسنطينة</option>
                                    <option value="سطيف">سطيف</option>
                                    <option value="أخرى">ولاية أخرى...</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label>سعر المنتج (دج)</label>
                                <input type="number" name="price" class="form-control" value="0">
                            </div>
                            <button type="submit" class="btn btn-success w-100 fw-bold">حفظ الطلب</button>
                        </form>
                    </div>
                </div>

                <div class="col-md-8">
                    <div class="card p-4">
                        <h4 class="mb-3">📋 سجل الطلبات</h4>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead class="table-light">
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الهاتف</th>
                                        <th>الولاية</th>
                                        <th>السعر</th>
                                        <th>الحالة</th>
                                        <th>كود التتبع</th>
                                        <th>التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>${rowsHtml}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        res.send(htmlTemplate(content));

    } catch (error) {
        // في حالة وجود مشكلة في الاتصال بقاعدة البيانات
        res.send(htmlTemplate(`
            <div class="alert alert-danger text-center">
                <h3>⚠️ حدث خطأ في الاتصال بقاعدة البيانات</h3>
                <p>${error.message}</p>
                <hr>
                <p>تأكد من أنك أضفت <code>MONGO_URI</code> في إعدادات Render بشكل صحيح.</p>
            </div>
        `));
    }
});

// معالجة إضافة الطلب
app.post('/add-order', async (req, res) => {
    try {
        const { name, phone, wilaya, price } = req.body;

        // محاكاة الاتصال بشركة التوصيل (Yalidine Simulation)
        // هنا يمكن لاحقاً وضع كود الـ API الحقيقي
        const fakeTracking = "YAL-" + Math.floor(100000 + Math.random() * 900000);

        const newOrder = new Order({
            customerName: name,
            phone,
            wilaya,
            price,
            status: 'تم الشحن', // نفترض أنه تم إرساله مباشرة
            trackingCode: fakeTracking
        });

        await newOrder.save();
        
        // العودة للصفحة الرئيسية
        res.redirect('/');
    } catch (error) {
        res.status(500).send("حدث خطأ أثناء الحفظ: " + error.message);
    }
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
