const express = require('express');
const mongoose = require('mongoose'); // ضروري جداً
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware');
const router = express.Router();

// 1. جلب فيديو تالي (وضع التصحيح)
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // فحص 1: هل المستخدم موجود؟
        if (!userId) {
            return res.json({ success: false, reason: "User not logged in" });
        }

        // فحص 2: طباعة معلومات للتحقق في السجلات
        console.log("Searching video for user:", userId);

        // فحص 3: هل توجد أي فيديوهات في قاعدة البيانات أصلاً؟
        const totalVideos = await Video.countDocuments({});
        if (totalVideos === 0) {
            return res.json({ success: false, reason: "Database is empty (0 videos)" });
        }

        // المحاولة: البحث عن الفيديو
        const video = await Video.aggregate([
            { $match: { 
                // الشرط: صاحب الفيديو ليس أنا
                userId: { $ne: new mongoose.Types.ObjectId(userId) },
                // الشرط: الفيديو نشط
                active: true,
                // الشرط: لم يكتمل العدد
                $expr: { $lt: ["$completedViews", "$targetViews"] }
            }},
            { $sample: { size: 1 } }
        ]);

        // النتيجة
        if (video.length > 0) {
            console.log("Video found:", video[0]._id);
            res.json({ success: true, video: video[0] });
        } else {
            // إذا لم يجد فيديو، دعنا نعرف السبب
            // سنقوم بفحص كم فيديو "نشط" موجود
            const activeCount = await Video.countDocuments({ active: true });
            const notMineCount = await Video.countDocuments({ userId: { $ne: userId } });
            
            res.json({ 
                success: false, 
                reason: "No matching video found",
                debug: {
                    totalVideosInDB: totalVideos,
                    activeVideos: activeCount,
                    videosNotMine: notMineCount,
                    message: "تأكد أن الفيديوهات active: true وأنها ليست خاصة بك"
                }
            });
        }

    } catch (e) {
        console.error("Critical Error:", e);
        // هذا السطر سيكشف لنا الخطأ البرمجي إن وجد
        res.json({ success: false, reason: "Server Error (Catch)", error: e.message });
    }
});

// 2. استلام المكافأة
router.post('/reward', isAuth, async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.session.userId;
        
        if (!videoId) return res.json({ success: false, message: "No Video ID" });

        const video = await Video.findByIdAndUpdate(videoId, { $inc: { completedViews: 1 } });
        const user = await User.findByIdAndUpdate(userId, { $inc: { points: 1 } }, { new: true });

        if (video && video.completedViews + 1 >= video.targetViews) {
            await Video.findByIdAndUpdate(videoId, { active: false });
        }

        res.json({ success: true, newPoints: user ? user.points : 0 });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
