import express from 'express';
import { db, connectToDb } from './db.js';
import fs from 'fs';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentials = JSON.parse(
    fs.readFileSync("./credentials.json")
);

// var admin = require("firebase-admin");

// var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '../build')));

app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
})

app.use(async (req, res, next) => {
    const { authtoken } = req.headers;

    if (authtoken) {
        try {
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            return res.sendStatus(400);
        }
    }

    req.user = req.user || {};

    next();
});

app.get('/api/post/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.user;

    const post = await db.collection('posts').findOne({ id: Number(id) });

    if (post) {
        const likeIds = post.likeIds || [];
        const canLike = uid && !likeIds.includes(uid);
        post.canLike = canLike;
        res.json(post);
    } else {
        res.sendStatus(404);
    }
});

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
});

app.put('/api/post/:id/like', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.user;

    const post = await db.collection('posts').findOne({ id: Number(id) });

    if (post) {
        const likeIds = post.likeIds || [];
        const canLike = uid && !likeIds.includes(uid);

        if (canLike) {
            db.collection('posts').updateOne({ id: Number(id) }, {
                $inc: { likes: 1 },
                $push: { likeIds: uid }
            });
        }

        const updatedPost = await db.collection('posts').findOne({ id: Number(id) });
        res.json(updatedPost);
    } else {
        res.sendStatus(404);
    }
});

app.post('/api/post/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const { email } = req.user;

    await db.collection('posts').updateOne({ id: Number(id) }, {
        $push: { comments: { postedBy: email, content } }
    });

    const post = await db.collection('posts').findOne({ id: Number(id) });

    if (post) {
        res.json(post);
    } else {
        res.sendStatus(404);
    }
});

const PORT = process.env.PORT || 8000;

connectToDb(() => {
    console.log('Successfully connected to database');
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
});