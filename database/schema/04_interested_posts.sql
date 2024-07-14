CREATE TABLE interested_posts (
    userId VARCHAR(255),
    postId INT,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (postId) REFERENCES posts(id),
    PRIMARY KEY (userId, postId)
);