const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. الاتصال بقاعدة البيانات الحقيقية ---
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ خطأ: يجب إضافة MONGO_URI في إعدادات Render");
} else {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ تم الاتصال بقاعدة البيانات الحقيقية'))
        .catch(err => console.error('❌ فشل الاتصال:', err));
}

// --- 2. هيكل البيانات (للأرقام الحقيقية) ---
const BlacklistSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, trim: true },
    reason: String,
    reports: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
});
const Blacklist = mongoose.model('Blacklist', BlacklistSchema);

// --- 3. الواجهة الجديدة (تصميم فخم وموثوق) ---
const htmlTemplate = (stats, content) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DzShield - المنصة الجزائرية لكشف الاحتيال</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --primary-dark: #0a2342; /* أزرق داكن فخم */
            --primary-light: #1c3a5e;
            --accent-gold: #cba557; /* لمسة ذهبية */
            --bg-light: #f8f9fa;
            --text-dark: #2c3e50;
        }
        body {
            font-family: 'Cairo', sans-serif;
            background-color: var(--bg-light);
            color: var(--text-dark);
            overflow-x: hidden;
        }
        .hero-section {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-light));
            color: white;
            padding: 80px 0 100px;
            text-align: center;
            border-bottom-left-radius: 50% 20px;
            border-bottom-right-radius: 50% 20px;
            margin-bottom: -80px; /* تداخل مع الكارت */
        }
        .hero-title {
            font-weight: 700;
            letter-spacing: -1px;
        }
        .hero-subtitle {
            font-weight: 400;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .main-card {
            background: white;
            border-radius: 25px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            padding: 40px;
            border: 1px solid rgba(0,0,0,0.02);
        }
        .stats-divider {
            border-left: 1px solid #eee;
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-dark);
            line-height: 1;
        }
        .stat-label {
            color: #6c757d;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .form-control-lg {
            border-radius: 12px;
            padding: 15px 20px;
            border: 2px solid #eee;
            font-size: 1.1rem;
        }
        .form-control-lg:focus {
            border-color: var(--primary-light);
            box-shadow: none;
        }
        .btn-luxury {
            background: linear-gradient(to right, var(--primary-dark), var(--primary-light));
            color: white;
            border: none;
            border-radius: 12px;
            padding: 15px 40px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
        }
        .btn-luxury:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(10, 35, 66, 0.2);
            color: var(--accent-gold);
        }
        .section-title {
            position: relative;
            padding-bottom: 15px;
            margin-bottom: 30px;
            font-weight: 700;
            color: var(--primary-dark);
        }
        .section-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 60px;
            height: 3px;
            background: var(--accent-gold);
        }
        .status-card {
            border-radius: 15px;
            padding: 30px;
            margin-top: 30px;
            text-align: center;
        }
        .status-danger {
            background: #fff5f5;
            border: 2px solid #fc8181;
            color: #c53030;
        }
        .status-safe {
            background: #f0fff4;
            border: 2px solid #68d391;
            color: #2f855a;
        }
        footer {
            text-align: center;
            padding: 30px 0;
            color: #6c757d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="hero-section">
        <div class="container">
            <h1 class="hero-title display-5 mb-3"><i class="bi bi-shield-lock-fill text-gold"></i> DzShield</h1>
            <p class="hero-subtitle lead">المنصة الجزائرية الموثوقة لحماية التجار من الاحتيال والروتور</p>
        </div>
    </div>

    <div class="container" style="position: relative; z-index: 2;">
        <div class="row justify-content-center">
            <div class="col-lg-9 col-md-10">
                <div class="main-card">
                    <div class="row mb-5 text-center justify-content-center">
                        <div class="col-5">
                            <div class="stat-number">${stats.totalCount}</div>
                            <div class="stat-label">رقم محظور مسجل</div>
                        </div>
                        <div class="col-5 stats-divider">
                            <div class="stat-number">${stats.todayCount}</div>
                            <div class="stat-label">بلاغات اليوم</div>
                        </div>
                    </div>

                    <h4 class="section-title"><i class="bi bi-search me-2"></i>فحص رقم زبون</h4>
                    <form action="/check" method="POST" class="mb-4">
                        <div class="input-group">
                            <input type="tel" name="phone" class="form-control form-control-lg" placeholder="أدخل رقم الهاتف (مثال: 0550...)" required pattern="[0-9]{10}" title="يرجى إدخال 10 أرقام">
                            <button class="btn btn-luxury" type="submit">تحقق الآن</button>
                        </div>
                    </form>

                    ${content}

                    <hr class="my-5" style="opacity: 0.1;">
                    
                    <h4 class="section-title text-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i>الإبلاغ عن رقم محتال</h4>
                    <p class="text-muted mb-4 small">ساهم في حماية مجتمع التجار. يتم إضافة الأرقام لقاعدة البيانات فوراً.</p>
                    
                    <form action="/report" method="POST" class="row g-3 align-items-end">
                        <div class="col-md-5">
                            <label class="form-label fw-bold small">رقم الهاتف</label>
                            <input type="tel" name="phone" class="form-control" placeholder="0660..." required pattern="[0-9]{10}">
                        </div>
                        <div class="col-md-4">
                             <label class="form-label fw-bold small">سبب البلاغ</label>
                            <select name="reason" class="form-select">
                                <option>لا يرد / هاتف مغلق دائماً</option>
                                <option>رفض الاستلام عند الوصول</option>
                                <option>طلب وهمي / عنوان خاطئ</option>
                                <option>سلوك غير لائق مع الموزع</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button type="submit" class="btn btn-danger w-100 fw-bold py-2">تسجيل البلاغ</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <footer>
        <div class="container">
            <p>© 2023 DzShield - جميع الحقوق محفوظة. منصة مطورة لحماية التجارة الإلكترونية في الجزائر.</p>
        </div>
    </footer>
</body>
</html>
`;

// --- 4. العمليات (Backend Logic) ---

// الصفحة الرئيسية
app.get('/', async (req, res) => {
    const totalCount = await Blacklist.countDocuments();
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayCount = await Blacklist.countDocuments({ addedAt: { $gte: today } });

    res.send(htmlTemplate({ totalCount, todayCount }, ''));
});

// عملية الفحص
app.post('/check', async (req, res) => {
    const phone = req.body.phone.trim();
    const result = await Blacklist.findOne({ phone: phone });
    
    const totalCount = await Blacklist.countDocuments();
    const todayCount = await Blacklist.countDocuments({ addedAt: { $gte: new Date().setHours(0,0,0,0) } });

    let message = '';
    if (result) {
        message = `
            <div class="status-card status-danger animate__animated animate__fadeIn">
                <i class="bi bi-x-circle-fill text-danger" style="font-size: 3rem;"></i>
                <h2 class="mt-3 fw-bold text-danger">تحذير: هذا الرقم مصنف كـ "روتور"</h2>
                <p class="lead mb-1">تم الإبلاغ عنه <strong>${result.reports}</strong> مرات من قبل تجار آخرين.</p>
                <div class="badge bg-danger bg-opacity-10 text-danger p-2 mt-3 fs-6">آخر سبب: ${result.reason}</div>
                <div class="text-muted small mt-3">تاريخ أول تسجيل: ${new Date(result.addedAt).toLocaleDateString('ar-DZ')}</div>
            </div>
        `;
    } else {
        message = `
            <div class="status-card status-safe animate__animated animate__fadeIn">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                <h2 class="mt-3 fw-bold text-success">الرقم نظيف حالياً</h2>
                <p class="lead text-muted">لم يتم تسجيل أي بلاغ احتيال ضد هذا الرقم في قاعدة بياناتنا.</p>
                <small class="text-muted">ننصح دائماً بتأكيد الطلب هاتفياً قبل الإرسال.</small>
            </div>
        `;
    }

    res.send(htmlTemplate({ totalCount, todayCount }, message));
});

// عملية الإبلاغ
app.post('/report', async (req, res) => {
    try {
        const { phone, reason } = req.body;
        const exists = await Blacklist.findOne({ phone });
        
        if (exists) {
            exists.reports += 1;
            exists.reason = reason;
            await exists.save();
        } else {
            await Blacklist.create({ phone, reason });
        }
        res.redirect('/');
    } catch (err) {
        res.send(`Error: ${err.message}`);
    }
});

app.listen(3000, () => console.log('DzShield Premium Running'));
