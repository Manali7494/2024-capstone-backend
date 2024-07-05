const express = require('express');
const axios = require('axios');

const router = express.Router();

const getOptions = (ingredient) => ({
  params: {
    'nutrition-type': 'logging',
    ingr: ingredient,
  },
  headers: {
    'x-rapidapi-key': process.env.RAPID_API_KEY,
    'x-rapidapi-host': process.env.RAPID_API_HOST,
  },
});

const fetchIngredientDetails = async (ingredient) => {
  const url = 'https://edamam-edamam-nutrition-analysis.p.rapidapi.com/api/nutrition-data';
  const options = getOptions(ingredient);
  const details = await axios.get(url, options);
  return details.data;
};

router.get('/', async (req, res) => {
  try {
    const ingredientDetails = await fetchIngredientDetails('orange');
    res.json(ingredientDetails);
  } catch (error) {
    res.status(500).send('Error fetching data from external API');
  }
});

module.exports = router;
module.exports.fetchIngredientDetails = fetchIngredientDetails;
