-- CMS pages: banner image + parent page
SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE cms_pages
  ADD COLUMN banner_image VARCHAR(255) NULL AFTER slug,
  ADD COLUMN parent_id INT UNSIGNED NULL AFTER banner_image,
  ADD KEY idx_cms_pages_parent (parent_id);

ALTER TABLE cms_pages
  ADD CONSTRAINT fk_cms_pages_parent
    FOREIGN KEY (parent_id) REFERENCES cms_pages(id)
    ON DELETE SET NULL;
