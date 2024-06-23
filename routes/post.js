const express = require('express');
const multer = require('multer');
const fs = require('fs');

const bucketName = 'healthy-wealthy-backend-deploy';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get('/:postId', (req, res) => {
  const { postId } = req.params;
  req.dbClient.query('SELECT * FROM posts WHERE id = $1', [postId])
    .then((sqlResult) => {
      if (sqlResult.rows.length > 0) {
        const post = sqlResult.rows[0];
        const s3 = new req.aws.S3();
        let imageUrl = null;
        if (post.image_url) {
          imageUrl = s3.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: post.image_url.split('/').pop(),
            Expires: 60 * 5,
          });
        }

        res.status(200).json({
          ...post,
          imageUrl,
          purchaseDate: post.purchase_date ? new Date(post.purchase_date).toISOString().split('T')[0] : null,
          expiryDate: post.expiry_date ? new Date(post.expiry_date).toISOString().split('T')[0] : null,
        });
      } else {
        res.status(404).json({ error: 'Post not found' });
      }
    })
    .catch((dbErr) => {
      res.status(500).json({ error: dbErr.message });
    });
});

router.post('/', upload.single('healthy-wealthy-image'), (req, res) => {
  const {
    name, description, price, quantity, purchaseDate, sellerId, expiryDate,
  } = req.body;
  const { file } = req;
  let imageUploadPromise = Promise.resolve({ Location: null });

  if (file) {
    const params = {
      Bucket: bucketName,
      Key: `${Date.now()}-${name}`,
      Body: fs.createReadStream(file.path),
    };

    const s3 = new req.aws.S3();
    imageUploadPromise = new Promise((resolve, reject) => {
      s3.upload(params, (s3Err, data) => {
        if (s3Err) {
          reject(s3Err);
        }
        resolve(data);
      });
    });
  }

  imageUploadPromise.then((imageUrlData) => {
    const query = `
      INSERT INTO posts (name, description, image_url, price, quantity, purchase_date, seller_id, expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    return req.dbClient.query(query, [name, description,
      imageUrlData.Location, price, quantity, purchaseDate,
      sellerId, expiryDate]);
  })
    .then((sqlResult) => {
      res.status(200).json(sqlResult.rows[0]);
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

router.post('/:postId', upload.single('healthy-wealthy-image'), async (req, res) => {
  const { postId } = req.params;
  const {
    name, description, price, quantity, purchaseDate, expiryDate, sellerId,
  } = req.body || {};
  const { file } = req;
  let imageUploadPromise = Promise.resolve({ Location: null });

  if (file) {
    const params = {
      Bucket: bucketName,
      Key: `${Date.now()}-${name}`,
      Body: fs.createReadStream(file.path),
    };

    const s3 = new req.aws.S3();
    imageUploadPromise = new Promise((resolve, reject) => {
      s3.upload(params, (s3Err, data) => {
        if (s3Err) {
          reject(s3Err);
        } else {
          resolve(data);
        }
      });
    });
  }

  try {
    const imageData = await imageUploadPromise;
    const imageUrl = imageData.Location;

    let updateQuery = 'UPDATE posts SET name = $1, description = $2, price = $3, quantity = $4, purchase_date = $5, expiry_date = $6, seller_id = $7';
    const queryParams = [name, description, price, quantity, purchaseDate, expiryDate, sellerId];

    if (imageUrl) {
      updateQuery += ', image_url = $8 WHERE id = $9 RETURNING *';
      queryParams.push(imageUrl, postId);
    } else {
      updateQuery += ' WHERE id = $8 RETURNING *';
      queryParams.push(postId);
    }
    const result = await req.dbClient.query(updateQuery, queryParams);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post', details: error.message });
  }
});
module.exports = router;
