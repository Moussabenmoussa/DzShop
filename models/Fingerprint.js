const mongoose = require('mongoose');

const FingerprintSchema = new mongoose.Schema({
    // 1. التصنيف الأساسي (للسرعة في البحث)
    os: { type: String, required: true },       // Windows, Android, iOS...
    browser: { type: String, required: true },  // Chrome, Safari...
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], required: true },

    // 2. البصمات الرسومية (الأهم لـ Cloudflare)
    screen: {
        width: Number,
        height: Number,
        colorDepth: Number,
        pixelRatio: Number
    },
    
    // 3. بصمات العتاد (Hardware IDs)
    hardware: {
        concurrency: Number, // عدد الأنوية
        memory: Number,      // الرامات
        vendor: String,      // WebGL Vendor (Intel, Google, etc)
        renderer: String     // WebGL Renderer (اسم كرت الشاشة)
    },

    // 4. الهويات المشفرة (Hashes)
    // سنقوم بتوليد هذه القيم من الجهاز الحقيقي
    canvasHash: { type: String, required: true }, 
    audioHash: { type: String },
    
    // 5. البيانات الخام (للحقن المتقدم لاحقاً)
    userAgent: { type: String, required: true },
    
    // 6. بيانات إدارية
    harvestedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // من هو المستخدم "النظيف" الذي أخذنا منه البصمة؟
    qualityScore: { type: Number, default: 100 }, // درجة الموثوقية
    lastUsed: { type: Date, default: null }, // متى استخدمناها آخر مرة؟
    createdAt: { type: Date, default: Date.now }
});

// فهرسة للبحث السريع (حتى لا يعلق السيرفر عند البحث في الملايين)
FingerprintSchema.index({ os: 1, deviceType: 1 });
FingerprintSchema.index({ canvasHash: 1 }, { unique: true }); // منع التكرار (لا نريد 1000 نسخة من نفس الجهاز)

module.exports = mongoose.model('Fingerprint', FingerprintSchema);
