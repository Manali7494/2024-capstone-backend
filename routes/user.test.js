const request = require('supertest');
const express = require('express');
const userRouter = require('./user');

const app = express();

app.use(express.json());

const mockUsers = [
  {
    userId: 'user123', username: 'user123', email: '123@gmail.com', name: 'User 123', phoneNumber: '1234567890',
  },
  {
    userId: 'userabc', username: 'userabc', email: 'abc@gmail.com', name: 'User ABC', phoneNumber: '9876543210',
  },
];
const mockQuery = jest.fn().mockResolvedValue({ rows: mockUsers, rowCount: 2 });

app.use((req, res, next) => {
  req.dbClient = { query: mockQuery };
  next();
});

app.use('/', userRouter);
describe('User Routes', () => {
  describe('POST /user', () => {
    const newUser = {
      userId: '1',
      username: 'testUser',
      email: 'test@example.com',
      name: 'Test User',
      phoneNumber: '1234567890',
    };

    it('should create a user successfully', async () => {
      mockQuery.mockResolvedValueOnce();
      const response = await request(app).post('/').send(newUser);
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({ message: 'User created successfully', user: newUser });
    });

    it('should return an error if the database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      const response = await request(app).post('/').send(newUser);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error' });
    });
  });

  describe('GET /:userId', () => {
    const userId = '1';
    const user = {
      userId: '1',
      username: 'testUser',
      email: 'test@example.com',
      name: 'Test User',
      phoneNumber: '1234567890',
    };

    it('should return a user if found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [user] });
      const response = await request(app).get(`/${userId}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(user);
    });

    it('should return 404 if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const response = await request(app).get(`/${userId}`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ message: 'User not found' });
    });

    it('should return an error if the database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      const response = await request(app).get(`/${userId}`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error' });
    });
  });

  describe('GET /:userId/contactInformation', () => {
    const userId = '1';
    const contactInfo = {
      userId: '1',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      address: '123 Test St',
    };

    it('should return contact information if found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [contactInfo] });
      const response = await request(app).get(`/${userId}/contactInformation`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(contactInfo);
    });

    it('should return 404 if contact information not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const response = await request(app).get(`/${userId}/contactInformation`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ message: 'Contact information not found' });
    });

    it('should return an error if the database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      const response = await request(app).get(`/${userId}/contactInformation`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error' });
    });
  });
});
