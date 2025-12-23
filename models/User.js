const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // نظام النقاط (المحفظة)
    points: { type: Number, default: 50 }, // رصيد افتراضي للترحيب
    
    // السر الخامس: تصنيف الجودة (1=ضعيف، 2=جيد، 3=ممتاز/موبايل)
    qualityScore: { type: Number, default: 1 }, 
    
    // للأمان: تسجيل آخر IP لمنع تعدد الحسابات
    lastIp: { type: String },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
