
const mongoose = require('mongoose');

const FingerprintSchema = new mongoose.Schema({
    // 1. البيانات العميقة المباشرة (Deep Hardware)
    cpu_cores: { type: Number, default: 8 },    
    ram_size: { type: Number, default: 8 },     
    gpu_renderer: { type: String, default: "NVIDIA GeForce RTX 3060" },
    
    // 2. التصنيف الأساسي 
    os: { type: String, default: "Unknown" },       
    browser: { type: String, default: "Unknown" },  
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet', 'Unknown'], default: 'Unknown' },

    // 3. البصمات الرسومية
    screen: {
        width: Number,
        height: Number,
        colorDepth: Number,
        pixelRatio: Number
    },
    
    // 4. بصمات العتاد (Hardware Object) للتوافق القديم
    hardware: {
        concurrency: Number, 
        memory: Number,      
        vendor: String,      
        renderer: String     
    },

    // 5. الهويات المشفرة والبيانات الخام
    canvasHash: { type: String }, 
    audioHash: { type: String },
    userAgent: { type: String, required: true },
    platform: { type: String, default: "Win32" },
    timezone: { type: String },
    
    // 6. بيانات إدارية
    harvestedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    qualityScore: { type: Number, default: 100 }, 
    lastUsed: { type: Date, default: null }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fingerprint', FingerprintSchema);
