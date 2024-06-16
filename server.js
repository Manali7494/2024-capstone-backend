const express = require('express');
const AWS = require('aws-sdk');
require('dotenv').config();

const { Client } = require('pg');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 8080;
const postRouter = require('./routes/post');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const client = new Client({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use((req, res, next) => {
  req.aws = AWS;
  req.dbClient = client;
  next();
});

client.connect()
  .then(() => {
    console.log('Connected to database');
  })
  .catch((err) => {
    console.log('Failed to connect to database', err);
  });

// Routers
app.use('/posts', postRouter);

// Error handling
app.use('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
