const express = require('express');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/', upload.single('healthy-wealthy-image'), (req, res) => {
  const {
    name, description, price, quantity, purchaseDate, sellerId, expiryDate,
  } = req.body;
  const { file } = req;
  const params = {
    Bucket: 'healthy-wealthy-backend-deploy-2024',
    Key: `${Date.now()}-${name}`,
    Body: fs.createReadStream(file.path),
  };

  const s3 = new req.aws.S3();
  s3.upload(params, (s3Err, data) => {
    if (s3Err) {
      return res.status(500).send(s3Err);
    }
    return req.dbClient.query(`
              INSERT INTO posts (name, description, image_url, price, quantity, purchase_date, seller_id, expiry_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING *
          `, [name, description, data.location, price, quantity, purchaseDate, sellerId, expiryDate])
      .then((sqlResult) => {
        res.status(200).json(sqlResult.rows[0]);
      })
      .catch((dbErr) => {
        res.status(500).json({ error: dbErr.message });
      });
  });
});

module.exports = router;
