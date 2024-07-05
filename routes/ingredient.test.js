const express = require('express');
const request = require('supertest');
const axios = require('axios');
const router = require('./ingredient');

jest.mock('axios');

describe('GET /', () => {
  it('should fetch ingredient details successfully', async () => {
    const mockData = {
      data: {
        calories: 100,
        dietLabels: [],
        healthLabels: [],
      },
    };
    axios.get.mockResolvedValue(mockData);

    const app = express();
    app.use('/', router);

    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockData.data);
  });

  it('should handle errors', async () => {
    axios.get.mockRejectedValue(new Error('Error fetching data from external API'));

    const app = express();
    app.use('/', router);

    const response = await request(app).get('/');

    expect(response.statusCode).toBe(500);
    expect(response.text).toEqual('Error fetching data from external API');
  });
});
