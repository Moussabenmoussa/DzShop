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

        // 2. التحقق من التكرار (Duplicate Check)
        // إذا كان لدينا هذا الجهاز مسبقاً، لا داعي لتخزينه مرة أخرى لتوفير المساحة
        const exists = await Fingerprint.findOne({ canvasHash: canvasHash });
        if (exists) {
            // يمكننا تحديث حقل "آخر ظهور" فقط
            return res.json({ success: true, status: "exists" });
        }

        // 3. تخزين البصمة الجديدة
        await Fingerprint.create({
            os, browser, deviceType,
            screen, hardware,
            canvasHash, audioHash, userAgent,
            harvestedFrom: req.session.userId // نسجل المصدر للرجوع إليه
        });

        console.log(`✅ [Harvester] New Identity Added: ${os} | ${hardware.renderer}`);
        res.json({ success: true, status: "saved" });

    } catch (e) {
        console.error("Harvest Error:", e);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
