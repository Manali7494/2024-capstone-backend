const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    userId, username, email, name, phoneNumber,
  } = req.body;

  const query = 'INSERT INTO Users (userId, username, email, name, phoneNumber) VALUES ($1, $2, $3, $4, $5)';
  const values = [userId, username, email, name, phoneNumber];
  try {
    await req.dbClient.query(query, values);
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

module.exports = router;
