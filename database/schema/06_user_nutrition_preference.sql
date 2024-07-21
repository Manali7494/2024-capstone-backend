CREATE TABLE user_nutrition_preference (
    userId VARCHAR(255) PRIMARY KEY,
    number_of_items INT,
    calories DECIMAL,
    fat DECIMAL,
    carbohydrate DECIMAL,
    fiber DECIMAL,
    sugar DECIMAL,
    protein DECIMAL,
    diet_labels JSON,
    health_labels JSON
);