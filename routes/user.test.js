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
  describe('GET /:userId/user_preference', () => {
    const userId = '1';
    const userPreference = {
      userId: '1',
      preference: 'Vegan',
    };

    it('should return user preference', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [userPreference] });
      const response = await request(app).get(`/${userId}/user_preference`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(userPreference);
    });

    it('should return 404 if not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const response = await request(app).get(`/${userId}/user_preference`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ message: 'User preference not found' });
    });

    it('should return an error with database operation failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      const response = await request(app).get(`/${userId}/user_preference`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error retrieving user preference' });
    });
  });

  describe('GET /:userId/profile', () => {
    const userId = '1';
    const userProfile = {
      name: 'Test User',
      id: '1',
      username: 'testUser',
      email: 'test@gmail.com',
      phone: '1234567890',
    };

    it('should return user profile if user is found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ userid: userId, name: 'Test User', username: 'testUser' }] })
        .mockResolvedValueOnce({ rows: [{ contact_email: 'test@gmail.com', contact_number: '1234567890' }] });

      const response = await request(app).get(`/${userId}/profile`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(userProfile);
    });

    it('should return 404 if user is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(`/${userId}/profile`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ message: 'User not found' });
    });

    it('should return 500 if there is a database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app).get(`/${userId}/profile`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error retrieving user profile' });
    });
  });

  describe('POST /:userId/contactInformation', () => {
    const userId = '1';
    const contactInformation = {
      contactEmail: 'test@example.com',
      contactNumber: '1234567890',
    };

    it('should update contact information successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        userId: 'user:123',
      });

      const response = await request(app)
        .put(`/${userId}/contactInformation`)
        .send(contactInformation);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Contact information updated successfully' });
    });

    it('should return an error if the update fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      const response = await request(app)
        .put(`/${userId}/contactInformation`)
        .send(contactInformation);

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error updating contact information' });
    });
  });

  describe('GET /:userId/shop', () => {
    const userId = '1';
    const userPosts = [
      {
        id: 1, title: 'Post 1', content: 'Content 1', userId: '1',
      },
      {
        id: 2, title: 'Post 2', content: 'Content 2', userId: '1',
      },
    ];

    it('should fetch posts successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: userPosts });

      const response = await request(app).get(`/${userId}/shop`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(userPosts);
    });

    it('should return 500 if there is a database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app).get(`/${userId}/shop`);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ message: 'Error fetching posts' });
    });

    it('should fetch posts with interested_posts count', async () => {
      const userInterestedPosts = [
        {
          id: 1, title: 'Post 1', content: 'Content 1', userId: '1', interested_count: 2,
        },
        {
          id: 2, title: 'Post 2', content: 'Content 2', userId: '1', interested_count: 0,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows: userInterestedPosts });

      const response = await request(app).get(`/${userId}/shop`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(userInterestedPosts);
      expect(response.body[0].interested_count).toBe(2);
      expect(response.body[1].interested_count).toBe(0);
    });
  });
});
