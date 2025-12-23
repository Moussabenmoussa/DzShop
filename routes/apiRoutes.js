
const express = require('express');
const mongoose = require('mongoose'); // <--- هذا السطر كان ناقصاً وهو سبب المشكلة!
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware');
const router = express.Router();

// 1. جلب فيديو تالي للمشاهدة
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // التأكد من أن userId صالح قبل التحويل
        if (!mongoose.Types.ObjectId.isValid(userId)) {
             return res.json({ success: false, message: 'Invalid User ID' });
        }

        // البحث عن فيديو
        const video = await Video.aggregate([
            { $match: { 
                userId: { $ne: new mongoose.Types.ObjectId(userId) }, // استبعاد فيديوهاتي
                active: true,
                $expr: { $lt: ["$completedViews", "$targetViews"] }
            }},
            { $sample: { size: 1 } }
        ]);

        if (video.length > 0) {
            res.json({ success: true, video: video[0] });
        } else {
            res.json({ success: false, message: 'لا توجد فيديوهات متاحة حالياً' });
        }
    } catch (e) {
        console.error("Next-Video Error:", e); // طباعة الخطأ في السجلات لمعرفته
        res.json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 2. استلام المكافأة (بعد انتهاء المؤقت)
router.post('/reward', isAuth, async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.session.userId;

        if (!videoId) return res.json({ success: false });

        // تحديث الفيديو (زيادة مشاهدة)
        const video = await Video.findByIdAndUpdate(videoId, { $inc: { completedViews: 1 } });
        
        if (!video) return res.json({ success: false, message: 'Video not found' });

        // مكافأة المشاهد (زيادة رصيده)
        const user = await User.findByIdAndUpdate(userId, { $inc: { points: 1 } }, { new: true });

        // فحص: هل اكتمل الفيديو؟ نوقفه
        if (video.completedViews + 1 >= video.targetViews) {
            await Video.findByIdAndUpdate(videoId, { active: false });
        }

        res.json({ success: true, newPoints: user.points });
    } catch (e) {
        console.error("Reward Error:", e);
        res.json({ success: false });
    }
});

module.exports = router;
