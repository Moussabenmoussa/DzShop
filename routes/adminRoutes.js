const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { isAuth } = require('../utils/middleware');

router.get('/', async (req, res) => {
    res.render('admin', { layout: false }); // لا نستخدم القالب العادي
});
// 🔒 ميدل وير بسيط لحماية لوحة التحكم
// (تنبيه: يجب أن تضع الايميل الخاص بك هنا لكي لا يدخل أحد غيرك)
const isAdmin = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await User.findById(req.session.userId);
    // 👇 استبدل هذا الإيميل بإيميلك الشخصي الذي سجلت به في الموقع
    const ADMIN_EMAIL = "safah94899@supdrop.com"; 
    
    if (user && user.email === ADMIN_EMAIL) {
        next();
    } else {
        res.status(403).json({ error: 'Access Denied: Admins Only' });
    }
};

// تطبيق الحماية على كل المسارات التالية
router.use(isAuth, isAdmin);

// ==========================================
// 1. 🛡️ إدارة الحملات (Campaigns Review)
// ==========================================

// جلب كل الحملات المعلقة (Pending)
router.get('/pending-campaigns', async (req, res) => {
    try {
        // نجلب الحملات التي حالتها Pending ونرفق بيانات صاحبها
        const campaigns = await Video.find({ status: 'Pending' })
            .populate('userId', 'email username points')
            .sort({ createdAt: -1 });
            
        res.json({ success: true, campaigns });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// اتخاذ قرار (قبول أو رفض)
router.post('/campaign-action', async (req, res) => {
    try {
        const { videoId, action, reason } = req.body; // action: 'approve' or 'reject'
        const video = await Video.findById(videoId);

        if (!video) return res.json({ success: false, message: 'الحملة غير موجودة' });

        if (action === 'approve') {
            video.status = 'Approved';
            video.active = true;
            await video.save();
            res.json({ success: true, message: '✅ تم نشر الحملة بنجاح' });
        } 
        else if (action === 'reject') {
            video.status = 'Rejected';
            video.active = false;
            video.rejectionReason = reason || "مخالفة الشروط";
            // ⚠️ ملاحظة: لا نقوم بإرجاع النقاط هنا (العقوبة)
            await video.save();
            res.json({ success: true, message: '❌ تم رفض الحملة ومصادرة النقاط' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ==========================================
// 2. 💰 المالية وطلبات الشحن (Finance)
// ==========================================

// جلب طلبات الشحن المعلقة
router.get('/pending-deposits', async (req, res) => {
    try {
        const deposits = await Transaction.find({ status: 'Pending' })
            .populate('userId', 'email username')
            .sort({ createdAt: -1 });
        res.json({ success: true, deposits });
    } catch (e) {
        res.json({ success: false });
    }
});

// معالجة طلب الشحن (قبول = إضافة نقاط)
router.post('/deposit-action', async (req, res) => {
    try {
        const { transactionId, action } = req.body;
        const trx = await Transaction.findById(transactionId);

        if (!trx || trx.status !== 'Pending') {
            return res.json({ success: false, message: 'الطلب غير موجود أو تمت معالجته مسبقاً' });
        }

        if (action === 'approve') {
            // 1. تحديث حالة الطلب
            trx.status = 'Approved';
            trx.processedAt = Date.now();
            await trx.save();

            // 2. إضافة النقاط للمستخدم فوراً
            await User.findByIdAndUpdate(trx.userId, { $inc: { points: trx.points } });

            res.json({ success: true, message: `✅ تم شحن ${trx.points} نقطة للمستخدم` });
        } 
        else {
            trx.status = 'Rejected';
            trx.processedAt = Date.now();
            await trx.save();
            res.json({ success: true, message: '❌ تم رفض طلب الشحن' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ==========================================
// 3. ⚙️ الإعدادات العامة (Settings Control)
// ==========================================

// جلب الإعدادات الحالية لعرضها في اللوحة
router.get('/settings', async (req, res) => {
    try {
        // نجلب الإعدادات أو ننشئ واحدة جديدة إذا لم توجد
        let settings = await Settings.findOne();
        if (!settings) settings = await new Settings().save();
        res.json({ success: true, settings });
    } catch (e) {
        res.json({ success: false });
    }
});

// تحديث الأسعار والباقات
router.post('/update-settings', async (req, res) => {
    try {
        const updates = req.body; // نرسل البيانات الجديدة
        const settings = await Settings.findOne();
        
        // تحديث البيانات
        Object.assign(settings, updates);
        settings.updatedAt = Date.now();
        
        await settings.save();
        res.json({ success: true, message: '✅ تم حفظ الإعدادات' });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ==========================================
// 4. 🚫 إدارة المستخدمين (Users)
// ==========================================

// حظر مستخدم (Banned)
router.post('/ban-user', async (req, res) => {
    try {
        const { userId, reason } = req.body;
        await User.findByIdAndUpdate(userId, { 
            isBanned: true, 
            banReason: reason || "قرار إداري" 
        });
        res.json({ success: true, message: '🚫 تم حظر المستخدم' });
    } catch (e) {
        res.json({ success: false });
    }
});

module.exports = router;
