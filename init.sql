CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
);

INSERT INTO items (name, description) VALUES
('Item 1', 'Description for item 1 by David'),
('Item 2', 'Description for item 2 by David'),
('Item 3', 'Description for item 3 by David');
