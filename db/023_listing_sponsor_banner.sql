-- Listing sponsor banner (image + optional link) for detail page right column
SET NAMES utf8mb4;

ALTER TABLE listings
  ADD COLUMN sponsor_banner_image VARCHAR(255) NULL DEFAULT NULL
    AFTER trailer_url,
  ADD COLUMN sponsor_banner_url VARCHAR(500) NULL DEFAULT NULL
    AFTER sponsor_banner_image;
