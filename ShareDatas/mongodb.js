
//MONGODB CONNECTION
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/Database';
const client = new MongoClient(url);
const express = require('express');
const app = express();

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log('MongoDB Connected!');
    return client.db('Database');
  } catch (err) {
    console.error(err);
  }
};

module.exports = connectToMongoDB;



/*
const connectToMongoDB = require('./mongodb.js');

(async () => {
  const db = await connectToMongoDB();
  const commentsCollection = db.collection('comments');
  const comment = { userId: '123', datasetID: '1234', text: 'Comentario del dataset' };
  await commentsCollection.insertOne(comment);
  console.log('Comment saved to database');
  // Close the MongoDB client if needed
})();
*/