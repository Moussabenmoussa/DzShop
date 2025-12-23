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

// إضافة فيديو جديد (مع منطق التسعير)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        const { url, targetViews, duration } = req.body;
        
        // 1. تحديد التكلفة بناءً على المدة المختارة
        // المعادلة: كل 15 ثانية إضافية تزيد التكلفة
        let cost = 2; // السعر الافتراضي لـ 30 ثانية
        let finalDuration = 30;

        if (parseInt(duration) === 45) {
            cost = 3;
            finalDuration = 45;
        } else if (parseInt(duration) === 60) {
            cost = 4;
            finalDuration = 60;
        } else if (parseInt(duration) === 90) {
            cost = 6;
            finalDuration = 90;
        }

        // 2. التحقق من رصيد المستخدم (اختياري، لكن مفضل)
        // هل يملك المستخدم نقاطاً تكفي لأول 10 مشاهدات على الأقل؟
        
        const user = await User.findById(req.session.userId);
        if (user.points < cost * 10) {
            return res.send('<script>alert("رصيدك لا يكفي! تحتاج نقاطاً أكثر."); window.location.href="/dashboard";</script>');
        }
        

        // 3. إنشاء الفيديو
        await Video.create({
            userId: req.session.userId,
            url: url,
            targetViews: targetViews,
            
            // البيانات الجديدة
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

// صفحة المشاهدة (لبدء جمع النقاط)
router.get('/view', isAuth, (req, res) => {
    res.render('viewer', { user: req.session.userId });
});

// === صفحة السجن (للمحظورين فقط) ===
router.get('/banned', isAuth, (req, res) => {
    // إذا لم يكن محظوراً ودخل هنا بالخطأ، نرجعه للوحة التحكم
    if (!req.user.isBanned) {
        return res.redirect('/dashboard');
    }
    
    // عرض صفحة السجن (بدون الـ Layout العادي)
    res.render('banned', { layout: false }); 
});






module.exports = router;
