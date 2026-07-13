-- Link listings to a Partners-slider organizer (logo id from home_partners settings)
SET NAMES utf8mb4;

ALTER TABLE listings
  ADD COLUMN organizer_partner_id VARCHAR(80) NULL DEFAULT NULL
  AFTER trailer_url;
