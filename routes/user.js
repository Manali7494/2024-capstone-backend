const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    userId, username, email, name, phoneNumber,
  } = req.body;

  const userQuery = 'INSERT INTO Users (userId, username, email, name, phoneNumber) VALUES ($1, $2, $3, $4, $5)';
  const contactQuery = 'INSERT INTO contact_information (userId, contact_email, contact_number) VALUES ($1, $2, $3)';
  const userValues = [userId, username, email, name, phoneNumber];
  const contactValues = [userId, email, phoneNumber];
  try {
    await req.dbClient.query(userQuery, userValues);
    await req.dbClient.query(contactQuery, contactValues);
    res.status(201).json({ message: 'User created successfully', user: req.body });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const query = 'SELECT * FROM Users WHERE userId = $1';
  const values = [userId];

  try {
    const result = await req.dbClient.query(query, values);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

router.get('/:userId/contactInformation', async (req, res) => {
  const { userId } = req.params;
  const query = 'SELECT * FROM contact_information WHERE userId = $1';
  const values = [userId];

  try {
    const result = await req.dbClient.query(query, values);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Contact information not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

router.get('/:userId/user_preference', async (req, res) => {
  const { userId } = req.params;
  const query = 'SELECT * FROM user_nutrition_preference WHERE userId = $1';
  const values = [userId];

  try {
    const result = await req.dbClient.query(query, values);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User preference not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving user preference' });
  }
});

module.exports = router;
