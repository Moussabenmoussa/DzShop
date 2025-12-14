const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ DB Connected'))
        .catch(err => console.error('❌ DB Error:', err));
}

const AppConfig = mongoose.model('AppConfig', new mongoose.Schema({
    id: { type: String, default: 'main_app' },
    title: { type: String, default: 'سينما بلس' },
    videos: [String]
}));

async function initDB() {
    if (!mongoUri) return;
    const exists = await AppConfig.findOne({ id: 'main_app' });
    if (!exists) {
        await AppConfig.create({
            id: 'main_app',
            title: 'سينما بلس',
            videos: ['TrgR4aYdSZA', 'L9vAQhDEEcs']
        });
    }
}
initDB();

app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.get('/api/data', async (req, res) => {
    try {
        const data = await AppConfig.findOne({ id: 'main_app' });
        res.json(data || { title: "Cinema", videos: [] });
    } catch (e) { res.json({ title: "Error", videos: [] }); }
});

app.post('/api/update', async (req, res) => {
    try {
        await AppConfig.findOneAndUpdate({ id: 'main_app' }, {
            title: req.body.title,
            videos: req.body.videos
        }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Running on ${port}`));
