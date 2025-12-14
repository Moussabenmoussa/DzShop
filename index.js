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
    data: Object
}));

// مودل الفيديو (VidShop)
const VidStore = mongoose.model('VidStore', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object
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

// --- النشر ---
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

// --- التعديل (Editor Mode) ---
app.get('/edit/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Not Found');
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, html) => {
        // نحقن OLD_DATA و EDIT_MODE
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(page.data)};</script></head>`);
        res.send(injected);
    });
});

app.get('/edit/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('Not Found');
    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        const injected = html.replace('</head>', `<script>window.EDIT_MODE = true; window.OLD_DATA = ${JSON.stringify(store.data)};</script></head>`);
        res.send(injected);
    });
});

// --- العرض المباشر (Live Mode) ---
app.get('/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('Not Found');
    
    fs.readFile(path.join(__dirname, 'builder.html'), 'utf8', (err, html) => {
        // نحقن LIVE_DATA ليقوم builder.html بعرض صفحة الهبوط فقط
        const injected = html.replace('</head>', `<script>window.LIVE_DATA = ${JSON.stringify(page.data)};</script></head>`);
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
app.listen(port, () => console.log('Ready 🚀'));
