const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware'); // سننشئه في الدفعة القادمة
const router = express.Router();

// عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
    res.render('dashboard', { user, videos: myVideos });
});

// إضافة حملة جديدة
router.post('/add-campaign', isAuth, async (req, res) => {
    const { url, views, mobileOnly } = req.body;
    const user = await User.findById(req.session.userId);
    
    // حساب التكلفة (مثلاً: 1 نقطة للمشاهدة العادية، 2 للموبايل)
    const costPerView = mobileOnly ? 2 : 1;
    const totalCost = parseInt(views) * costPerView;

    if (user.points < totalCost) {
        return res.send('لا يوجد رصيد كافٍ للنقاط');
    }

    // استخراج معرف الفيديو (بسيط)
    const videoId = url.split('/video/')[1]?.split('?')[0] || 'unknown';

    // إنشاء الحملة وخصم الرصيد
    await Video.create({ userId: user._id, url, videoId, targetViews: views, costPerView, mobileOnly: !!mobileOnly });
    
    user.points -= totalCost;
    await user.save();

    res.redirect('/dashboard');
});

// صفحة المشاهدة (لبدء جمع النقاط)
router.get('/view', isAuth, (req, res) => {
    res.render('viewer', { user: req.session.userId });
});

module.exports = router;
