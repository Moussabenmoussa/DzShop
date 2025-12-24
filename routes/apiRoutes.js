const express = require('express');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const { isAuth } = require('../utils/middleware');
// 👇 الإضافة 1: استدعاء درع الحماية (Rate Limiter)
const { rewardLimiter } = require('../utils/limiter'); 
const router = express.Router();
const Fingerprint = require('../models/Fingerprint'); // 👈 تأكد من وجود هذا السطر في الأعلى



// ⚡ مسار جديد: سحب هوية حقيقية (للحقن)
router.get('/get-identity', isAuth, async (req, res) => {
    try {
        // نختار بصمة عشوائية من قاعدة البيانات
        const identity = await Fingerprint.aggregate([
            { $sample: { size: 1 } }
        ]);

        if (identity.length > 0) {
            // نرسل البيانات المهمة فقط (بدون Hash الكانفس لأنه للقراءة فقط)
            // نرسل العتاد لنقوم بمحاكاته
            res.json({ 
                success: true, 
                data: {
                    userAgent: identity[0].userAgent,
                    screen: identity[0].screen,
                    hardware: identity[0].hardware,
                    // نرسل الـ GPU لكي نخدع النظام
                    renderer: identity[0].hardware.renderer,
                    vendor: identity[0].hardware.vendor
                }
            });
        } else {
            // إذا كانت القاعدة فارغة، نعيد بيانات افتراضية (Fallback)
            res.json({ success: false }); 
        }
    } catch (e) {
        console.error(e);
        res.json({ success: false });
    }
});





// 1. جلب الفيديو التالي (نفس الكود القديم تماماً)
// 1. جلب المهمة التالية (فيديو أو موقع حسب الطلب)
router.get('/next-video', isAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const mode = req.query.mode; // نستلم الوضع: 'video' أو 'website'

        // إعداد فلتر البحث الأساسي
        let matchQuery = { 
            active: true,
            // userId: { $ne: new mongoose.Types.ObjectId(userId) }, // يمكنك تفعيل هذا السطر لاحقاً لمنع المستخدم من رؤية حملاته الخاصة
            $expr: { $lt: ["$completedViews", "$targetViews"] }
        };

        // تخصيص البحث حسب الوضع المختار من الواجهة
        if (mode === 'website') {
            // إذا طلب مواقع: نجلب فقط النوع 'website'
            matchQuery.type = 'website';
        } else {
            // إذا طلب فيديوهات (أو لم يحدد): نجلب النوع 'video' وأيضاً الفيديوهات القديمة التي ليس لها نوع
            matchQuery.$or = [ { type: 'video' }, { type: { $exists: false } } ];
        }

        // جلب مهمة عشوائية واحدة تنطبق عليها الشروط
        const task = await Video.aggregate([
            { $match: matchQuery },
            { $sample: { size: 1 } }
        ]);

        if (task.length > 0) {
            console.log(`✅ Task Found [${mode || 'video'}]:`, task[0]._id);
            res.json({ success: true, video: task[0] });
        } else {
            // رسالة مخصصة حسب الوضع ليعرف المستخدم السبب
            const msg = mode === 'website' ? 'لا توجد مواقع متاحة لزيارتها حالياً' : 'لا توجد فيديوهات متاحة للمشاهدة حالياً';
            res.json({ 
                success: false, 
                message: msg 
            });
        }
    } catch (e) {
        console.error("API Error:", e);
        res.json({ success: false, message: 'خطأ في السيرفر' });
    }
});


// 2. استلام المكافأة (تمت إضافة الحماية + نفس نظام الضريبة القديم)
// 👇 الإضافة 2: وضعنا rewardLimiter هنا لحماية النقاط من السكربتات
// 2. استلام المكافأة (مع توزيع عادل للنقاط)
router.post('/reward', isAuth, rewardLimiter, async (req, res) => {
    try {
        const { videoId } = req.body;
        const viewerId = req.session.userId;
        
        if (!videoId) return res.json({ success: false });

        const video = await Video.findById(videoId);
        // التحقق من أن الحملة موجودة ونشطة
        if (!video || !video.active) return res.json({ success: false });

        // === 1. حساب التكلفة والمكافأة ===
        const cost = video.costPerView || 2; // التكلفة على صاحب الحملة
        
        // المعادلة العادلة: المشاهد يحصل على نصف التكلفة
        // مثال: حملة 30ث (2 نقطة) -> المشاهد يأخذ 1
        // مثال: حملة 60ث (4 نقاط) -> المشاهد يأخذ 2
        // مثال: حملة 90ث (6 نقاط) -> المشاهد يأخذ 3
        const reward = Math.floor(cost / 2); 

        // === 2. تنفيذ الخصم والإضافة ===
        
        // الخصم من صاحب الحملة (المعلن)
        await User.findByIdAndUpdate(video.userId, { $inc: { points: -cost } });

        // مكافأة المشاهد (المنفذ)
        const viewer = await User.findByIdAndUpdate(viewerId, { $inc: { points: reward } }, { new: true });

        // === 3. تحديث حالة الحملة ===
        video.completedViews += 1;
        if (video.completedViews >= video.targetViews) {
            video.active = false; // إيقاف الحملة عند اكتمال العدد
        }
        await video.save();

        // إرجاع الرصيد الجديد للمشاهد لتحديث الواجهة
        res.json({ success: true, newPoints: viewer.points, earned: reward });
        
    } catch (e) {
        console.error("Reward Error:", e);
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
