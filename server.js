
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path'); // مكتبة المسارات
const expressLayouts = require('express-ejs-layouts'); // مكتبة التصميم

const app = express();

// 1. الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tiktokhive')
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

// 2. إعدادات السيرفر
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // مسار ملفات JS/CSS

// 3. إصلاح التصميم (الحل الجذري)
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views')); // تحديد مجلد القوالب بدقة
app.set('layout', 'layout'); // اسم الملف layout.ejs داخل مجلد views
app.set('view engine', 'ejs');

// 4. إعداد الجلسات
app.use(session({
    secret: process.env.SESSION_SECRET || 'super_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tiktokhive' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

// 5. المسارات
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/apiRoutes'));
app.use('/api', require('./routes/apiRoutes'));
app.use('/api', require('./routes/harvestRoutes')); // 👈 أضف هذا السطر الجديد


// === 🚑 كود الطوارئ لفك الحظر ===
app.get('/rescue-me', async (req, res) => {
    try {
        const User = require('./models/User'); // استدعاء الموديل
        
        // ⚠️ استبدل هذا الإيميل بإيميلك الذي سجلت به
        const myEmail = "mouniir1982@gmail.com"; 

        const user = await User.findOneAndUpdate(
            { email: myEmail },
            { 
                isBanned: false, 
                fraudStrikes: 0, 
                deviceFingerprint: null, // مسح البصمة
                banReason: null 
            },
            { new: true }
        );

        if (user) {
            res.send(`<h1>✅ تم فك الحظر عن: ${user.name}</h1><p>رصيد المخالفات عاد للصفر. يمكنك الدخول الآن.</p> <a href="/login">تسجيل الدخول</a>`);
        } else {
            res.send(`<h1>❌ لم يتم العثور على المستخدم: ${myEmail}</h1>`);
        }
    } catch (e) {
        res.send("Error: " + e.message);
    }
});
// =================================



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Hive Engine Running on Port ${PORT}`));
