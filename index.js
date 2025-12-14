const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات
const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// هيكل البيانات
const AppConfig = mongoose.model('AppConfig', new mongoose.Schema({
    id: { type: String, default: 'main_app' },
    title: { type: String, default: 'سينما بلس' },
    videos: [String]
}));

// تهيئة البيانات الافتراضية
async function initDB() {
    const exists = await AppConfig.findOne({ id: 'main_app' });
    if (!exists) {
        await AppConfig.create({
            id: 'main_app',
            title: 'سينما بلس',
            videos: ['TrgR4aYdSZA', 'L9vAQhDEEcs', 'vZtZwVtOFRQ']
        });
    }
}
initDB();

// --- المسارات (Routes) ---

// 1. رابط الزبون (الرئيسية) -> يفتح index.html
app.get('/', (req, res) => {
    // التأكد من أن الملف موجود، وإلا إظهار رسالة خطأ واضحة
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            res.send('<h1>خطأ: لم يتم العثور على ملف index.html</h1><p>تأكد من أنك أنشأت ملفاً باسم <b>index.html</b> في GitHub ووضعت فيه كود التطبيق.</p>');
        }
    });
});

// 2. رابط الأدمن -> يفتح admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API ---
app.get('/api/data', async (req, res) => {
    const data = await AppConfig.findOne({ id: 'main_app' });
    res.json(data || { title: "Error", videos: [] });
});

app.post('/api/update', async (req, res) => {
    await AppConfig.findOneAndUpdate({ id: 'main_app' }, {
        title: req.body.title,
        videos: req.body.videos
    }, { upsert: true });
    res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App Running...'));
