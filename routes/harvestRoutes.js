const express = require('express');
const router = express.Router();
const Fingerprint = require('../models/Fingerprint');
const { isAuth } = require('../utils/middleware');

// POST /api/harvest
// استقبال بصمة جديدة وتخزينها
router.post('/harvest', isAuth, async (req, res) => {
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

        // 3. تخزين البصمة الجديدة (مع تصحيح الأماكن 🛠️)
        await Fingerprint.create({
            // البيانات الخام كما وصلت
            os, browser, deviceType,
            screen, hardware,
            canvasHash, audioHash, userAgent,
            
            // 👇 الإصلاح الجوهري: استخراج البيانات ليراها الجوكر
            gpu_renderer: hardware.renderer || "Generic GPU", // نضع كرت الشاشة في الواجهة
            cpu_cores: hardware.concurrency || 4,            // نضع الأنوية في الواجهة
            ram_size: hardware.memory || 8,                  // نضع الرامات في الواجهة
            platform: os,                                    // نوحد اسم النظام

            harvestedFrom: req.session.userId
        });

        console.log(`✅ [Harvester] New Identity Saved: ${os} | ${hardware.renderer}`);
        res.json({ success: true, status: "saved" });

    } catch (e) {
        console.error("Harvest Error:", e);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
