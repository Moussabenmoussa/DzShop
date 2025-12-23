require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const expressLayouts = require('express-ejs-layouts'); // <--- 1. إضافة المكتبة هنا

const app = express();

// 1. الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tiktokhive')
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

// 2. إعدادات السيرفر
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- إعداد الـ Layout (مهم جداً للتصميم) ---
app.use(expressLayouts);          // <--- 2. تفعيل المكتبة
app.set('layout', './layout');    // <--- 3. تحديد ملف الـ layout الافتراضي
app.set('view engine', 'ejs');

// 3. إعداد الجلسات (Sessions)
app.use(session({
    secret: process.env.SESSION_SECRET || 'super_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tiktokhive' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // يوم واحد
}));

// 4. استدعاء المسارات
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/apiRoutes'));

// 5. التشغيل
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Hive Engine Running on Port ${PORT}`));
