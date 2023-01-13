-- Migration number: 0001 	 2023-01-09T12:16:03.163Z
ALTER TABLE Subscriptions 
ADD connectionId VARCHAR(64);