/* eslint-disable no-console */
const axios = require('axios');

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
const fetchNutritionDetails = async (ingredient) => {
  const url = 'https://edamam-edamam-nutrition-analysis.p.rapidapi.com/api/nutrition-data';
  const options = getOptions(ingredient);
  const details = await axios.get(url, options);
  return details.data;
};

const saveNutritionToDatabase = async (dbClient, nutritionDetails) => {
  const query = `
    INSERT INTO nutrition (
      post_id, calories, diet_labels, health_labels, fat, carbohydrate, fiber, sugar, protein
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  try {
    await dbClient.query(query, [
      nutritionDetails.post_id,
      nutritionDetails.calories,
      nutritionDetails.diet_labels,
      nutritionDetails.health_labels,
      nutritionDetails.fat,
      nutritionDetails.carbs,
      nutritionDetails.fiber,
      nutritionDetails.sugar,
      nutritionDetails.protein,
    ]);
  } catch (e) {
    console.log(e);
  }
};

const mapPostToNutritionInfo = (post, nutritionInfo) => ({
  post_id: post.id,
  calories: nutritionInfo.calories,
  diet_labels: nutritionInfo.dietLabels,
  health_labels: nutritionInfo.healthLabels,
  fat: nutritionInfo.totalNutrients.FAT.quantity,
  protein: nutritionInfo.totalNutrients.PROCNT.quantity,
  carbs: nutritionInfo.totalNutrients.CHOCDF.quantity,
  sugar: nutritionInfo.totalNutrients.SUGAR.quantity,
  fiber: nutritionInfo.totalNutrients.FIBTG.quantity,
});

const updateNutritionInDatabase = async (dbClient, nutritionDetails) => {
  const query = `
    UPDATE nutrition SET
      calories = $2,
      diet_labels = $3,
      health_labels = $4,
      fat = $5,
      carbohydrate = $6,
      fiber = $7,
      sugar = $8,
      protein = $9
    WHERE post_id = $1
  `;
  try {
    await dbClient.query(query, [
      nutritionDetails.post_id,
      nutritionDetails.calories,
      nutritionDetails.diet_labels,
      nutritionDetails.health_labels,
      nutritionDetails.fat,
      nutritionDetails.carbs,
      nutritionDetails.fiber,
      nutritionDetails.sugar,
      nutritionDetails.protein,
    ]);
  } catch (e) {
    console.log(e);
  }
};

const fetchNutritionDetailsByPostId = async (dbClient, postId) => {
  const query = 'SELECT * FROM nutrition WHERE post_id = $1';
  try {
    const result = await dbClient.query(query, [postId]);
    return result.rows[0];
  } catch (e) {
    console.log(e);
    return null;
  }
};

module.exports.fetchNutritionDetails = fetchNutritionDetails;
module.exports.saveNutritionToDatabase = saveNutritionToDatabase;
module.exports.mapPostToNutritionInfo = mapPostToNutritionInfo;
module.exports.updateNutritionInDatabase = updateNutritionInDatabase;
module.exports.fetchNutritionDetailsByPostId = fetchNutritionDetailsByPostId;
