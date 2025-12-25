const mongoose = require('mongoose');

const VisitLogSchema = new mongoose.Schema({
    device: { type: String, required: true },  // نوع الجهاز (Windows, iPhone...)
    browser: { type: String, required: true }, // المتصفح (Chrome, Safari...)
    source: { type: String, default: "Google Search" }, // المصدر (دائماً SEO)
    status: { type: String, default: "Active" }, // الحالة
    timestamp: { type: Date, default: Date.now } // وقت الزيارة
});

// ⚡ ميزة التنظيف الذاتي:
// هذا السطر يخبر قاعدة البيانات بحذف أي سجل يمر عليه 24 ساعة (86400 ثانية)
// هذا يحافظ على سرعة موقعك ويمنع تراكم البيانات غير المفيدة.
VisitLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('VisitLog', VisitLogSchema);
