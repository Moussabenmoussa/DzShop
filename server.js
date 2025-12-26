
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// إعداد الوصول للمجلد العام
app.use(express.static(path.join(__dirname, 'public')));

// مسار API لجلب نتائج التجسس من MongoDB
app.get('/api/spy-results', async (req, res) => {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db('dzshop_db'); // نفس الاسم المستخدم في سكربت بايثون
        const products = await db.collection('spy_products').find().sort({ last_updated: -1 }).limit(50).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "خطأ في الاتصال بقاعدة البيانات" });
    } finally {
        await client.close();
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 المنصة تعمل على المنفذ ${PORT}`);
});
