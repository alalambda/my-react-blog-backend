import { MongoClient } from 'mongodb';

let db;

async function connectToDb(callback) {
    const client = new MongoClient(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@mongo-db.3r0cruu.mongodb.net/?retryWrites=true&w=majority&appName=mongo-db`);
    await client.connect();

    db = client.db('my-react-blog-db');

    callback();
}

export {
    db,
    connectToDb,
};