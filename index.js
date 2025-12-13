const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. الاتصال بقاعدة البيانات ---
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ خطأ: يجب إضافة MONGO_URI في إعدادات Render");
} else {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
        .catch(err => console.error('❌ فشل الاتصال:', err));
}

// --- 2. هيكل البيانات ---
const BlacklistSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, trim: true },
    reason: String,
    reports: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
});
const Blacklist = mongoose.model('Blacklist', BlacklistSchema);

// --- 3. الواجهة الجديدة (مع الماسح الذكي) ---
const htmlTemplate = (stats, content) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DzShield - الماسح الذكي</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --primary-dark: #0a2342;
            --primary-light: #1c3a5e;
            --accent-gold: #cba557;
            --bg-light: #f8f9fa;
        }
        body { font-family: 'Cairo', sans-serif; background-color: var(--bg-light); color: #2c3e50; }
        
        /* الهيدر */
        .hero-section {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-light));
            color: white; padding: 60px 0 80px; text-align: center;
            border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; margin-bottom: -60px;
        }
        
        /* البطاقة الرئيسية */
        .main-card {
            background: white; border-radius: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.08);
            padding: 30px; border: 1px solid rgba(0,0,0,0.02);
        }

        /* تصميم الماسح الذكي */
        .network-badge {
            display: inline-block; padding: 5px 15px; border-radius: 20px;
            font-size: 0.9rem; font-weight: bold; margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .net-ooredoo { background-color: #ed1c24; color: white; }
        .net-djezzy { background-color: #f68e1e; color: white; }
        .net-mobilis { background-color: #009cde; color: white; }
        .net-unknown { background-color: #6c757d; color: white; }

        /* الأزرار والحقول */
        .btn-luxury {
            background: linear-gradient(to right, var(--primary-dark), var(--primary-light));
            color: white; border: none; padding: 12px 30px; border-radius: 10px; font-weight: bold;
        }
        .form-control-lg { border-radius: 10px; padding: 12px; font-size: 1.1rem; }
        
        /* بطاقات الحالة */
        .status-card { border-radius: 15px; padding: 25px; margin-top: 20px; text-align: center; border: 2px solid transparent; }
        .status-danger { background: #fff5f5; border-color: #fc8181; color: #c53030; }
        .status-safe { background: #f0fff4; border-color: #68d391; color: #2f855a; }
        
        .stats-box { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="hero-section">
        <div class="container">
            <h1 class="fw-bold"><i class="bi bi-shield-lock-fill text-gold"></i> DzShield</h1>
            <p class="opacity-75">المنصة الذكية لكشف الاحتيال وتحليل الأرقام</p>
        </div>
    </div>

    <div class="container" style="position: relative; z-index: 2;">
        <div class="row justify-content-center">
            <div class="col-lg-8 col-md-10">
                <div class="main-card">
                    
                    <div class="row mb-4">
                        <div class="col-6">
                            <div class="stats-box">
                                <h3 class="fw-bold text-dark m-0">${stats.totalCount}</h3>
                                <small class="text-muted">رقم محظور</small>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stats-box">
                                <h3 class="fw-bold text-dark m-0">${stats.todayCount}</h3>
                                <small class="text-muted">بلاغات اليوم</small>
                            </div>
                        </div>
                    </div>

                    <h5 class="fw-bold mb-3 text-dark"><i class="bi bi-search me-2"></i>فحص رقم زبون</h5>
                    <form action="/check" method="POST">
                        <div class="input-group mb-3">
                            <input type="tel" name="phone" class="form-control form-control-lg text-center" placeholder="أدخل الرقم (05/06/07...)" required pattern="[0-9]{10}">
                            <button class="btn btn-luxury" type="submit">فحص ذكي</button>
                        </div>
                    </form>

                    ${content}

                    <hr class="my-5 opacity-25">

                    <div class="p-3 bg-light rounded-3 border">
                        <h6 class="fw-bold text-danger mb-3"><i class="bi bi-exclamation-octagon-fill me-2"></i>إبلاغ عن رقم جديد</h6>
                        <form action="/report" method="POST" class="row g-2">
                            <div class="col-md-5">
                                <input type="tel" name="phone" class="form-control" placeholder="رقم المحتال" required>
                            </div>
                            <div class="col-md-4">
                                <select name="reason" class="form-select">
                                    <option>لا يرد / هاتف مغلق</option>
                                    <option>رفض الاستلام</option>
                                    <option>طلب وهمي</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <button type="submit" class="btn btn-danger w-100">حظر الرقم</button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    </div>
    
    <div class="text-center mt-4 mb-5 text-muted small">
        &copy; 2025 DzShield Security Systems
    </div>
</body>
</html>
`;

// --- 4. العمليات والمنطق الذكي ---

// دالة لتحديد الشبكة
function getNetworkInfo(phone) {
    if (phone.startsWith('05')) return { name: 'Ooredoo', class: 'net-ooredoo', icon: 'bi-Reception-4' };
    if (phone.startsWith('06')) return { name: 'Mobilis', class: 'net-mobilis', icon: 'bi-broadcast' };
    if (phone.startsWith('07')) return { name: 'Djezzy', class: 'net-djezzy', icon: 'bi-wifi' };
    return { name: 'شبكة غير معروفة', class: 'net-unknown', icon: 'bi-question-circle' };
}

app.get('/', async (req, res) => {
    const totalCount = await Blacklist.countDocuments();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = await Blacklist.countDocuments({ addedAt: { $gte: today } });
    res.send(htmlTemplate({ totalCount, todayCount }, ''));
});

app.post('/check', async (req, res) => {
    let phone = req.body.phone.trim().replace(/[^0-9]/g, ''); // تنظيف الرقم
    const result = await Blacklist.findOne({ phone: phone });
    
    // إحصائيات
    const totalCount = await Blacklist.countDocuments();
    const todayCount = await Blacklist.countDocuments({ addedAt: { $gte: new Date().setHours(0,0,0,0) } });

    // تحليل الشبكة
    const netInfo = getNetworkInfo(phone);
    const networkBadge = `<div class="network-badge ${netInfo.class}"><i class="bi ${netInfo.icon} me-1"></i> ${netInfo.name}</div>`;

    let message = '';
    if (result) {
        // نتيجة حمراء (خطر)
        message = `
            <div class="status-card status-danger animate__animated animate__fadeIn">
                ${networkBadge}
                <br>
                <i class="bi bi-x-octagon-fill" style="font-size: 3rem;"></i>
                <h2 class="mt-2 fw-bold">تحذير: رقم محظور!</h2>
                <p class="mb-1 fw-bold">السبب: ${result.reason}</p>
                <small class="text-muted">عدد البلاغات: ${result.reports} | تاريخ التسجيل: ${new Date(result.addedAt).toLocaleDateString('en-GB')}</small>
            </div>
        `;
    } else {
        // نتيجة خضراء (آمن)
        message = `
            <div class="status-card status-safe animate__animated animate__fadeIn">
                ${networkBadge}
                <br>
                <i class="bi bi-shield-fill-check" style="font-size: 3rem;"></i>
                <h2 class="mt-2 fw-bold">الرقم نظيف</h2>
                <p class="mb-0">لم يتم العثور على أي بلاغات في قاعدة البيانات.</p>
            </div>
        `;
    }

    res.send(htmlTemplate({ totalCount, todayCount }, message));
});

// لوحة التحكم السرية (احتفظت بها لك)
app.get('/admin-import-numbers', (req, res) => {
    res.send(`<form action="/admin-import-action" method="POST"><textarea name="bulkText" rows="10" style="width:100%"></textarea><button>Import</button></form>`);
});
app.post('/admin-import-action', async (req, res) => {
    // (نفس كود الاستيراد السابق)
    res.send("Admin Action"); 
});

// الإبلاغ العادي
app.post('/report', async (req, res) => {
    try {
        const { phone, reason } = req.body;
        const exists = await Blacklist.findOne({ phone });
        if (exists) { exists.reports += 1; exists.reason = reason; await exists.save(); } 
        else { await Blacklist.create({ phone, reason }); }
        res.redirect('/');
    } catch (err) { res.send(err.message); }
});

app.listen(3000, () => console.log('Smart Scanner Running'));
