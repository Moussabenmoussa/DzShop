const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// صفحة الدخول
router.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('auth');
});

// تسجيل حساب جديد
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // تشفير كلمة السر
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({ name, email, password: hashedPassword });
        req.session.userId = user._id; // تسجيل دخول تلقائي
        res.redirect('/dashboard');
    } catch (e) {
        res.render('auth', { error: 'البريد المستخدم موجود مسبقاً' });
    }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } else {
        res.render('auth', { error: 'بيانات خاطئة' });
    }
});

// تسجيل الخروج
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
