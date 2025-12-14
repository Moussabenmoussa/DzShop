const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// مودل الصفحات
const Page = mongoose.model('Page', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object,
    createdAt: { type: Date, default: Date.now }
}));

// مودل الفيديو
const VidStore = mongoose.model('VidStore', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object,
    createdAt: { type: Date, default: Date.now }
}));

// API العداد
app.get('/stats', async (req, res) => {
    const landCount = await Page.countDocuments();
    const vidCount = await VidStore.countDocuments();
    res.json({ total: landCount + vidCount });
});

// المسارات
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'builder.html')));
app.get('/tool2', (req, res) => res.sendFile(path.join(__dirname, 'tool2.html')));

// تعديل LandShop
app.get('/edit/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Not Found');
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, html) => {
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(page.data)};</script></head>`);
        res.send(injected);
    });
});

// تعديل VidShop
app.get('/edit/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('Not Found');
    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(store.data)};</script></head>`);
        res.send(injected);
    });
});

// النشر
app.post('/publish', async (req, res) => {
    try {
        await Page.findOneAndUpdate({ slug: req.body.slug }, { data: req.body }, { upsert: true, new: true });
        res.json({ success: true });
    } catch { res.json({ success: false }); }
});

app.post('/publish-vid', async (req, res) => {
    try {
        await VidStore.findOneAndUpdate({ slug: req.body.slug }, { data: req.body.data }, { upsert: true, new: true });
        res.json({ success: true });
    } catch { res.json({ success: false }); }
});

// العرض المباشر (حقن البيانات في القالب الأصلي)
app.get('/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Not Found');
    
    // نستخدم نفس القالب الموجود في builder.html
    // الطريقة الأذكى: قراءة builder.html واستخدام الدالة generateFinalHTML الموجودة فيه (لكن هذا صعب من السيرفر)
    // لذا، سنقوم بحقن البيانات في متغير عالمي ونترك الكود الموجود في builder.html يقوم ببناء الصفحة
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, html) => {
        // نستبدل كود window.onload ليبدأ بوضع العرض مباشرة
        const injected = html.replace('window.onload = updatePreview;', `
            window.onload = function() {
                const d = ${JSON.stringify(page.data)};
                document.open();
                document.write(generateFinalHTML(d));
                document.close();
            };
        `);
        res.send(injected);
    });
});

app.get('/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('Not Found');
    
    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        const injected = html.replace('</head>', `<script>window.STORE_DATA = ${JSON.stringify(store.data)};</script></head>`);
        res.send(injected);
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Running 🚀'));
