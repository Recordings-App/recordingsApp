CREATE DATABASE user_database;

CREATE TABLE users (
    name TEXT NOT NULL,
    parent VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    userLimit INTEGER DEFAULT 0,
    type VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    TTL INTEGER NOT NULL DEFAULT 7,
    TTD INTEGER NOT NULL DEFAULT 10,
    permission VARCHAR(25) NOT NULL DEFAULT 'userAdmin',
    createdAt DATE NOT NULL,
    renewedAt DATE,
    allowedUserList JSON
);

CREATE TABLE passwords (
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);