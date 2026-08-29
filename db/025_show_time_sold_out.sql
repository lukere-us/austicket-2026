-- Sold out flag per showtime (disables that time's Buy ticket CTA)
ALTER TABLE show_times
  ADD COLUMN is_sold_out TINYINT(1) NOT NULL DEFAULT 0
  AFTER notes;
