const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware'); 
// 👇 استدعاء أداة الفحص (TLS Fingerprint)
const { checkVideoLink } = require('../utils/browserMock'); 

// 1. عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { user, videos: myVideos });
    } catch (e) {
        res.redirect('/');
    }
});

// 2. إضافة فيديو جديد (مع الحماية والتسعير)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        const { url, targetViews, duration } = req.body;

        // 🛡️ [السر الجديد] التحقق من صحة الرابط قبل أي شيء
        const isValid = await checkVideoLink(url);
        if (!isValid) {
             return res.send(`
                <script>
                    alert("⚠️ الرابط لا يعمل أو الفيديو غير متاح!\\nتأكد أن الرابط صحيح وأن الفيديو عام (Public).");
                    window.location.href="/dashboard";
                </script>
            `);
        }
        
        // 💰 منطق التسعير (حسب المدة)
        let cost = 2; // الافتراضي
        let finalDuration = 30;

        const dur = parseInt(duration);
        if (dur === 45) { cost = 3; finalDuration = 45; }
        else if (dur === 60) { cost = 4; finalDuration = 60; }
        else if (dur === 90) { cost = 6; finalDuration = 90; }

        // 🏦 التحقق من رصيد المستخدم
        const user = await User.findById(req.session.userId);
        const minPoints = cost * 10; // يجب أن يكفي لـ 10 مشاهدات على الأقل

        if (user.points < minPoints) {
            return res.send(`
                <script>
                    alert("🚫 رصيدك غير كافي!\\nتحتاج ${minPoints} نقطة على الأقل لبدء الحملة.");
                    window.location.href="/dashboard";
                </script>
            `);
        }

        // ✅ إنشاء الفيديو
        await Video.create({
            userId: req.session.userId,
            url: url,
            targetViews: targetViews,
            duration: finalDuration,
            costPerView: cost,
            active: true
        });

        res.redirect('/dashboard');

    } catch (e) {
        console.error(e);
        res.send("Error adding video");
    }
});

// 3. صفحة المشاهد الآلي (Viewer)
// (هذا هو الرابط الصحيح الذي يستخدم تصميم الموبايل بدون Layout)
router.get('/viewer', isAuth, (req, res) => {
    res.render('viewer', { layout: false, user: req.user });
});

// 4. صفحة السجن (للمحظورين فقط)
router.get('/banned', isAuth, (req, res) => {
    if (!req.user.isBanned) {
        return res.redirect('/dashboard');
    }
    res.render('banned', { layout: false }); 
});

module.exports = router;
