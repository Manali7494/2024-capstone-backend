CREATE TABLE nutrition (
    post_id INT PRIMARY KEY,
    health_labels TEXT[],
    diet_labels TEXT[],
    calories DECIMAL,
    fat DECIMAL,
    carbohydrate DECIMAL,
    fiber DECIMAL,
    sugar DECIMAL,
    protein DECIMAL
);