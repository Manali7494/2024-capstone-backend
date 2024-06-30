const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
require('dotenv').config();

const { Client } = require('pg');

const app = express();

const corsOptions = {
  origin: ['https://main.d255ptb2b3ezjb.amplifyapp.com', 'https://d1r245uy9zk64m.cloudfront.net', 'http://localhost:3000', 'http://localhost:8081'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Origin', 'Access-Control-Request-Headers', 'Access-Control-Request-Method', 'Content-Type'],
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 8080;
const postRouter = require('./routes/post');
const userRouter = require('./routes/user');

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

app.use('/users', userRouter);

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Error handling
app.use('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
