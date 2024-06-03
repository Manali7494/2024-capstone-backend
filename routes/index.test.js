const request = require('supertest');
const express = require('express');
const router = require('./index'); // adjust the path to your router file

const app = express();
app.use('/', router);

describe('GET /', () => {
  it('responds with "Hello World!"', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});
