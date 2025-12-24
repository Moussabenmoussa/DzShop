const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const { isAuth } = require('../utils/middleware');
// 👇 استدعاء أداة الفحص التقني (TLS Fingerprint)
const { checkVideoLink } = require('../utils/browserMock');

// 1. عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        // نعرض للمستخدم حملاته سواء كانت مقبولة أو قيد المراجعة
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { user, videos: myVideos });
    } catch (e) {
        res.redirect('/');
    }
});

// 2. إضافة حملة جديدة (بوابة التفتيش الذكية 🛡️)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        const { url, targetViews, duration, type, visitType, keyword } = req.body;

        // ============================================================
        // 🛑 المرحلة 1: الفلترة الأمنية (The Gatekeeper)
        // ============================================================
        
        let platform = 'other';
        let status = 'Approved';
        let active = true; // هل تظهر للناس؟

        // قائمة الروابط المختصرة الممنوعة
        const forbiddenShorteners = ['bit.ly', 'tinyurl.com', 'cut.us', 'short.gy', 'goo.gl'];
        if (forbiddenShorteners.some(short => url.includes(short))) {
            return res.send(`<script>alert("🚫 الروابط المختصرة ممنوعة! يرجى وضع الرابط المباشر."); window.location.href="/dashboard";</script>`);
        }

        if (type === 'video') {
            // ✅ سماحية صارمة: يوتيوب وتيك توك فقط
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                platform = 'youtube';
            } else if (url.includes('tiktok.com')) {
                platform = 'tiktok';
            } else {
                // ❌ رفض أي رابط آخر (CPA، إباحي، الخ)
                return res.send(`<script>alert("❌ عذراً! يسمح فقط بروابط YouTube و TikTok في قسم الفيديوهات."); window.location.href="/dashboard";</script>`);
            }
            // الفيديوهات مقبولة فوراً
            status = 'Approved';
            active = true;

        } else if (type === 'website') {
            // ⏳ المواقع تذهب للمراجعة دائماً
            platform = 'website';
            status = 'Pending';
            active = false; // لا تظهر للناس حتى يوافق الأدمن
        }

        // ============================================================
        // 🛑 المرحلة 2: الفحص التقني (هل الرابط يعمل؟)
        // ============================================================
        const isValid = await checkVideoLink(url);
        if (!isValid) {
             return res.send(`<script>alert("⚠️ الرابط لا يعمل! تأكد أنه متاح للعامة."); window.location.href="/dashboard";</script>`);
        }
        
        // ============================================================
        // 💰 المرحلة 3: الحسابات والخصم
        // ============================================================
        let cost = 2; 
        let finalDuration = 30;
        
        // تسعير المدة
        const dur = parseInt(duration);
        if (dur === 60) { cost += 2; finalDuration = 60; }
        else if (dur === 90) { cost += 4; finalDuration = 90; }

        // تسعير النوع (بحث جوجل أغلى)
        if (type === 'website' && visitType === 'search') {
            cost += 2;
        }

        // التحقق من الرصيد
        const user = await User.findById(req.session.userId);
        const totalCost = cost * targetViews;

        if (user.points < totalCost) {
            return res.send(`<script>alert("🚫 رصيدك غير كافي!\\nتحتاج ${totalCost} نقطة."); window.location.href="/dashboard";</script>`);
        }

        // خصم النقاط فوراً (حتى للمواقع المعلقة)
        await User.findByIdAndUpdate(user._id, { $inc: { points: -totalCost } });

        // ============================================================
        // 💾 المرحلة 4: الحفظ في قاعدة البيانات
        // ============================================================
        await Video.create({
            userId: req.session.userId,
            type: type || 'video',
            visitType: (type === 'website') ? visitType : undefined,
            keyword: (type === 'website' && visitType === 'search') ? keyword : undefined,
            url: url,
            targetViews: targetViews,
            duration: finalDuration,
            costPerView: cost,
            
            // البيانات الجديدة التي أضفناها
            platform: platform,
            status: status,
            active: active // false للمواقع، true للفيديوهات
        });

        // رسالة النجاح تختلف حسب النوع
        if (type === 'website') {
            return res.send(`<script>alert("✅ تم استلام موقعك!\\nحالة الطلب: قيد المراجعة (Pending).\\nسيتم نشره بعد مراجعة الإدارة."); window.location.href="/dashboard";</script>`);
        } else {
            return res.redirect('/dashboard');
        }

    } catch (e) {
        console.error(e);
        res.send("Error adding campaign");
    }
});

// 3. صفحة المشاهد الآلي
router.get('/viewer', isAuth, (req, res) => {
    res.render('viewer', { layout: false, user: req.user });
});

// 4. صفحة السجن
router.get('/banned', isAuth, (req, res) => {
    if (!req.user.isBanned) {
        return res.redirect('/dashboard');
    }
    res.render('banned', { layout: false }); 
});

module.exports = router;
