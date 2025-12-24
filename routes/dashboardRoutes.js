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
// ... (الاستدعاءات السابقة)

// إضافة حملة جديدة (ذكي وشامل)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        const { url, targetViews, duration, type, visitType, keyword } = req.body;

        // 1. التحقق من الرابط (يعمل للفيديو والمواقع)
        const isValid = await checkVideoLink(url);
        if (!isValid) {
             return res.send(`
                <script>
                    alert("⚠️ الرابط لا يعمل! تأكد أنه متاح للعامة.");
                    window.location.href="/dashboard";
                </script>
            `);
        }
        
        // 2. حساب التكلفة (الخوارزمية المالية)
        let cost = 2; // السعر الأساسي
        let finalDuration = 30;
        
        // تسعير المدة
        const dur = parseInt(duration);
        if (dur === 60) { cost += 2; finalDuration = 60; }
        else if (dur === 90) { cost += 4; finalDuration = 90; }

        // تسعير النوع (بحث جوجل هو الأغلى)
        if (type === 'website' && visitType === 'search') {
            cost += 2; // ضريبة الـ SEO (لأنها خدمة نخبة)
        }

        // 3. التحقق من الرصيد
        const user = await User.findById(req.session.userId);
        const totalCost = cost * targetViews;

        if (user.points < totalCost) {
            return res.send(`
                <script>
                    alert("🚫 رصيدك غير كافي!\\nتحتاج ${totalCost} نقطة لهذه الحملة القوية.");
                    window.location.href="/dashboard";
                </script>
            `);
        }

        // 4. الخصم والإنشاء
        await User.findByIdAndUpdate(user._id, { $inc: { points: -totalCost } });

        await Video.create({
            userId: req.session.userId,
            type: type || 'video',
            visitType: (type === 'website') ? visitType : undefined,
            keyword: (type === 'website' && visitType === 'search') ? keyword : undefined,
            url: url,
            targetViews: targetViews,
            duration: finalDuration,
            costPerView: cost,
            active: true
        });

        res.redirect('/dashboard');

    } catch (e) {
        console.error(e);
        res.send("Error adding campaign");
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
