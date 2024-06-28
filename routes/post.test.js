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
const mockPost = { id: 1, title: 'Test Post' };

const mockReadStream = jest.fn().mockResolvedValue({ rows: [mockPost], rowCount: 1 });
fs.createReadStream = mockReadStream;

const mockS3Upload = { upload: jest.fn(), getSignedUrl: jest.fn() };
aws.S3 = jest.fn(() => ({ upload: mockS3Upload }));

const mockQuery = jest.fn();

const app = express();
app.use(express.json());

// app.use
app.use((req, res, next) => {
  req.aws = aws;
  req.dbClient = { query: mockQuery };
  next();
});

app.use('/', postRouter);

describe('Posts', () => {
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

      mockS3Upload.upload.mockImplementation((params, callback) => {
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

  describe('POST /:id', () => {
    it('should properly work for an individual postId', async () => {
      const postId = '123';
      const postData = {
        postId,
        name: 'Test Post',
        description: 'This is a test post',
        price: '10',
        quantity: '1',
        purchaseDate: '2024-01-01',
        sellerId: 'id',
        expiryDate: '2024-12-31',
      };

      mockReadStream.mockReturnValue('testStream');

      mockS3Upload.upload.mockImplementation((params, callback) => {
        callback(null, { location: 'testLocation' });
      });

      mockQuery.mockResolvedValue({ rows: [postData] });

      try {
        await request(app)
          .post(`/${postId}`)
          .send(postData)
          .set('Accept', 'application/json'); // Ensure to set the header to accept JSON
      } catch (err) {
        throw new Error(err);
      }
    });
  });

  describe('GET /:id', () => {
    it('should return 404 for a non-existent ID', async () => {
      const postId = 'non-existent-id';

      const response = await request(app)
        .get(`/posts/${postId}`);

      expect(response.statusCode).toBe(404);
    });

    it('should return a post for a valid ID', async () => {
      const postId = '123';
      const postData = {
        postId,
        name: 'Test Post',
        description: 'This is a test post',
        price: '10',
        quantity: '1',
        purchaseDate: '2024-01-01',
        sellerId: 'id',
        expiryDate: '2024-12-31',
      };

      mockReadStream.mockReturnValue('testStream');

      mockQuery.mockResolvedValue({ rows: [postData] });

      try {
        await request(app)
          .get(`/${postId}`)
          .send(postData);
      } catch (err) {
        throw new Error(err);
      }
    });
  });
  describe('DELETE /:postId', () => {
    it('should delete a post successfully for the given user', async () => {
      const userId = 'user123';
      const postId = '1';

      try {
        await request(app)
          .delete(`/posts/${postId}`)
          .send({ userId });
      } catch (err) {
        throw new Error(err);
      }
    });

    it('should return 400 if user is not logged in', async () => {
      const response = await request(app)
        .delete('/1')
        .send({});
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'User not logged in' });
    });

    it('should return 404 if post is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const response = await request(app)
        .delete('/1')
        .send({ userId: 'user123' })
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');

      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ error: 'Post not found' });
    });

    it('should return 403 if user is not authorized to delete the post', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ seller_id: 'anotherUser' }] });
      const response = await request(app)
        .delete('/1')
        .send({ userId: 'user123' });
      expect(response.statusCode).toBe(403);
      expect(response.body).toEqual({ error: 'User is not authorized to delete this post' });
    });

    it('should delete the post successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ seller_id: 'user123' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', title: 'Test Post', seller_id: 'user123' }] });
      const response = await request(app)
        .delete('/1')
        .send({ userId: 'user123' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Post deleted successfully', deletedPost: { id: '1', title: 'Test Post', seller_id: 'user123' } });
    });

    it('should return 500 if there is a server error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Fake server error'));
      const response = await request(app)
        .delete('/1')
        .send({ userId: 'user123' });
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete post', details: 'Fake server error' });
    });
  });
});
