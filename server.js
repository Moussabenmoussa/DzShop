const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/spy-results', async (req, res) => {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db('dzshop_db');
        const products = await db.collection('spy_products').find().sort({ last_updated: -1 }).limit(50).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Database Connection Error" });
    } finally {
        await client.close();
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
