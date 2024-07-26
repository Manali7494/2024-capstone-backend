const axios = require('axios');
const {
  fetchNutritionDetails,
  saveNutritionToDatabase,
  mapPostToNutritionInfo,
  updateNutritionInDatabase,
  fetchNutritionDetailsByPostId,
  checkIfPostIdExists,
  updateOrInsertUserNutritionPreference,
  calculateNutritionalScore,
  calculateLabelScore,
  calculatePostsScores,
  calculateWeightedPostsScores,
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

  describe('checkIfPostIdExists', () => {
    const mockDbClient = {
      query: jest.fn(),
    };

    it('should return true if the postID exists', async () => {
      mockDbClient.query.mockResolvedValueOnce({ rows: [{ exists: true }] });

      const result = await checkIfPostIdExists(mockDbClient, '1');
      expect(result).toBe(true);
      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)', ['1']);
    });

    it('should return false if the postID does not exist', async () => {
      mockDbClient.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

      const result = await checkIfPostIdExists(mockDbClient, '2');
      expect(result).toBe(false);
      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)', ['2']);
    });
  });

  describe('updateOrInsertUserNutritionPreference', () => {
    it('updates an existing user nutrition preference', async () => {
      const mockDbClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ post_id: 1, calories: 200, protein: 10 }],
        }),
      };
      const userId = 1;
      const newValues = {
        calories: 2000,
        fat: 70,
        carbohydrate: 310,
        fiber: 30,
        sugar: 90,
        protein: 50,
        diet_labels: ['Low-Fat'],
        health_labels: ['Vegan'],
      };
      const existingUserPreference = {
        rows: [{
          userId: 1,
          calories: 1800,
          fat: 65,
          carbohydrate: 300,
          fiber: 25,
          sugar: 85,
          protein: 45,
          number_of_items: 1,
          diet_labels: ['Low-Fat'],
          health_labels: ['Vegan'],
        }],
      };

      mockDbClient.query.mockResolvedValueOnce(existingUserPreference);

      await updateOrInsertUserNutritionPreference(mockDbClient, userId, newValues);

      expect(mockDbClient.query).toHaveBeenCalledWith(expect.any(String), [userId]);
      expect(mockDbClient.query)
        .toHaveBeenCalledWith(expect
          .stringContaining('UPDATE user_nutrition_preference'), expect.any(Array));
    });

    it('inserts a new user nutrition preference when not existing', async () => {
      const userId = 2;
      const newValues = {
        calories: 2500,
        fat: 80,
        carbohydrate: 320,
        fiber: 35,
        sugar: 100,
        protein: 60,
        diet_labels: ['Low-Carb'],
        health_labels: ['Paleo'],
      };
      const noExistingUserPreference = { rows: [] };
      const mockDbClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      mockDbClient.query.mockResolvedValueOnce(noExistingUserPreference);

      await updateOrInsertUserNutritionPreference(mockDbClient, userId, newValues);

      expect(mockDbClient.query).toHaveBeenCalledWith(expect.any(String), [userId]);
      expect(mockDbClient.query)
        .toHaveBeenCalledWith(expect
          .stringContaining('INSERT INTO user_nutrition_preference'), expect.any(Array));
    });

    it('should rollback transaction and rethrow error on failure', async () => {
      const mockDbClient = {
        query: jest.fn().mockImplementation((query) => {
          if (query === 'BEGIN') return Promise.resolve();
          throw new Error('Database operation failed');
        }),
      };
      const userId = 1;
      const newValues = {
        calories: 2000,
        fat: 70,
        carbohydrate: 310,
        fiber: 30,
        sugar: 90,
        protein: 50,
        diet_labels: ['Low-Fat'],
        health_labels: ['Vegan'],
      };

      await expect(updateOrInsertUserNutritionPreference(mockDbClient, userId, newValues))
        .rejects.toThrow('Database operation failed');
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
  describe('calculateNutritionalScore', () => {
    it('returns 0 if both post value and preference value are 0', () => {
      expect(calculateNutritionalScore({ calories: 0 }, { calories: 0 }, 'calories')).toBe(0);
    });

    it('calculates correct nutritional score', () => {
      expect(calculateNutritionalScore({ protein: 10 }, { protein: 20 }, 'protein')).toBe(0.6666666666666667);
    });
  });

  describe('calculateLabelScore', () => {
    it('returns 0 if no matching labels are found', () => {
      const post = { diet_labels: ['Low-Carb'] };
      const preferences = { diet_labels: { 'Low-Fat': 1 } };
      expect(calculateLabelScore(post, preferences, 'diet_labels')).toBe(0);
    });

    it('calculates the correct label score when matches are found', () => {
      const post = { health_labels: ['Vegan', 'Peanut-Free'] };
      const preferences = { health_labels: { Vegan: 2, 'Peanut-Free': 1 } };
      expect(calculateLabelScore(post, preferences, 'health_labels')).toBe(3);
    });
  });

  describe('calculatePostsScores', () => {
    it('calculates scores', () => {
      const posts = [
        { calories: 100, fat: 5, diet_labels: ['Low-Carb'] },
        { calories: 200, fat: 20, diet_labels: ['Low-Fat'] },
      ];
      const userPreference = {
        calories: 150,
        fat: 10,
        diet_labels: { 'Low-Carb': 1, 'Low-Fat': 2 },
      };
      const scores = calculatePostsScores(posts, userPreference);
      expect(scores).toEqual([
        expect.objectContaining({
          calories: 0.8,
          carbohydrate: 0,
          dietLabels: 1,
          fat: 0.6666666666666667,
          fiber: 0,
          healthLabels: 0,
          protein: 0,
          sugar: 0,
        }),
        expect.objectContaining({
          calories: 0.8571428571428572,
          carbohydrate: 0,
          dietLabels: 2,
          fat: 0.6666666666666667,
          fiber: 0,
          healthLabels: 0,
          protein: 0,
          sugar: 0,
        }),
      ]);
    });
  });

  describe('calculateWeightedPostsScores', () => {
    it('calculates weighted scores', () => {
      const posts = [
        {
          calories: 100,
          fat: 5,
          sugar: 10,
          carbohydrate: 200,
          protein: 10,
          fiber: 5,
          diet_labels: ['Low-Carb'],
          health_labels: ['Vegan'],
        },
        {
          calories: 200, fat: 20, sugar: 5, diet_labels: ['Low-Fat'], health_labels: ['Peanut-Free'],
        },
      ];
      const userPreference = {
        calories: 150,
        fat: 10,
        sugar: 7,
        carbohydrate: 150,
        protein: 15,
        fiber: 3,
        diet_labels: { 'Low-Carb': 1, 'Low-Fat': 2 },
        health_labels: { Vegan: 2, 'Peanut-Free': 1 },
      };
      const weightedScores = calculateWeightedPostsScores(posts, userPreference);
      expect(weightedScores.map((i) => i.weightedScore))
        .toEqual([1.0748669467787115, 0.9749999999999999]);
    });
  });
});
