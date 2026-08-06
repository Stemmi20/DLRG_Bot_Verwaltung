import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

const client = new MongoClient(MONGODB_URI);

await client.connect();
console.log('MongoDB Connected successfully');

const dbList = await client.db().admin().listDatabases();

const db = client.db('User');

const collections = await db.listCollections().toArray();
export const collection = db.collection('User');
