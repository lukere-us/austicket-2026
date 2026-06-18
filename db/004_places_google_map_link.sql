-- AUS Ticket Lanka - places: google_map_link
-- Run after 001_init.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE places
  ADD COLUMN google_map_link VARCHAR(500) NULL AFTER address;

