-- -------------------------
-- Country flags
-- -------------------------

ALTER TABLE countries
  ADD COLUMN flag_image_path VARCHAR(255) NULL AFTER code;

