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

const mapPostToNutritionInfo = (post, nutritionInfo) => {
  const hasMacroNutrients = Object.keys(nutritionInfo.totalNutrients).length;
  return ({
    post_id: post.id,
    calories: nutritionInfo.calories,
    diet_labels: nutritionInfo.dietLabels,
    health_labels: nutritionInfo.healthLabels,
    fat: hasMacroNutrients ? nutritionInfo.totalNutrients.FAT.quantity : 0,
    protein: hasMacroNutrients
      ? nutritionInfo.totalNutrients.PROCNT.quantity : 0,
    carbs: hasMacroNutrients
      ? nutritionInfo.totalNutrients.CHOCDF.quantity : 0,
    sugar: hasMacroNutrients
      ? nutritionInfo.totalNutrients.SUGAR.quantity : 0,
    fiber: hasMacroNutrients
      ? nutritionInfo.totalNutrients.FIBTG.quantity : 0,
  });
};

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

const checkIfPostIdExists = async (dbClient, postId) => {
  const query = 'SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)';
  const values = [postId];
  try {
    const res = await dbClient.query(query, values);
    return res.rows[0].exists;
  } catch (err) {
    console.error('Error checking if postId exists', err);
    throw err;
  }
};
function updateLabelCounts(existingLabels, newLabels) {
  const labels = existingLabels || {};

  newLabels.forEach((label) => {
    if (Object.prototype.hasOwnProperty.call(labels, label)) {
      labels[label] += 1;
    } else {
      labels[label] = 1;
    }
  });

  return labels;
}

async function updateOrInsertUserNutritionPreference(dbClient, userId, newValues) {
  try {
    const {
      calories, fat, carbohydrate, fiber, sugar, protein, diet_labels: dietLabels,
      health_labels: healthLabels,
    } = newValues;

    await dbClient.query('BEGIN');

    // Check if the user already exists
    const selectQuery = 'SELECT * FROM user_nutrition_preference WHERE userId = $1';
    const { rows } = await dbClient.query(selectQuery, [userId]);
    const existing = rows[0];

    // Update an existing user preference
    if (existing) {
      const { number_of_items: numberOfItems } = existing;

      const updatedValues = {
        calories: ((existing.calories * numberOfItems) + Number(calories)) / (numberOfItems + 1),
        fat: ((existing.fat * numberOfItems) + Number(fat)) / (numberOfItems + 1),
        carbohydrate: ((existing.carbohydrate * numberOfItems)
         + Number(carbohydrate)) / (numberOfItems + 1),
        fiber: ((existing.fiber * numberOfItems) + Number(fiber)) / (numberOfItems + 1),
        sugar: ((existing.sugar * numberOfItems) + Number(sugar)) / (numberOfItems + 1),
        protein: ((existing.protein * numberOfItems) + Number(protein)) / (numberOfItems + 1),
        number_of_items: existing.number_of_items + 1,
        diet_labels: updateLabelCounts(existing.diet_labels, dietLabels),
        health_labels: updateLabelCounts(existing.health_labels, healthLabels),
      };

      const updateQuery = `
        UPDATE user_nutrition_preference
        SET calories = $2, fat = $3, carbohydrate = $4, fiber = $5, sugar = $6, protein = $7, number_of_items = $8, diet_labels = $9, health_labels = $10
        WHERE userId = $1
      `;
      await dbClient.query(updateQuery, [userId, ...Object.values(updatedValues)]);
    } else {
      // Insert new user preference
      const insertQuery = `
        INSERT INTO user_nutrition_preference (userId, calories, fat, carbohydrate, fiber, sugar, protein, number_of_items, diet_labels, health_labels)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await dbClient.query(
        insertQuery,
        [userId, calories,
          fat, carbohydrate,
          fiber, sugar, protein,
          1,
          updateLabelCounts(null, dietLabels),
          updateLabelCounts(null, healthLabels)],
      );
    }

    await dbClient.query('COMMIT');
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  }
}

async function fetchUserNutritionPreferenceById(dbClient, userId) {
  try {
    const queryText = 'SELECT * FROM user_nutrition_preference WHERE userId = $1';
    const res = await dbClient.query(queryText, [userId]);
    return res.rows;
  } catch (error) {
    console.error('Error fetching user nutrition preference by ID:', error);
    throw error;
  }
}

// Helper functions for ranking posts based on user preferences
function calculateNutritionalScore(post, preferences, property) {
  const postValue = Number(post[property]) || 0;
  const preferenceValue = Number(preferences[property]) || 0;
  if (postValue === 0 && preferenceValue === 0) return 0;
  const score = Math.abs(postValue - preferenceValue) / (postValue + preferenceValue);
  const relativeScore = 1 - score;
  return relativeScore;
}

function calculateLabelScore(post, preferences, labelType) {
  const preferenceLabels = preferences[labelType] || {};
  const postLabels = post[labelType] || [];
  let score = 0;
  postLabels.forEach((label) => {
    if (label in preferenceLabels) score += preferenceLabels[label];
  });
  return score;
}

function calculatePostsScores(posts, userPreference) {
  return posts.map((post) => {
    const scores = {
      calories: calculateNutritionalScore(post, userPreference, 'calories'),
      fat: calculateNutritionalScore(post, userPreference, 'fat'),
      sugar: calculateNutritionalScore(post, userPreference, 'sugar'),
      carbohydrate: calculateNutritionalScore(post, userPreference, 'carbohydrate'),
      protein: calculateNutritionalScore(post, userPreference, 'protein'),
      fiber: calculateNutritionalScore(post, userPreference, 'fiber'),
      dietLabels: calculateLabelScore(post, userPreference, 'diet_labels'),
      healthLabels: calculateLabelScore(post, userPreference, 'health_labels'),
    };

    return scores;
  });
}

const calculateWeightedPostsScores = (posts, userPreference) => {
  const postsWithScores = calculatePostsScores(posts, userPreference);

  postsWithScores.map((scores) => {
    const weightedScore = (
      scores.calories * 0.35
        + scores.dietLabels * 0.20
        + scores.healthLabels * 0.20
        + scores.fat * 0.05
        + scores.sugar * 0.05
        + scores.carbohydrate * 0.05
        + scores.protein * 0.05
        + scores.fiber * 0.05
    );
    return Number.isNaN(weightedScore) ? 0 : weightedScore;
  });
};

module.exports.fetchNutritionDetails = fetchNutritionDetails;
module.exports.saveNutritionToDatabase = saveNutritionToDatabase;
module.exports.mapPostToNutritionInfo = mapPostToNutritionInfo;
module.exports.updateNutritionInDatabase = updateNutritionInDatabase;
module.exports.fetchNutritionDetailsByPostId = fetchNutritionDetailsByPostId;
module.exports.checkIfPostIdExists = checkIfPostIdExists;
module.exports.updateOrInsertUserNutritionPreference = updateOrInsertUserNutritionPreference;
module.exports.fetchUserNutritionPreferenceById = fetchUserNutritionPreferenceById;
module.exports.calculateWeightedPostsScores = calculateWeightedPostsScores;
module.exports.calculateNutritionalScore = calculateNutritionalScore;
