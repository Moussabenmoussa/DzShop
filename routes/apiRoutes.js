
const express = require('express');
const mongoose = require('mongoose'); // استدعاء mongoose ضروري
const Video = require('../models/Video'); // تأكد أن اسم الملف مطابق (كبير/صغير)
const User = require('../models/User');
const { isAuth } = require('../utils/middleware');
const router = express.Router();

// جلب الفيديو التالي
router.get('/next-video', isAuth, async (req, res) => {
    try {
        // البحث عن أي فيديو نشط ولم يكتمل العدد
        const video = await Video.findOne({
            active: true,
            $expr: { $lt: ["$completedViews", "$targetViews"] }
        });

        if (video) {
            console.log("Found Video:", video._id); // سيظهر في السجلات
            res.json({ success: true, video: video });
        } else {
            console.log("No videos found");
            res.json({ success: false, message: 'لا توجد فيديوهات متاحة حالياً' });
        }
    } catch (e) {
        console.error("API Error:", e);
        res.json({ success: false, message: 'Server Error' });
    }
});

// استلام المكافأة
router.post('/reward', isAuth, async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.session.userId;
        
        if (!videoId) return res.json({ success: false });

        await Video.findByIdAndUpdate(videoId, { $inc: { completedViews: 1 } });
        const user = await User.findByIdAndUpdate(userId, { $inc: { points: 1 } }, { new: true });

        // فحص الاكتمال
        const video = await Video.findById(videoId);
        if (video && video.completedViews >= video.targetViews) {
            video.active = false;
            await video.save();
        }

        res.json({ success: true, newPoints: user.points });
    } catch (e) {
        res.json({ success: false });
    }
});


// 3. 🛡️ نظام الرعد: استقبال تقارير الغش
router.post('/report-fraud', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { reason, fingerprint } = req.body; // نستلم السبب وبصمة الجهاز

        const user = await User.findById(userId);
        if (!user) return res.json({ success: false });

        // زيادة عداد المخالفات
        user.fraudStrikes += 1;
        user.deviceFingerprint = fingerprint || "Unknown"; // حفظ البصمة

        let action = "warning";
        let message = "";

        // فحص العتبة (3 مخالفات = حظر)
        if (user.fraudStrikes >= 3) {
            user.isBanned = true;
            user.banReason = "تكرار الغش في المشاهدات (نظام الرعد)";
            action = "banned";
            message = "تم حظر حسابك وجهازك نهائياً بسبب تكرار انتهاك السياسات.";
        } else {
            // رسالة تحذير حسب عدد الإنذارات المتبقية
            const left = 3 - user.fraudStrikes;
            message = `لقد قمت بمحاولة تجاوز النظام. بقي لديك ${left} محاولات قبل الحظر النهائي للجهاز.`;
        }

        await user.save();

        // إذا تم الحظر، ندمر الجلسة
        if (user.isBanned) {
            req.session.destroy();
        }

        res.json({ success: true, action, message, strikes: user.fraudStrikes });

    } catch (e) {
        console.error(e);
        res.json({ success: false });
    }
});



module.exports = router;
