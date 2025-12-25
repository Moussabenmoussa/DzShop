const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // 1. إعدادات النقاط العامة
    pointsPrice: { type: Number, default: 1 }, // سعر النقطة الواحدة
    minDeposit: { type: Number, default: 500 }, // الحد الأدنى للإيداع
    currency: { type: String, default: "DZD" }, // العملة الافتراضية
    
    // 2. إعدادات بايبال التلقائية (الإضافة الجديدة)
    paypal: {
        active: { type: Boolean, default: false },
        clientId: { type: String, default: "" },
        clientSecret: { type: String, default: "" },
        mode: { type: String, default: "sandbox" }, // sandbox أو live
        exchangeRate: { type: Number, default: 200 } // سعر الصرف (مثال: 1 دولار = 200 دج)
    },

    // 3. إعدادات المكافآت
    defaultCostPerView: { type: Number, default: 2 }, 
    viewerRewardRatio: { type: Number, default: 0.5 }, 

    // 4. الباقات (Packages)
    packages: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            points: { type: Number, required: true },
            active: { type: Boolean, default: true }
        }
    ],

    // 5. طرق الدفع اليدوية (حافظنا عليها)
    paymentMethods: {
        ccp: {
            active: { type: Boolean, default: true },
            name: { type: String, default: "CCP Algérie Poste" },
            info: { type: String, default: "0000000000 00 - NOM PRENOM" }
        },
        baridiMob: {
            active: { type: Boolean, default: true },
            name: { type: String, default: "BaridiMob" },
            info: { type: String, default: "00799999000000000000" }
        },
        usdt: {
            active: { type: Boolean, default: false },
            name: { type: String, default: "USDT (TRC20)" },
            info: { type: String, default: "PUT_YOUR_WALLET_ADDRESS_HERE" }
        }
    },

    // 6. نظام العروض
    isSaleActive: { type: Boolean, default: false }, 
    salePercentage: { type: Number, default: 0 }, 

    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);
