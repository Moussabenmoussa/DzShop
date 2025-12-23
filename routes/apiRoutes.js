const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware');
const router = express.Router();

// 1. جلب فيديو تالي للمشاهدة
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // البحث عن فيديو:
        // - ليس خاصاً بي (userId ليس أنا)
        // - نشط (active: true)
        // - لم يكتمل العدد المطلوب (completedViews < targetViews)
        // - نختار واحداً عشوائياً ($sample)
        const video = await Video.aggregate([
            { $match: { 
                userId: { $ne: new mongoose.Types.ObjectId(userId) },
                active: true,
                $expr: { $lt: ["$completedViews", "$targetViews"] }
            }},
            { $sample: { size: 1 } }
        ]);

        if (video.length > 0) {
            res.json({ success: true, video: video[0] });
        } else {
            res.json({ success: false, message: 'لا توجد فيديوهات حالياً' });
        }
    } catch (e) {
        res.json({ success: false });
    }
});

// 2. استلام المكافأة (بعد 15 ثانية)
router.post('/reward', isAuth, async (req, res) => {
    const { videoId } = req.body;
    const userId = req.session.userId;

    // === هنا مكان وضع كود كشف الغش (Fraud Guard) لاحقاً ===
    
    // تحديث الفيديو (زيادة مشاهدة)
    const video = await Video.findByIdAndUpdate(videoId, { $inc: { completedViews: 1 } });
    
    // مكافأة المشاهد (زيادة رصيده)
    // السر الخامس: هنا يمكننا فحص QualityScore وإعطاء نقاط أكثر
    const user = await User.findByIdAndUpdate(userId, { $inc: { points: 1 } });

    // فحص: هل اكتمل الفيديو؟ نوقفه
    if (video.completedViews + 1 >= video.targetViews) {
        await Video.findByIdAndUpdate(videoId, { active: false });
    }

    res.json({ success: true, newPoints: user.points + 1 });
});

module.exports = router;
