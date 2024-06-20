const express = require('express');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.post('/upload', upload.single('healthy-wealthy-image'), (req, res) => {
  const { file } = req;
  const params = {
    Bucket: 'healthy-wealthy-backend-deploy',
    Key: `${Date.now()}-${file.originalname}`,
    Body: file.path,
  };

  const s3 = new req.aws.S3();
  s3.upload(params, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    console.log('data.location', data.Location);
    return res.status(200).send(`File uploaded successfully to ${data.Location}`);
  });
});

module.exports = router;
