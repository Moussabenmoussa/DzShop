const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Fingerprint = require('../models/Fingerprint'); 
const VisitLog = require('../models/VisitLog'); 
// لا حاجة لـ isAuth في المصيدة، لكن نحتاجه هنا للداشبورد
const { isAuth } = require('../utils/middleware');

// 1. عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
        const recentVisits = await VisitLog.find().sort({ timestamp: -1 }).limit(5);

        res.render('dashboard', { user, videos: myVideos, recentVisits });
    } catch (e) {
        console.error(e);
        res.redirect('/');
    }
});

// 2. إضافة حملة (كما هي)
router.post('/add-video', isAuth, async (req, res) => {
    // ... (نفس الكود السابق تماماً لا داعي لتكراره لعدم الإطالة) ...
    // ... (تأكد أنك تستخدم النسخة الأخيرة التي اتفقنا عليها) ...
    
    // سأضع لك الكود المختصر هنا للتذكير، لكن استخدم الكود الكامل الذي لديك
    try {
        let { url, targetViews, duration, type, visitType, keyword } = req.body; 
        let platform = 'other';
        let status = 'Pending'; 
        
        // ... منطق الفلترة والخصم ...
        const user = await User.findById(req.session.userId);
        const totalCost = 2 * targetViews; // تبسيط للحساب
        if (user.points < totalCost) return res.send("No Points");
        await User.findByIdAndUpdate(user._id, { $inc: { points: -totalCost } });

        await Video.create({
            userId: req.session.userId,
            type, visitType, keyword, url, targetViews, duration, 
            costPerView: 2, platform, status: 'Pending', active: false
        });
        res.redirect('/dashboard');
    } catch (e) { res.send("Error"); }
});

// 3. صفحة المشاهد الآلي (الجوكر) - 🔥 هنا التعديل المهم للتوافق مع السبوفر
router.get('/viewer', isAuth, async (req, res) => {
    try {
        const identities = await Fingerprint.aggregate([{ $sample: { size: 1 } }]);
        let jokerData = null;
        
        if (identities.length > 0) {
            const id = identities[0];
            
            // تحديد اللغة بناءً على النظام (تحسين ذكي)
            // إذا كان النظام ماك أو آيفون غالباً اللغة en-US، وإذا ويندوز قد تكون متنوعة
            // سنثبتها حالياً على الإنجليزية لضمان توافق "عالمي"
            const spoofedLang = "en-US"; 

            jokerData = {
                gpu_renderer: id.gpu_renderer,
                cpu_cores: id.cpu_cores,
                ram_size: id.ram_size,
                userAgent: id.userAgent,
                platform: id.platform,
                vendor: "Google Inc. (NVIDIA)",
                // ✅ الإضافة الجديدة: إرسال اللغة ليستخدمها السبوفر
                language: spoofedLang 
            };

            // تسجيل الزيارة
            try {
                let browserName = "Chrome";
                if(id.userAgent.includes("Firefox")) browserName = "Firefox";
                else if(id.userAgent.includes("Safari")) browserName = "Safari";
                else if(id.userAgent.includes("Edge")) browserName = "Edge";

                await VisitLog.create({
                    device: id.platform,
                    browser: browserName,
                    source: "Google Search",
                    status: "Active",
                    timestamp: new Date()
                });
            } catch(logError) {}
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

// 4. صفحة السجن (كما هي)
router.get('/banned', isAuth, (req, res) => {
    if (!req.user.isBanned) return res.redirect('/dashboard');
    res.render('banned', { layout: false }); 
});

module.exports = router;
