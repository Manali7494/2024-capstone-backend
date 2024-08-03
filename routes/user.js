const express = require('express');

const router = express.Router();
const bucketName = 'healthy-wealthy-backend-deploy';

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

router.get('/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const userQuery = 'SELECT * FROM users WHERE userid = $1';
  const contactQuery = 'SELECT * FROM contact_information WHERE userid = $1';
  const values = [userId];

  try {
    const userResult = await req.dbClient.query(userQuery, values);
    const contactResult = await req.dbClient.query(contactQuery, values);
    if (userResult.rows.length > 0) {
      const userProfile = userResult.rows[0];
      const contactInfo = contactResult.rows.length > 0 ? contactResult.rows[0] : {};
      res.status(200).json({
        name: userProfile.name,
        id: userProfile.userid,
        username: userProfile.username,
        email: contactInfo.contact_email,
        phone: contactInfo.contact_number,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
});

router.put('/:userId/contactInformation', async (req, res) => {
  const { userId } = req.params;
  const { email, phone } = req.body;

  const contactUpdateQuery = `
    UPDATE contact_information
    SET contact_email = $2, contact_number = $3
    WHERE userid = $1
  `;
  const values = [userId, email, phone];

  try {
    await req.dbClient.query(contactUpdateQuery, values);
    res.status(200).json({ message: 'Contact information updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating contact information' });
  }
});

router.get('/:userId/shop', async (req, res) => {
  const { userId } = req.params;
  const fetchPostsQuery = `
    SELECT p.*, 
            COUNT(ip.postid)::int AS interested_count
    FROM posts p
    LEFT JOIN interested_posts ip ON p.id = ip.postid AND ip.userid = $1
    WHERE p.seller_id = $1
    GROUP BY p.id
  `;
  const values = [userId];

  try {
    const result = await req.dbClient.query(fetchPostsQuery, values);
    const posts = result.rows;

    const postsWithImages = await Promise.all(posts.map(async (post) => {
      if (post.image_url) {
        const s3 = new req.aws.S3();
        const imageUrl = await new Promise((resolve, reject) => {
          s3.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: post.image_url.split('/').pop(),
            Expires: 60 * 5,
          }, (err, url) => {
            if (err) {
              reject(err);
            } else {
              resolve(url);
            }
          });
        });

        return {
          ...post,
          imageUrl,
          purchaseDate: post.purchase_date ? new Date(post.purchase_date).toISOString().split('T')[0] : null,
          expiryDate: post.expiry_date ? new Date(post.expiry_date).toISOString().split('T')[0] : null,
        };
      }

      return {
        ...post,
        purchaseDate: post.purchase_date ? new Date(post.purchase_date).toISOString().split('T')[0] : null,
        expiryDate: post.expiry_date ? new Date(post.expiry_date).toISOString().split('T')[0] : null,
      };
    }));

    res.status(200).json(postsWithImages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

module.exports = router;
