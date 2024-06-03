const express = require('express');
const AWS = require('aws-sdk');

const app = express();
const port = process.env.PORT || 8080;
const indexRouter = require('./routes/index');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

app.use('/', indexRouter);

app.use('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
