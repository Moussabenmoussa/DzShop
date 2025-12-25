const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Fingerprint = require('../models/Fingerprint'); 
// 🆕 1. استدعاء موديل سجل الزيارات (سننشئه في الخطوة التالية)
const VisitLog = require('../models/VisitLog'); 
const { isAuth } = require('../utils/middleware');
const { checkVideoLink } = require('../utils/browserMock');

// 1. عرض لوحة التحكم (مع سجل الزيارات الحقيقي)
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });

        // 🆕 2. جلب آخر 5 زيارات حقيقية لعرضها في الجدول
        // (نجلب الزيارات العامة للنظام ليرى المستخدم النشاط العام، أو زياراته الخاصة فقط حسب رغبتك)
        // هنا سأجلب آخر 5 زيارات عامة في الموقع لكي يرى المستخدم أن الموقع "حي" ونشيط
        const recentVisits = await VisitLog.find().sort({ timestamp: -1 }).limit(5);

        res.render('dashboard', { user, videos: myVideos, recentVisits });
    } catch (e) {
        console.error(e);
        res.redirect('/');
    }
});

// 2. إضافة حملة جديدة (كما هي بدون تغيير)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        let { url, targetViews, duration, type, visitType, keyword } = req.body; 

        // ... (نفس كود الفلترة والحسابات السابق تماماً) ...
        
        // (اختصاراً للمساحة، الكود هنا هو نفسه الذي اتفقنا عليه سابقاً بجعل الحالة Pending)
        // ...
        
        let platform = 'other';
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
        } else if (type === 'website') {
            platform = 'website';
        }

        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            return res.send(`<script>alert("⚠️ الرابط غير صحيح شكلياً."); window.location.href="/dashboard";</script>`);
        }

        try { const response = await fetch(url, { method: 'HEAD' }); } catch (error) {}

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

        let finalUrl = url; 
        if (type === 'website' && visitType === 'search' && keyword) {
            try {
                const urlObj = new URL(url);
                let domain = urlObj.hostname.replace(/^www\./, '');
                const cleanKeyword = keyword.trim().replace(/\s+/g, '+');
                finalUrl = `https://www.google.com/search?q=${cleanKeyword}+${domain}`;
            } catch (err) { console.error("SEO Error:", err); }
        }

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
            status: 'Pending',
            active: false
        });

        return res.send(`<script>alert("✅ تم استلام حملتك بنجاح!\\nسيتم مراجعتها من قبل الإدارة قبل النشر."); window.location.href="/dashboard";</script>`);

    } catch (e) {
        console.error(e);
        res.send("Error adding campaign");
    }
});

// 3. صفحة المشاهد الآلي (الجوكر) - مع تسجيل الزيارة الحقيقية
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

            // 🆕 3. تسجيل هذه "الهوية" في سجل الزيارات الحية (VisitLog)
            // هذا ما سيجعل الجدول يمتلئ ببيانات حقيقية تتغير مع كل زيارة
            try {
                // تحديد نوع المتصفح من UserAgent لتبسيط العرض
                let browserName = "Chrome";
                if(id.userAgent.includes("Firefox")) browserName = "Firefox";
                if(id.userAgent.includes("Safari") && !id.userAgent.includes("Chrome")) browserName = "Safari";
                if(id.userAgent.includes("Edge")) browserName = "Edge";

                await VisitLog.create({
                    device: id.platform,      // مثال: Win32, Linux armv8l
                    browser: browserName,     // مثال: Chrome
                    source: "Google Search",  // المصدر الثابت (الأورجانيك)
                    status: "Active",
                    timestamp: new Date()
                });
            } catch(logError) {
                console.error("فشل تسجيل الزيارة في السجل:", logError);
            }
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

// ... (بقية المسارات التجريبية)

module.exports = router;
