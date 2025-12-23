
const express = require('express');
const mongoose = require('mongoose'); // استدعاء mongoose ضروري
const Video = require('../models/Video'); // تأكد أن اسم الملف مطابق (كبير/صغير)
const User = require('../models/User');
const { isAuth } = require('../utils/middleware');
const router = express.Router();

// جلب الفيديو التالي
// جلب الفيديو التالي
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const video = await Video.aggregate([
            { $match: { 
                // 🛑 هام: شرط عدم مشاهدة فيديوهاتي (مُعطل حالياً للتجربة)
                // لتفعيله: قم بحذف علامتي // من بداية السطر التالي 👇
                // userId: { $ne: new mongoose.Types.ObjectId(userId) },

                // 1. يجب أن يكون الفيديو نشطاً
                active: true,
                
                // 2. مقارنة: المشاهدات الحالية أقل من الهدف
                $expr: { $lt: ["$completedViews", "$targetViews"] }
            }},
            { $sample: { size: 1 } } // اختيار عشوائي
        ]);

        if (video.length > 0) {
            console.log("✅ Video Found:", video[0]._id);
            res.json({ success: true, video: video[0] });
        } else {
            const count = await Video.countDocuments();
            res.json({ 
                success: false, 
                message: count === 0 ? 'لا توجد فيديوهات في قاعدة البيانات' : 'جميع الفيديوهات مكتملة أو متوقفة' 
            });
        }
    } catch (e) {
        console.error("API Error:", e);
        res.json({ success: false, message: 'خطأ في السيرفر' });
    }
});

// استلام المكافأة (نظام الضريبة والدفع مقابل المشاهدة)
router.post('/reward', isAuth, async (req, res) => {
    try {
        const { videoId } = req.body;
        const viewerId = req.session.userId; // المعرف الخاص بالمشاهد (أنت)
        
        if (!videoId) return res.json({ success: false });

        // 1. يجب جلب الفيديو أولاً لنعرف من هو صاحبه وكم تكلفته
        const video = await Video.findById(videoId);
        if (!video || !video.active) return res.json({ success: false });

        // 2. === خصم النقاط من صاحب الفيديو (The Tax) ===
        // نأخذ التكلفة المسجلة في الفيديو (أو 2 افتراضياً)
        const cost = video.costPerView || 2; 
        
        // نخصم من صاحب الفيديو (video.userId)
        await User.findByIdAndUpdate(video.userId, { $inc: { points: -cost } });

        // 3. === مكافأة المشاهد (أنت) ===
        // المشاهد يحصل دائماً على 1 نقطة (صافي الربح)
        const viewer = await User.findByIdAndUpdate(viewerId, { $inc: { points: 1 } }, { new: true });

        // 4. تحديث إحصائيات الفيديو
        video.completedViews += 1;

        // فحص الاكتمال
        if (video.completedViews >= video.targetViews) {
            video.active = false; // إيقاف الفيديو عند انتهاء العدد
        }
        await video.save();

        res.json({ success: true, newPoints: viewer.points });
    } catch (e) {
        console.error(e);
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
