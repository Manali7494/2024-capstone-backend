const express = require('express');
const AWS = require('aws-sdk');
require('dotenv').config();

const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 8080;
const indexRouter = require('./routes/index');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
// Middleware
app.use((req, res, next) => {
  req.aws = AWS;
  next();
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

client.connect()
  .then(() => {
    console.log('Connected to database');
  })
  .catch((err) => {
    console.log('Failed to connect to database', err);
  });

// Routers
app.use('/', indexRouter);

// Error handling
app.use('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
