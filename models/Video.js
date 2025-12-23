const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 1. نوع الحملة الرئيسي
    type: { type: String, enum: ['video', 'website'], default: 'video' },
    
    // 2. تفاصيل المواقع (جديد)
    visitType: { type: String, enum: ['direct', 'search'], default: 'direct' }, // مباشر أو بحث
    keyword: { type: String }, // الكلمة المفتاحية (للبحث فقط)
    
    url: { type: String, required: true },
    videoId: { type: String }, 
    
    targetViews: { type: Number, required: true },
    completedViews: { type: Number, default: 0 },
    
    duration: { type: Number, default: 30 },
    costPerView: { type: Number, default: 2 },
    
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', VideoSchema);
