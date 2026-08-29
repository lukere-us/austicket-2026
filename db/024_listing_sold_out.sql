-- Sold out flag for listing detail Buy tickets CTAs
ALTER TABLE listings
  ADD COLUMN is_sold_out TINYINT(1) NOT NULL DEFAULT 0
  AFTER show_ratings_comments;
