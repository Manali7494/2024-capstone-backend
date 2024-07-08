const axios = require('axios');
const {
  fetchNutritionDetails,
  saveNutritionToDatabase,
  mapPostToNutritionInfo,
  updateNutritionInDatabase,
  fetchNutritionDetailsByPostId,
} = require('./nutrition');

jest.mock('axios');

describe('Nutrition', () => {
  describe('fetchNutritionDetails', () => {
    it('fetches nutrition details properly', async () => {
      const mockData = {
        data: {
          calories: 100,
          totalWeight: 200,
          dietLabels: [],
          healthLabels: [],
        },
      };

      axios.get.mockResolvedValue(mockData);

      const ingredient = 'apple';

      const result = await fetchNutritionDetails(ingredient);

      expect(axios.get).toHaveBeenCalled();
      expect(result).toEqual(mockData.data);
    });
  });

  describe('saveNutritionToDatabase', () => {
    it('saves nutrition details properly', async () => {
      const mockDbClient = {
        query: jest.fn().mockResolvedValue(true),
      };

      const nutritionDetails = {
        post_id: 1,
        calories: 100,
        diet_labels: ['Low-Fat'],
        health_labels: ['Sugar-Conscious'],
        fat: 0.2,
        carbs: 15,
        fiber: 2,
        sugar: 5,
        protein: 3,
      };

      await saveNutritionToDatabase(mockDbClient, nutritionDetails);

      expect(mockDbClient.query).toHaveBeenCalled();
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.any(String), [
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
    });
  });
  describe('mapPostToNutritionInfo', () => {
    it('correctly maps post and nutrition information', () => {
      const post = {
        id: 1,
        title: 'Delicious Apple',
      };

      const nutritionInfo = {
        calories: 95,
        dietLabels: ['Low-Fat'],
        healthLabels: ['Sugar-Conscious'],
        totalNutrients: {
          FAT: { quantity: 0.3 },
          PROCNT: { quantity: 0.5 },
          CHOCDF: { quantity: 25 },
          SUGAR: { quantity: 19 },
          FIBTG: { quantity: 4.4 },
        },
      };

      const result = mapPostToNutritionInfo(post, nutritionInfo);

      expect(result).toEqual({
        post_id: 1,
        calories: 95,
        diet_labels: ['Low-Fat'],
        health_labels: ['Sugar-Conscious'],
        fat: 0.3,
        protein: 0.5,
        carbs: 25,
        sugar: 19,
        fiber: 4.4,
      });
    });
  });

  describe('updateNutritionInDatabase', () => {
    it('executes the correct SQL query to update nutrition details', async () => {
      const mockDbClient = {
        query: jest.fn().mockResolvedValue({ rowCount: 1 }),
      };

      const nutritionDetails = {
        post_id: 1,
        calories: 200,
        diet_labels: ['Low-Carb'],
        health_labels: ['Peanut-Free'],
        fat: 10,
        carbs: 20,
        fiber: 5,
        sugar: 8,
        protein: 12,
      };

      await updateNutritionInDatabase(mockDbClient, nutritionDetails);

      expect(mockDbClient.query).toHaveBeenCalled();
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.any(String), [
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
    });
  });

  describe('fetchNutritionDetailsByPostId', () => {
    it('returns the correct nutrition details for a given post ID', async () => {
      const mockDbClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ post_id: 1, calories: 200, protein: 10 }],
        }),
      };

      const postId = 1;
      const result = await fetchNutritionDetailsByPostId(mockDbClient, postId);

      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT * FROM nutrition WHERE post_id = $1', [postId]);
      expect(result).toEqual({ post_id: 1, calories: 200, protein: 10 });
    });

    it('returns null if an error occurs', async () => {
      const mockDbClient = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      const postId = 1;
      const result = await fetchNutritionDetailsByPostId(mockDbClient, postId);

      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT * FROM nutrition WHERE post_id = $1', [postId]);
      expect(result).toBeNull();
    });
  });
});
