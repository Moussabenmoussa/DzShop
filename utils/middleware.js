const User = require('../models/User'); // استدعاء قاعدة البيانات ضروري للفحص

module.exports = {
    isAuth: async (req, res, next) => {
        // 1. هل توجد جلسة؟
        if (req.session.userId) {
            try {
                // 2. جلب بيانات المستخدم الحقيقية
                const user = await User.findById(req.session.userId);

                if (!user) {
                    // حالة نادرة: الجلسة موجودة لكن المستخدم حُذف من القاعدة
                    req.session.destroy();
                    return res.redirect('/');
                }

                // 3. تمرير بيانات المستخدم للصفحات (عشان تظهر النقاط والاسم والـ Layout)
                res.locals.user = user; 
                req.user = user;

                // 4. === الحارس الذكي (نظام السجن) ===
                if (user.isBanned) {
                    // استثناء: إذا كان ذاهباً لصفحة الحظر أصلاً أو للخروج، دعه يمر
                    // (هذا يمنع التكرار اللانهائي Loop)
                    if (req.originalUrl === '/banned' || req.originalUrl === '/logout') {
                        return next();
                    }
                    // غير ذلك: اقبض عليه وأرسله للسجن
                    return res.redirect('/banned');
                }

                // 5. المستخدم سليم -> تفضل بالدخول
                next();

            } catch (error) {
                console.error("Auth Error:", error);
                res.redirect('/');
            }
        } else {
            // ليس مسجل دخول -> للصفحة الرئيسية
            res.redirect('/');
        }
    }
};
