const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // 1. إعدادات النقاط العامة
    pointsPrice: { type: Number, default: 1 }, // سعر النقطة الواحدة (مثلاً 1 دينار)
    minDeposit: { type: Number, default: 500 }, // الحد الأدنى للإيداع
    
    // 2. إعدادات المكافآت (للتحكم في اقتصاد الموقع)
    defaultCostPerView: { type: Number, default: 2 }, // كم يخصم من المعلن
    viewerRewardRatio: { type: Number, default: 0.5 }, // نسبة المشاهد من التكلفة (0.5 = 50%)

    // 3. الباقات الثابتة (Packages) - لتظهر في صفحة الشحن
    packages: [
        {
            name: { type: String, required: true }, // اسم الباقة (مثلاً: برونزية)
            price: { type: Number, required: true }, // السعر (1000 دج)
            points: { type: Number, required: true }, // النقاط (1200 نقطة)
            active: { type: Boolean, default: true } // تفعيل/تعطيل
        }
    ],

    // 4. طرق الدفع (معلوماتك التي تظهر للمستخدم)
    paymentMethods: {
        ccp: {
            active: { type: Boolean, default: true },
            name: { type: String, default: "CCP Algérie Poste" },
            info: { type: String, default: "0000000000 00 - NOM PRENOM" } // رقم الحساب والاسم
        },
        baridiMob: {
            active: { type: Boolean, default: true },
            name: { type: String, default: "BaridiMob" },
            info: { type: String, default: "00799999000000000000" } // الـ RIP
        },
        usdt: {
            active: { type: Boolean, default: false }, // معطلة افتراضياً
            name: { type: String, default: "USDT (TRC20)" },
            info: { type: String, default: "PUT_YOUR_WALLET_ADDRESS_HERE" }
        }
    },

    // 5. نظام العروض والتخفيضات
    isSaleActive: { type: Boolean, default: false }, // هل هناك تخفيضات الآن؟
    salePercentage: { type: Number, default: 0 }, // نسبة البونص (مثلاً 20%)

    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);
