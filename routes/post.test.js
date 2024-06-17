const request = require('supertest');
const express = require('express');
const fs = require('fs');
const aws = require('aws-sdk');
const postRouter = require('./post');

// mocks
jest.mock('multer', () => jest.fn(() => ({
  single: jest.fn(() => (req, _, next) => {
    req.file = {
      filename: 'mockFileName.jpg',
      path: 'uploads/mockFileName.jpg',
      size: 1234,
    };
    next();
  }),
})));

jest.mock('fs');
jest.mock('aws-sdk');

const mockReadStream = jest.fn();
fs.createReadStream = mockReadStream;

const mockS3Upload = jest.fn();
aws.S3 = jest.fn(() => ({ upload: mockS3Upload }));

const mockQuery = jest.fn();
const app = express();

// app.use
app.use((req, res, next) => {
  req.aws = aws;
  req.dbClient = { query: mockQuery };
  next();
});
app.use('/', postRouter);

// test
describe('POST /', () => {
  it('should properly work', async () => {
    const postData = {
      name: 'Test Post',
      description: 'This is a test post',
      price: '10',
      quantity: '1',
      purchaseDate: '2024-01-01',
      sellerId: 'id',
      expiryDate: '2024-12-31',
    };

    mockReadStream.mockReturnValue('testStream');

    mockS3Upload.mockImplementation((params, callback) => {
      callback(null, { location: 'testLocation' });
    });

    mockQuery.mockResolvedValue({ rows: [postData] });

    try {
      await request(app)
        .post('/')
        .send(postData);
    } catch (err) {
      throw new Error(err);
    }
  });
});
