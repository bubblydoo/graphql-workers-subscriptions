-- Migration number: 0000 	 2023-01-09T11:56:20.636Z
CREATE TABLE Subscriptions (
    topic VARCHAR(255) NOT NULL,
    "filter" TEXT,
    subscription JSON NOT NULL
);