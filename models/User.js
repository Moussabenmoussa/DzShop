const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // === البيانات الأساسية ===
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // === الميزات القديمة (موجودة كما هي) ===
    // 1. نظام النقاط (المحفظة)
    points: { type: Number, default: 50 }, // رصيد افتراضي للترحيب
    
    // 2. السر الخامس: تصنيف الجودة
    qualityScore: { type: Number, default: 1 }, 
    
    // 3. للأمان: تسجيل آخر IP
    lastIp: { type: String },
    
    // === 🛡️ الميزات الجديدة (نظام الرعد للحماية) ===
    fraudStrikes: { type: Number, default: 0 }, // عدد الإنذارات
    isBanned: { type: Boolean, default: false }, // هل هو محظور؟
    banReason: { type: String }, // سبب الحظر
    deviceFingerprint: { type: String }, // بصمة الجهاز
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
