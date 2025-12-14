
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// مودل الصفحات (LandShop)
const Page = mongoose.model('Page', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object,
    createdAt: { type: Date, default: Date.now }
}));

// مودل متاجر الفيديو (VidShop)
const VidStore = mongoose.model('VidStore', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object,
    createdAt: { type: Date, default: Date.now }
}));

// --- API الإحصائيات (عداد المتاجر) ---
app.get('/stats', async (req, res) => {
    const landCount = await Page.countDocuments();
    const vidCount = await VidStore.countDocuments();
    res.json({ total: landCount + vidCount });
});

// --- المسارات الرئيسية (إنشاء جديد) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'builder.html')));
app.get('/tool2', (req, res) => res.sendFile(path.join(__dirname, 'tool2.html')));

// --- مسارات التعديل (Edit Routes) ---
// تعديل LandShop
app.get('/edit/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Store not found');
    
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, html) => {
        if (err) return res.send('Error');
        // نحقن البيانات القديمة في المحرر
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(page.data)};</script></head>`);
        res.send(injected);
    });
});

// تعديل VidShop
app.get('/edit/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('Store not found');

    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        if (err) return res.send('Error');
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(store.data)};</script></head>`);
        res.send(injected);
    });
});

// --- عمليات النشر والحفظ ---
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

// --- عرض المتاجر للزوار ---
app.get('/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Not Found');
    
    const d = page.data;
    // (نفس كود القالب السابق لـ LandShop - مختصر هنا لعدم التكرار، استخدم الكود السابق داخل generateFinalHTML)
    // لتوفير المساحة سأضع علامة مكان القالب، لكن في الواقع يجب أن تضع القالب الكامل هنا كما في الرد السابق
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, builderHtml) => {
         // نستخدم دالة توليد HTML من ملف builder.html لو أمكن، أو ننسخ القالب هنا
         // للسهولة، سنقوم بحقن البيانات في builder.html ونستخدمه كقالب عرض (طريقة ذكية)
         const html = builderHtml
            .replace('// وضع المحرر', `/* وضع العرض */`) // تعطيل وضع المحرر
            .replace('</head>', `<script>window.VIEW_MODE = true; window.PAGE_DATA = ${JSON.stringify(d)};</script></head>`);
         res.send(html);
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
app.listen(port, () => console.log('System Running 🚀'));
