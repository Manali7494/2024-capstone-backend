const request = require('supertest');
const express = require('express');
const fs = require('fs');
const aws = require('aws-sdk');
const postRouter = require('./post');
const {
  fetchNutritionDetailsByPostId,
  checkIfPostIdExists,
} = require('./helpers/nutrition');

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

jest.mock('./helpers/nutrition', () => ({
  fetchNutritionDetails: jest.fn().mockResolvedValue({
    calories: 100,
    protein: 5,
  }),
  saveNutritionToDatabase: jest.fn().mockResolvedValue({
    success: true,
  }),
  mapPostToNutritionInfo: jest.fn().mockImplementation((post, nutritionInfo) => ({
    postId: post.id,
    ...nutritionInfo,
  })),
  updateNutritionInDatabase: jest.fn().mockResolvedValue({
    success: true,
  }),
  fetchNutritionDetailsByPostId: jest.fn().mockResolvedValue({
    postId: 1,
    calories: 100,
    protein: 5,
  }),
  checkIfPostIdExists: jest.fn().mockResolvedValue(true),
}));

jest.mock('fs');
jest.mock('aws-sdk');
const mockPost = { id: 1, title: 'Test Post' };

const mockReadStream = jest.fn().mockResolvedValue({ rows: [mockPost], rowCount: 1 });
fs.createReadStream = mockReadStream;

const mockS3Upload = { upload: jest.fn(), getSignedUrl: jest.fn() };
aws.S3 = jest.fn(() => ({ upload: mockS3Upload }));

const mockPosts = [
  {
    id: 1, title: 'Post 1', content: 'Content 1', purchase_date: new Date('2024-01-01').toISOString(), expiry_date: new Date('2024-12-01').toISOString(),
  },
  {
    id: 2, title: 'Post 2', content: 'Content 2', purchase_date: new Date('2024-01-01').toISOString(), expiry_date: new Date('2024-12-01').toISOString(),
  },
];
const mockQuery = jest.fn().mockResolvedValue({ rows: mockPosts, rowCount: 2 });

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
  describe('GET /', () => {
    it('It should fetch posts without pictures', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([{
        content: 'Content 1',
        expiryDate: '2024-12-01',
        expiry_date: '2024-12-01T00:00:00.000Z',
        id: 1,
        purchaseDate: '2024-01-01',
        purchase_date: '2024-01-01T00:00:00.000Z',
        title: 'Post 1',
      },
      {
        content: 'Content 2',
        expiryDate: '2024-12-01',
        expiry_date: '2024-12-01T00:00:00.000Z',
        id: 2,
        purchaseDate: '2024-01-01',
        purchase_date: '2024-01-01T00:00:00.000Z',
        title: 'Post 2',
      },
      ]);
    });
  });
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

  describe('GET /:postId/nutrition', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 400 if userId is not provided', async () => {
      const response = await request(app).get('/1/nutrition');
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'User not logged in' });
    });

    it('should return 400 for invalid postId', async () => {
      const response = await request(app).get('/abc/nutrition?userId=123');
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid postId' });
    });

    it('should return 404 if post does not exist', async () => {
      checkIfPostIdExists.mockResolvedValue(false);
      const response = await request(app).get('/999/nutrition?userId=123');
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ error: 'Post does not exist' });
    });

    it('should fetch nutrition details for a valid postId', async () => {
      checkIfPostIdExists.mockResolvedValue(true);
      fetchNutritionDetailsByPostId.mockResolvedValue({
        calories: 200,
        protein: 10,
      });
      const response = await request(app).get('/1/nutrition?userId=123');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        calories: 200,
        protein: 10,
      });
    });

    it('should handle errors gracefully', async () => {
      checkIfPostIdExists.mockRejectedValue(new Error('Database error'));
      const response = await request(app).get('/1/nutrition?userId=123');
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch nutrition details', details: 'Database error' });
    });
  });

  describe('POST /:postId/interested', () => {
    it('should add interest successfully', async () => {
      const postId = '1';
      const userId = 'user123';
      mockQuery.mockResolvedValueOnce({ rows: [{ userId, postId }] });

      const response = await request(app)
        .post(`/${postId}/interested`)
        .send({ userId });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Interest added successfully' });
    });

    it('should return an error if the database query fails', async () => {
      const postId = '2';
      const userId = 'user456';

      mockQuery.mockRejectedValueOnce(new Error('Failed to update interest'));

      const response = await request(app)
        .post(`/${postId}/interested`)
        .send({ userId });

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({
        details: 'Failed to update interest',
        error: 'Failed to update interest',
      });
    });
  });

  describe('POST /:postId/interested', () => {
    const postId = '1';
    const userId = 'user123';

    it('should add interest successfully', async () => {
      mockQuery.mockResolvedValueOnce();

      const response = await request(app)
        .post(`/${postId}/interested`)
        .send({ userId });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Interest added successfully' });
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO interested_posts (userId, postId) VALUES ($1, $2)',
        [userId, postId],
      );
    });

    it('should return an error if the database query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app)
        .post(`/${postId}/interested`)
        .send({ userId });

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update interest', details: 'Query failed' });
    });
  });
});
