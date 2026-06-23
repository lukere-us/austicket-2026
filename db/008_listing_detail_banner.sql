-- Wide cinematic background for the public listing detail page (separate from poster/card image).
ALTER TABLE listings
  ADD COLUMN detail_banner_image VARCHAR(255) NULL AFTER banner_image;
