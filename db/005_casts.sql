-- -------------------------
-- Cast profiles + listing relations
-- -------------------------

CREATE TABLE IF NOT EXISTS casts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  position VARCHAR(160) NOT NULL,
  image_path VARCHAR(255) NULL,
  description TEXT NULL,
  facebook_url VARCHAR(255) NULL,
  tiktok_url VARCHAR(255) NULL,
  instagram_url VARCHAR(255) NULL,
  wikipedia_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_casts_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listing_casts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id INT UNSIGNED NOT NULL,
  cast_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_listing_cast_pair (listing_id, cast_id),
  KEY idx_listing_casts_listing (listing_id),
  KEY idx_listing_casts_cast (cast_id),
  CONSTRAINT fk_listing_casts_listing
    FOREIGN KEY (listing_id) REFERENCES listings(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_listing_casts_cast
    FOREIGN KEY (cast_id) REFERENCES casts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

