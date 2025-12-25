const express = require('express');
const router = express.Router();
const Fingerprint = require('../models/Fingerprint');
// ❌ أزلنا استدعاء isAuth لأنه لم يعد مطلوباً هنا
// const { isAuth } = require('../utils/middleware'); 

// POST /api/harvest
// استقبال بصمة جديدة وتخزينها (مفتوح للعامة الآن 🔓)
router.post('/harvest', async (req, res) => {
    try {
        const { 
            os, browser, deviceType, 
            screen, hardware, 
            canvasHash, audioHash, userAgent 
        } = req.body;

        // 1. التحقق من وجود البيانات الأساسية
        if (!os || !canvasHash || !userAgent) {
            return res.status(400).json({ success: false, message: "Incomplete Data" });
        }

        // 2. التحقق من التكرار
        const exists = await Fingerprint.findOne({ canvasHash: canvasHash });
        if (exists) {
            return res.json({ success: true, status: "exists" });
        }

        // 3. تحديد المصدر (بأمان)
        // إذا كان المستخدم مسجلاً نأخذ الـ ID، وإذا كان زائراً نضع null
        let sourceUser = null;
        if (req.session && req.session.userId) {
            sourceUser = req.session.userId;
        }

        // 4. تخزين البصمة الجديدة
        await Fingerprint.create({
            // البيانات الخام كما وصلت
            os, browser, deviceType,
            screen, hardware,
            canvasHash, audioHash, userAgent,
            
            // 👇 البيانات المفككة للجوكر
            gpu_renderer: hardware && hardware.renderer ? hardware.renderer : "Generic GPU", 
            cpu_cores: hardware && hardware.concurrency ? hardware.concurrency : 4,
            ram_size: hardware && hardware.memory ? hardware.memory : 8,
            platform: os,

            // تسجيل المصدر (سواء كان عضواً أو مجهولاً)
            harvestedFrom: sourceUser
        });

        console.log(`✅ [Harvester] New Identity Saved from ${sourceUser ? 'Member' : 'Guest'}: ${os}`);
        res.json({ success: true, status: "saved" });

    } catch (e) {
        console.error("Harvest Error:", e);
        // لا نرسل تفاصيل الخطأ للعميل لأسباب أمنية
        res.status(500).json({ success: false });
    }
});

module.exports = router;
