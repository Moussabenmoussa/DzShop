const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات
const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// هيكل بيانات التطبيق (نخزن الإعدادات والفيديوهات هنا)
const AppConfig = mongoose.model('AppConfig', new mongoose.Schema({
    id: { type: String, default: 'main_app' }, // معرف ثابت
    title: { type: String, default: 'سينما بلس' },
    videos: [String] // مصفوفة معرفات يوتيوب
}));

// --- تهيئة البيانات لأول مرة ---
async function initDB() {
    const exists = await AppConfig.findOne({ id: 'main_app' });
    if (!exists) {
        await AppConfig.create({
            id: 'main_app',
            title: 'سينما بلس',
            videos: ['TrgR4aYdSZA', 'L9vAQhDEEcs', 'vZtZwVtOFRQ'] // فيديوهات افتراضية
        });
    }
}
initDB();

// --- المسارات ---

// 1. واجهة التطبيق للناس (الرئيسية)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. لوحة التحكم لك أنت (Admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API (للربط بين اللوحة والتطبيق) ---

// جلب البيانات (يستخدمها التطبيق واللوحة)
app.get('/api/data', async (req, res) => {
    const data = await AppConfig.findOne({ id: 'main_app' });
    res.json(data);
});

// تحديث البيانات (تستخدمها لوحة التحكم)
app.post('/api/update', async (req, res) => {
    await AppConfig.findOneAndUpdate({ id: 'main_app' }, {
        title: req.body.title,
        videos: req.body.videos
    });
    res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Cinema App Running 🎬'));
