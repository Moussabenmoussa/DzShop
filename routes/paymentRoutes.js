const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { isAuth } = require('../utils/middleware');

// إعداد اتصال بايبال بناءً على بيانات لوحة التحكم
async function getPaypalClient() {
    const settings = await Settings.findOne();
    if (!settings || !settings.paypal.active) throw new Error("بوابة بايبال غير مفعلة حالياً");

    const environment = settings.paypal.mode === 'live' 
        ? new paypal.core.LiveEnvironment(settings.paypal.clientId, settings.paypal.clientSecret)
        : new paypal.core.SandboxEnvironment(settings.paypal.clientId, settings.paypal.clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
}

// 1. مسار إنشاء الطلب (يرسله المتصفح عند الضغط على زر بايبال)
router.post('/create-order', isAuth, async (req, res) => {
    try {
        const { packageId } = req.body;
        const settings = await Settings.findOne();
        const pkg = settings.packages.id(packageId);

        if (!pkg) return res.status(404).json({ error: "الباقة غير موجودة" });

        // تحويل السعر للدولار بناءً على سعر الصرف في الإعدادات
        const priceInUSD = (pkg.price / settings.paypal.exchangeRate).toFixed(2);

        const client = await getPaypalClient();
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: priceInUSD
                },
                description: `شحن ${pkg.points} نقطة - Joker System`
            }]
        });

        const order = await client.execute(request);
        res.json({ id: order.result.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. مسار التأكيد النهائي (يتم استدعاؤه بعد أن يدفع المستخدم بنجاح)
router.post('/capture-order', isAuth, async (req, res) => {
    try {
        const { orderID, packageId } = req.body;
        const client = await getPaypalClient();
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});

        const capture = await client.execute(request);

        if (capture.result.status === 'COMPLETED') {
            const settings = await Settings.findOne();
            const pkg = settings.packages.id(packageId);

            // إضافة النقاط للمستخدم في قاعدة البيانات
            const user = await User.findByIdAndUpdate(req.session.userId, {
                $inc: { points: pkg.points }
            }, { new: true });

            // تسجيل العملية في السجل المالي
            await Transaction.create({
                userId: req.session.userId,
                points: pkg.points,
                amount: pkg.price,
                method: 'PayPal (Auto)',
                status: 'Approved',
                transactionId: orderID
            });

            res.json({ success: true, newPoints: user.points });
        } else {
            res.status(400).json({ success: false, message: "فشلت عملية الدفع" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
