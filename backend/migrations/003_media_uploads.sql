-- 003_media_uploads.sql
-- Media library for files uploaded from the admin panel, and video support for portfolio projects.
-- Additive only: never drops tables or data.

CREATE TABLE IF NOT EXISTS media_files (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind           ENUM('image','video') NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  stored_path    VARCHAR(255) NOT NULL,   -- public path, e.g. /uploads/2026/10/3f9c...e1.jpg
  mime_type      VARCHAR(60) NOT NULL,
  size_bytes     BIGINT UNSIGNED NOT NULL,
  uploaded_by    INT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_path (stored_path),
  KEY idx_media_kind_created (kind, created_at),
  CONSTRAINT fk_media_admin FOREIGN KEY (uploaded_by) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE portfolio_projects
  ADD COLUMN video_url VARCHAR(500) NULL AFTER thumbnail_url;
