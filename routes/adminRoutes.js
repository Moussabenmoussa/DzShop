const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware');

// حماية الأدمن
const isAdmin = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح لك' });
    try {
        const user = await User.findById(req.session.userId);
        const ADMIN_EMAIL = "safah94899@supdrop.com"; // إيميلك
        
        if (user && user.email === ADMIN_EMAIL) {
            next();
        } else {
            res.status(403).json({ error: 'دخول ممنوع' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};

router.use(isAuth, isAdmin);

// عرض الصفحة
router.get('/', async (req, res) => {
    res.render('admin', { layout: false });
});

// 1. جلب الحملات (الإصلاح الشامل)
router.get('/pending-campaigns', async (req, res) => {
    try {
        // يجلب أي فيديو حالته ليست "Approved" (سواء كان Pending أو Rejected أو فارغ)
        const campaigns = await Video.find({ 
            status: { $ne: 'Approved' } 
        })
        .populate('userId', 'email')
        .sort({ createdAt: -1 });

        console.log(`🔍 Admin: وجدنا ${campaigns.length} حملة للمراجعة`);
        res.json({ success: true, campaigns });
    } catch (e) {
        console.error("Admin Error:", e);
        res.json({ success: false, campaigns: [] });
    }
});

// 2. اتخاذ القرار (قبول / رفض)
router.post('/campaign-action', async (req, res) => {
    try {
        const { videoId, action } = req.body;
        const video = await Video.findById(videoId);
        if (!video) return res.json({ success: false, message: 'غير موجود' });

        if (action === 'approve') {
            video.status = 'Approved';
            video.active = true;
            await video.save();
            res.json({ success: true, message: '✅ تم النشر' });
        } else {
            video.status = 'Rejected';
            video.active = false;
            await video.save();
            res.json({ success: true, message: '❌ تم الرفض' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 3. تعديل الرصيد يدوياً
router.post('/modify-user-points', async (req, res) => {
    try {
        const { email, amount, action } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: 'المستخدم غير موجود' });
        
        const change = action === 'add' ? parseInt(amount) : -parseInt(amount);
        user.points += change;
        await user.save();
        
        res.json({ success: true, message: `✅ الرصيد الجديد: ${user.points}` });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

module.exports = router;
