const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Settings = require('../models/Settings');
const { isAuth } = require('../utils/middleware');

// ميدل وير لحماية لوحة التحكم (تأكد من وضع بريدك هنا)
const isAdmin = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح لك' });
    const user = await User.findById(req.session.userId);
    const ADMIN_EMAIL = "safah94899@supdrop.com"; // بريدك الخاص
    
    if (user && user.email === ADMIN_EMAIL) {
        next();
    } else {
        res.status(403).json({ error: 'دخول ممنوع: للمسؤولين فقط' });
    }
};

router.use(isAuth, isAdmin);

// عرض صفحة الإدارة الرئيسية
router.get('/', async (req, res) => {
    res.render('admin', { layout: false });
});

// 1. جلب الحملات التي تنتظر المراجعة (Pending)
router.get('/pending-campaigns', async (req, res) => {
    try {
        const campaigns = await Video.find({ status: 'Pending' })
            .populate('userId', 'email username')
            .sort({ createdAt: -1 });
        res.json({ success: true, campaigns });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 2. اتخاذ قرار بشأن حملة (قبول أو رفض)
router.post('/campaign-action', async (req, res) => {
    try {
        const { videoId, action, reason } = req.body;
        const video = await Video.findById(videoId);
        if (!video) return res.json({ success: false, message: 'الحملة غير موجودة' });

        if (action === 'approve') {
            video.status = 'Approved';
            video.active = true;
            await video.save();
            res.json({ success: true, message: '✅ تم قبول ونشر الحملة' });
        } else {
            video.status = 'Rejected';
            video.active = false;
            video.rejectionReason = reason || "مخالفة الشروط";
            await video.save();
            res.json({ success: true, message: '❌ تم رفض الحملة' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 3. تحديث إعدادات بايبال من اللوحة
router.post('/update-paypal', async (req, res) => {
    try {
        const { clientId, secret, mode, exchangeRate } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        settings.paypal = {
            active: true,
            clientId,
            clientSecret: secret,
            mode,
            exchangeRate
        };

        await settings.save();
        res.json({ success: true, message: '✅ تم تحديث إعدادات بايبال بنجاح' });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 4. تعديل رصيد مستخدم يدوياً
router.post('/modify-user-points', async (req, res) => {
    try {
        const { email, amount, action } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: 'المستخدم غير موجود' });

        const change = action === 'add' ? parseInt(amount) : -parseInt(amount);
        user.points += change;
        await user.save();

        res.json({ success: true, message: `✅ تم تحديث رصيد ${user.email} بنجاح` });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

module.exports = router;
