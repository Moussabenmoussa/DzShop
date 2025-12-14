
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// مودل لتخزين متاجر الفيديو
const VidStore = mongoose.model('VidStore', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object
}));

// مودل لتخزين صفحات الهبوط (الأداة الأولى)
const Page = mongoose.model('Page', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object
}));

// --- المسارات ---

// 1. الأداة الأولى (LandShop)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'builder.html')));

// 2. الأداة الثانية (VidShop) - صفحة المحرر
app.get('/tool2', (req, res) => res.sendFile(path.join(__dirname, 'tool2.html')));

// نشر متجر الفيديو (VidShop)
app.post('/publish-vid', async (req, res) => {
    try {
        await VidStore.findOneAndUpdate(
            { slug: req.body.slug },
            { data: req.body.data },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// عرض متجر الفيديو المباشر (VidShop Live)
app.get('/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('Store Not Found');

    // نقرأ ملف tool2.html ونحقن فيه البيانات
    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        if (err) return res.status(500).send('Error');
        
        // نحقن البيانات ونفعل وضع الشاشة الكاملة
        const injectedHtml = html.replace(
            '</head>',
            `<script>window.STORE_DATA = ${JSON.stringify(store.data)};</script></head>`
        );
        
        res.send(injectedHtml);
    });
});

// نشر صفحة الهبوط (الأداة الأولى)
app.post('/publish', async (req, res) => { /* ... كود الأداة الأولى ... */ });
app.get('/p/:slug', async (req, res) => { /* ... كود الأداة الأولى ... */ });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server Running'));
