const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // رابط الفيديو
    url: { type: String, required: true },
    videoId: { type: String }, // سنستخرجه من الرابط لاحقاً
    
    // إعدادات الحملة
    targetViews: { type: Number, required: true }, // العدد المطلوب
    completedViews: { type: Number, default: 0 },  // العدد المنفذ


duration: { type: Number, default: 30 }, // المدة بالثواني (الافتراضي 30)



    
    // تكلفة المشاهدة (تتغير حسب الجودة)
    costPerView: { type: Number, default: 1 },
    
    // السر السابع: هل نفرض الفتح عبر التطبيق؟
    mobileOnly: { type: Boolean, default: false },
    
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', VideoSchema);
