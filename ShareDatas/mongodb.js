//MONGODB CONNECTION
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://0.0.0.0:27017/Database';
const client = new MongoClient(url);
const express = require("express");
const app = express();

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("MongoDB Connected!");
    return client.db("Database");
  } catch (err) {
    console.error(err);
  }
};

module.exports = connectToMongoDB;
