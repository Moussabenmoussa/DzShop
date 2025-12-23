const rateLimit = require('express-rate-limit');

// 1. الحماية العامة (للطلبات العادية)
// يسمح بـ 100 طلب كل 15 دقيقة لكل IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "⛔ تم حظر IP الخاص بك مؤقتاً بسبب كثرة الطلبات. حاول لاحقاً."
});

// 2. حماية تسجيل الدخول (ضد تخمين الباسورد)
// يسمح بـ 5 محاولات فقط في الساعة
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 10, 
    message: "⛔ محاولات دخول كثيرة جداً. تم تجميد الدخول لهذا الجهاز لمدة ساعة."
});

// 3. حماية المكافآت (أهم سر لمنع سرقة النقاط) 🛡️💰
// بما أن الفيديو يأخذ 30 ثانية على الأقل، فمن المستحيل أن يطلب شخص مكافأة مرتين في دقيقة واحدة
// نسمح بـ 3 مكافآت في الدقيقة (للاحتياط) فقط
const rewardLimiter = rateLimit({
    windowMs: 60 * 1000, // دقيقة واحدة
    max: 3, // 3 طلبات فقط
    message: { success: false, message: "⚠️ توقف! أنت تطلب المكافآت بسرعة غير بشرية." },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, rewardLimiter };
