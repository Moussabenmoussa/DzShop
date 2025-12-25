const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Fingerprint = require('../models/Fingerprint'); 
const { isAuth } = require('../utils/middleware');
const { checkVideoLink } = require('../utils/browserMock');

// 1. عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { user, videos: myVideos });
    } catch (e) {
        res.redirect('/');
    }
});

// 2. إضافة حملة جديدة (المحرك الذكي ⚙️)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        let { url, targetViews, duration, type, visitType, keyword } = req.body; 

        // ============================================================
        // 🛑 المرحلة 1: الفلترة الأمنية
        // ============================================================
        let platform = 'other';
        
        // ⚠️ التعديل الجوهري هنا: الحالة الافتراضية أصبحت معلقة للجميع
        let status = 'Pending'; 
        let active = false;     

        const forbiddenShorteners = ['bit.ly', 'tinyurl.com', 'cut.us', 'short.gy', 'goo.gl'];
        if (forbiddenShorteners.some(short => url.includes(short))) {
            return res.send(`<script>alert("🚫 الروابط المختصرة ممنوعة!"); window.location.href="/dashboard";</script>`);
        }

        if (type === 'video') {
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                platform = 'youtube';
            } else if (url.includes('tiktok.com')) {
                platform = 'tiktok';
            } else {
                return res.send(`<script>alert("❌ عذراً! يسمح فقط بروابط YouTube و TikTok."); window.location.href="/dashboard";</script>`);
            }
            // تمت إزالة التفعيل التلقائي
        } else if (type === 'website') {
            platform = 'website';
        }

        // ============================================================
        // 🛑 المرحلة 2: الفحص التقني
        // ============================================================
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            return res.send(`<script>alert("⚠️ الرابط غير صحيح شكلياً."); window.location.href="/dashboard";</script>`);
        }

        // التحقق البسيط من الرابط
        try {
            const response = await fetch(url, { method: 'HEAD' }); // HEAD أخف وأسرع من GET
        } catch (error) {
            // نتجاوز الخطأ لأن بعض المواقع ترفض الروبوتات، وسنقوم بمراجعتها يدوياً في الأدمن
        }

        // ============================================================
        // 💰 المرحلة 3: الحسابات والخصم
        // ============================================================
        let cost = 2; 
        let finalDuration = 30;
        
        const dur = parseInt(duration);
        if (dur === 60) { cost += 2; finalDuration = 60; }
        else if (dur === 90) { cost += 4; finalDuration = 90; }

        if (type === 'website' && visitType === 'search') cost += 2;

        const user = await User.findById(req.session.userId);
        const totalCost = cost * targetViews;

        if (user.points < totalCost) {
            return res.send(`<script>alert("🚫 رصيدك غير كافي!"); window.location.href="/dashboard";</script>`);
        }

        await User.findByIdAndUpdate(user._id, { $inc: { points: -totalCost } });

        // ============================================================
        // 🧠 المرحلة 4: خوارزمية السيو
        // ============================================================
        let finalUrl = url; 

        if (type === 'website' && visitType === 'search' && keyword) {
            try {
                const urlObj = new URL(url);
                let domain = urlObj.hostname.replace(/^www\./, '');
                const cleanKeyword = keyword.trim().replace(/\s+/g, '+');
                finalUrl = `https://www.google.com/search?q=${cleanKeyword}+${domain}`;
            } catch (err) {
                console.error("SEO Error:", err);
            }
        }

        // ============================================================
        // 💾 المرحلة 5: الحفظ
        // ============================================================
        await Video.create({
            userId: req.session.userId,
            type: type || 'video',
            visitType: (type === 'website') ? visitType : undefined,
            keyword: (type === 'website' && visitType === 'search') ? keyword : undefined,
            url: finalUrl, 
            targetViews: targetViews,
            duration: finalDuration,
            costPerView: cost,
            platform: platform,
            status: 'Pending', // 👈 تأكيد الحالة معلقة
            active: false      // 👈 تأكيد غير نشط
        });

        return res.send(`<script>alert("✅ تم استلام حملتك بنجاح!\\nسيتم مراجعتها من قبل الإدارة قبل النشر."); window.location.href="/dashboard";</script>`);

    } catch (e) {
        console.error(e);
        res.send("Error adding campaign");
    }
});

// 3. صفحة المشاهد الآلي (الجوكر)
router.get('/viewer', isAuth, async (req, res) => {
    try {
        const identities = await Fingerprint.aggregate([{ $sample: { size: 1 } }]);
        let jokerData = null;
        if (identities.length > 0) {
            const id = identities[0];
            jokerData = {
                gpu_renderer: id.gpu_renderer,
                cpu_cores: id.cpu_cores,
                ram_size: id.ram_size,
                userAgent: id.userAgent,
                platform: id.platform,
                vendor: "Google Inc. (NVIDIA)" 
            };
        }
        res.render('viewer', { 
            layout: false, 
            user: req.user, 
            jokerIdentity: jokerData 
        });
    } catch (e) {
        res.render('viewer', { layout: false, user: req.user, jokerIdentity: null });
    }
});

// 4. صفحة السجن
router.get('/banned', isAuth, (req, res) => {
    if (!req.user.isBanned) return res.redirect('/dashboard');
    res.render('banned', { layout: false }); 
});

// ... (بقية المسارات التجريبية تبقى كما هي)

module.exports = router;
