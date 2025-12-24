const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // تفاصيل الطلب
    amount: { type: Number, required: true }, // المبلغ الذي دفعه المستخدم
    points: { type: Number, required: true }, // النقاط التي سيحصل عليها
    method: { type: String, required: true }, // طريقة الدفع (ccp, baridimob, usdt)
    packageName: { type: String }, // اسم الباقة (اختياري)

    // إثبات الدفع
    transactionId: { type: String }, // رقم العملية (يكتبه المستخدم)
    proofImage: { type: String }, // رابط صورة الوصل (سنرفعه لاحقاً)

    // حالة الطلب (للمراجعة)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' // معلق حتى تراجعه أنت
    },
    
    adminNote: { type: String }, // ملاحظة في حال الرفض (مثلاً: الوصل غير واضح)

    createdAt: { type: Date, default: Date.now }, // متى طلب الشحن
    processedAt: { type: Date } // متى وافقت عليه أو رفضته
});

module.exports = mongoose.model('Transaction', TransactionSchema);
