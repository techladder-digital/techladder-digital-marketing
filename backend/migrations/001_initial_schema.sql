-- 001_initial_schema.sql
-- TechLadder Digital Marketing — initial schema (MySQL 8+, InnoDB, utf8mb4)
-- Safe to run on an empty database. Never drops tables or data.

CREATE TABLE IF NOT EXISTS admins (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120) NOT NULL,
  email              VARCHAR(190) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  role               ENUM('admin','editor') NOT NULL DEFAULT 'editor',
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  token_version      INT UNSIGNED NOT NULL DEFAULT 0,
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until       DATETIME NULL,
  last_login_at      DATETIME NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enquiries (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name                VARCHAR(120) NOT NULL,
  business_name            VARCHAR(160) NULL,
  email                    VARCHAR(190) NOT NULL,
  phone                    VARCHAR(32) NOT NULL,
  project_type             ENUM('digital_marketing','website','software') NOT NULL,
  service_name             VARCHAR(160) NOT NULL,
  budget_range             VARCHAR(60) NULL,
  message                  TEXT NOT NULL,
  preferred_contact_method ENUM('email','whatsapp','both') NOT NULL DEFAULT 'email',
  consent_to_contact       TINYINT(1) NOT NULL,
  enquiry_status           ENUM('new','contacted','in_progress','closed','spam') NOT NULL DEFAULT 'new',
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enquiries_status (enquiry_status),
  KEY idx_enquiries_created (created_at),
  CONSTRAINT chk_enquiries_consent CHECK (consent_to_contact = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_logs (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_id          INT UNSIGNED NOT NULL,
  channel             ENUM('email','whatsapp') NOT NULL,
  -- pending: queued, not yet attempted
  -- skipped: integration not configured
  -- accepted: provider accepted the request (NOT proof of delivery)
  -- sent/delivered/read: confirmed by provider webhook (WhatsApp)
  -- failed: last attempt failed (see next_retry_at for retry schedule)
  delivery_status     ENUM('pending','skipped','accepted','sent','delivered','read','failed') NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(190) NULL,
  error_message       VARCHAR(500) NULL,
  attempt_count       INT UNSIGNED NOT NULL DEFAULT 0,
  next_retry_at       DATETIME NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_enquiry_channel (enquiry_id, channel),
  KEY idx_notification_status (delivery_status),
  KEY idx_notification_retry (next_retry_at),
  KEY idx_notification_provider_id (provider_message_id),
  CONSTRAINT fk_notification_enquiry FOREIGN KEY (enquiry_id)
    REFERENCES enquiries (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name      VARCHAR(120) NOT NULL,
  business_name      VARCHAR(160) NULL,
  service_category   ENUM('digital_marketing','website_software') NOT NULL,
  project_name       VARCHAR(160) NOT NULL,
  rating             TINYINT UNSIGNED NOT NULL,
  feedback_message   TEXT NOT NULL,
  consent_to_publish TINYINT(1) NOT NULL DEFAULT 0,
  moderation_status  ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_moderation (moderation_status, created_at),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(160) NOT NULL,
  category      ENUM('digital_marketing','ai_ad_videos','real_estate_marketing',
                     'website_development','software_development','logo_graphic_design') NOT NULL,
  description   TEXT NOT NULL,
  thumbnail_url VARCHAR(500) NULL,
  project_url   VARCHAR(500) NULL,
  -- is_sample = 1 means a concept/demo piece, always labelled as such publicly
  is_sample     TINYINT(1) NOT NULL DEFAULT 0,
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  is_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_portfolio_public (is_published, category),
  KEY idx_portfolio_featured (is_featured, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_links (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform            ENUM('instagram','facebook','whatsapp','threads','youtube','linkedin') NOT NULL,
  profile_name        VARCHAR(120) NULL,
  profile_url         VARCHAR(500) NULL,
  follower_count      INT UNSIGNED NULL,
  -- manual: entered by an administrator; api: fetched from an official platform API
  count_type          ENUM('manual','api') NOT NULL DEFAULT 'manual',
  api_account_id      VARCHAR(190) NULL,
  last_count_update   DATETIME NULL,
  last_sync_error     VARCHAR(500) NULL,
  is_enabled          TINYINT(1) NOT NULL DEFAULT 0,
  show_follower_count TINYINT(1) NOT NULL DEFAULT 0,
  display_order       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_social_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category      ENUM('digital_marketing','website_software') NOT NULL,
  title         VARCHAR(160) NOT NULL,
  slug          VARCHAR(180) NOT NULL,
  description   VARCHAR(600) NOT NULL,
  details       TEXT NULL,
  icon          VARCHAR(60) NULL,
  image_url     VARCHAR(500) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_slug (slug),
  KEY idx_services_public (is_active, category, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key   VARCHAR(80) NOT NULL,
  setting_value TEXT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id   VARCHAR(64) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin (admin_id, created_at),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id)
    REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
