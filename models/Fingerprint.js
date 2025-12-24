
const mongoose = require('mongoose');

const FingerprintSchema = new mongoose.Schema({
    // هذه الحقول التي أضفناها لتكون في متناول اليد وبشكل مباشر
    cpu_cores: Number,    
    ram_size: Number,     
    gpu_renderer: String,
    
    // 1. التصنيف الأساسي
    os: { type: String, required: true },       
    browser: { type: String, required: true },  
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], required: true },

    // 2. البصمات الرسومية
    screen: {
        width: Number,
        height: Number,
        colorDepth: Number,
        pixelRatio: Number
    },
    
    // 3. بصمات العتاد (Hardware)
    // أبقِ هذا القسم كما هو لضمان توافق الأكواد القديمة
    hardware: {
        concurrency: Number, 
        memory: Number,      
        vendor: String,      
        renderer: String     
    },

    // 4. الهويات المشفرة (Hashes)
    canvasHash: { type: String, required: true }, 
    audioHash: { type: String },
    
    // 5. البيانات الخام
    userAgent: { type: String, required: true },
    platform: { type: String }, // أضف هذا السطر أيضاً لأنه مهم للجوكر
    timezone: { type: String }, // وهذا السطر أيضاً
    
    // 6. بيانات إدارية
    harvestedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    qualityScore: { type: Number, default: 100 }, 
    lastUsed: { type: Date, default: null }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fingerprint', FingerprintSchema);
