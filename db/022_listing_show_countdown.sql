-- Show/hide countdown box on listing detail
SET NAMES utf8mb4;

ALTER TABLE listings
  ADD COLUMN show_countdown TINYINT(1) NOT NULL DEFAULT 1
  AFTER organizer_partner_id;
