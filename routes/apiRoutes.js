const express = require('express');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const { isAuth } = require('../utils/middleware');
// 👇 الإضافة 1: استدعاء درع الحماية (Rate Limiter)
const { rewardLimiter } = require('../utils/limiter'); 

const router = express.Router();


// 1. جلب الفيديو التالي (نفس الكود القديم تماماً)
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const video = await Video.aggregate([
            { $match: { 
                // userId: { $ne: new mongoose.Types.ObjectId(userId) }, // معطل للتجربة
                active: true,
                $expr: { $lt: ["$completedViews", "$targetViews"] }
            }},
            { $sample: { size: 1 } }
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


// 2. استلام المكافأة (تمت إضافة الحماية + نفس نظام الضريبة القديم)
// 👇 الإضافة 2: وضعنا rewardLimiter هنا لحماية النقاط من السكربتات
router.post('/reward', isAuth, rewardLimiter, async (req, res) => {
    try {
        const { videoId } = req.body;
        const viewerId = req.session.userId;
        
        if (!videoId) return res.json({ success: false });

        const video = await Video.findById(videoId);
        if (!video || !video.active) return res.json({ success: false });

        // === منطق الضريبة (كما هو) ===
        const cost = video.costPerView || 2; 
        
        // الخصم من المعلن
        await User.findByIdAndUpdate(video.userId, { $inc: { points: -cost } });

        // === مكافأة المشاهد (كما هي) ===
        const viewer = await User.findByIdAndUpdate(viewerId, { $inc: { points: 1 } }, { new: true });

        // تحديث الفيديو
        video.completedViews += 1;
        if (video.completedViews >= video.targetViews) {
            video.active = false;
        }
        await video.save();

        res.json({ success: true, newPoints: viewer.points });
    } catch (e) {
        console.error(e);
        res.json({ success: false });
    }
});


// 3. نظام الرعد: تقارير الغش (نفس الكود القديم تماماً)
router.post('/report-fraud', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { reason, fingerprint } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.json({ success: false });

        user.fraudStrikes += 1;
        user.deviceFingerprint = fingerprint || "Unknown";

        let action = "warning";
        let message = "";

        if (user.fraudStrikes >= 3) {
            user.isBanned = true;
            user.banReason = "تكرار الغش في المشاهدات (نظام الرعد)";
            action = "banned";
            message = "تم حظر حسابك وجهازك نهائياً بسبب تكرار انتهاك السياسات.";
        } else {
            const left = 3 - user.fraudStrikes;
            message = `لقد قمت بمحاولة تجاوز النظام. بقي لديك ${left} محاولات قبل الحظر النهائي للجهاز.`;
        }

        await user.save();

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
