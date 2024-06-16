CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    price DECIMAL(10, 2),
    quantity INT,
    purchase_date DATE,
    seller_id VARCHAR(255),
    expiry_date DATE
);