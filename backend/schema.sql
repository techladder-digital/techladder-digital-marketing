-- =====================================================================
-- schema.sql — TechLadder Digital Marketing (MySQL 8+)
-- Consolidated schema + reference data for a FRESH install.
-- Equivalent to running migrations/001, 002 and 003. For upgrades, use:
--     npm run migrate
-- This file never drops tables or data.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS techladder_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE techladder_db;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(190) NOT NULL PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- 002_reference_data.sql
-- Reference content: service catalogue, social platform rows (disabled, empty),
-- and default site settings. Uses INSERT IGNORE so it never overwrites admin edits.
-- No portfolio projects, reviews, statistics or follower counts are seeded.

-- ---------------------------------------------------------------- services
INSERT IGNORE INTO services (category, title, slug, description, details, icon, display_order) VALUES
('digital_marketing','AI Advertisement Videos','ai-advertisement-videos',
 'Short advertisement videos produced with AI-assisted scripting, voice-over and visuals for social and digital ad placements.',
 'We plan the concept with you, draft the script, produce the video using AI-assisted tools and human editing, and deliver formats sized for Instagram, Facebook, YouTube and other placements. Revisions are agreed in the project scope.',
 'smart_display',10),
('digital_marketing','Real Estate Marketing','real-estate-marketing',
 'Marketing creatives, property walkthrough videos and lead-capture campaigns for builders, agents and property developers.',
 'Property listing creatives, project launch campaigns, walkthrough and drone-style video edits (footage supplied or arranged), landing pages and enquiry capture tailored to real estate projects.',
 'home_work',20),
('digital_marketing','Social Media Marketing','social-media-marketing',
 'Planning, content and day-to-day management of your brand across social media platforms.',
 'A content calendar, post design, captions, scheduling and monthly reporting based on the platform analytics available to your account.',
 'campaign',30),
('digital_marketing','Instagram Marketing','instagram-marketing',
 'Reels, carousels, stories and profile optimisation focused on reaching and engaging your audience on Instagram.',
 'Profile and highlight setup, reel and carousel production, hashtag and caption planning, and optional paid promotion managed through Meta Ads.',
 'photo_camera',40),
('digital_marketing','Facebook Marketing','facebook-marketing',
 'Facebook page management, community posts and campaign creatives for local and online businesses.',
 'Page setup and optimisation, regular posting, event and offer posts, and coordination with Meta Ads campaigns where required.',
 'thumb_up',50),
('digital_marketing','Threads Marketing','threads-marketing',
 'Conversational text-first content to build your brand voice on Threads.',
 'Brand voice guidelines, post drafting and scheduling, and cross-promotion with your Instagram presence.',
 'alternate_email',60),
('digital_marketing','YouTube Marketing','youtube-marketing',
 'Channel setup, video optimisation, thumbnails and Shorts to help your videos reach the right viewers.',
 'Channel branding, titles, descriptions, thumbnails, playlists, Shorts repurposing and optional YouTube ad campaigns via Google Ads.',
 'play_circle',70),
('digital_marketing','LinkedIn Marketing','linkedin-marketing',
 'Company page and founder-led content for B2B visibility on LinkedIn.',
 'Company page optimisation, thought-leadership posts, document carousels and optional LinkedIn ad campaign setup.',
 'work',80),
('digital_marketing','Google Ads','google-ads',
 'Search, display and video campaigns set up and managed in your own Google Ads account.',
 'Keyword research, campaign structure, ad copy, conversion tracking setup and regular optimisation. Ad spend is paid directly by you to Google.',
 'ads_click',90),
('digital_marketing','Meta Ads','meta-ads',
 'Facebook and Instagram ad campaigns with audience targeting and creative testing.',
 'Campaign structure, audience setup, creative variations, pixel/conversions API guidance and performance reviews. Ad spend is paid directly by you to Meta.',
 'track_changes',100),
('digital_marketing','Search Engine Optimization (SEO)','search-engine-optimization',
 'On-page, technical and local SEO improvements to make your website easier for search engines and visitors to understand.',
 'Site audit, keyword mapping, on-page fixes, Google Business Profile optimisation and content recommendations. Search rankings depend on many factors and cannot be guaranteed.',
 'travel_explore',110),
('digital_marketing','Logo Design','logo-design',
 'Original logo concepts and a final logo pack in the formats you need for print and digital use.',
 'Discovery brief, multiple initial concepts, revisions and final files (SVG, PNG, PDF) with basic colour and usage notes.',
 'draw',120),
('digital_marketing','Graphic Design','graphic-design',
 'Brochures, flyers, banners, social creatives and other marketing graphics in your brand style.',
 'Print and digital layouts, brand-consistent templates and print-ready file preparation.',
 'palette',130),
('digital_marketing','Promotional Video Production','promotional-video-production',
 'Promotional and explainer videos for products, services, events and launches.',
 'Script, storyboard, editing, motion graphics, music licensing guidance and export for each platform you plan to use.',
 'movie',140),
('digital_marketing','Social Media Content Creation','social-media-content-creation',
 'Ready-to-post images, reels and captions created in batches for your channels.',
 'Monthly content packs designed to your brand guidelines, with captions and suggested posting schedule.',
 'auto_awesome',150),

('website_software','Business Website Development','business-website-development',
 'Fast, responsive business websites that present your services clearly and make it easy for customers to contact you.',
 'Information architecture, responsive design, contact forms, basic on-page SEO setup, analytics integration and deployment to your hosting.',
 'language',10),
('website_software','E-commerce Website Development','ecommerce-website-development',
 'Online stores with product catalogues, carts, payment gateway integration and order management.',
 'Catalogue and inventory structure, payment gateway integration with your merchant account, shipping and tax configuration, and admin training.',
 'shopping_cart',20),
('website_software','Custom Web Application Development','custom-web-application-development',
 'Web applications built around your workflows — portals, dashboards, booking systems and more.',
 'Requirement analysis, UI/UX, Angular frontends, Node.js APIs and MySQL databases, with testing and deployment.',
 'web',30),
('website_software','Software Development','software-development',
 'Custom software for specific business problems, from internal tools to customer-facing products.',
 'Scoping, architecture, iterative development, testing, documentation and handover.',
 'code',40),
('website_software','Business Management Software','business-management-software',
 'Software to manage customers, billing, inventory, staff and operations in one place.',
 'CRM, invoicing, inventory, HR and reporting modules configured or built to match how your business runs.',
 'dashboard',50),
('website_software','Website Maintenance','website-maintenance',
 'Ongoing updates, security patches, backups and content changes for your website.',
 'Scheduled updates, uptime checks, backup verification, minor content edits and issue fixes under an agreed maintenance plan.',
 'build',60),
('website_software','Software Maintenance','software-maintenance',
 'Bug fixes, dependency upgrades and small enhancements for existing software.',
 'Issue triage, fixes, dependency and security updates, performance improvements and change documentation.',
 'settings_suggest',70),
('website_software','Website Redesign','website-redesign',
 'A modern, mobile-friendly redesign of your existing website while preserving important content and URLs.',
 'Content and URL audit, new design, redirects for changed URLs, performance improvements and relaunch support.',
 'design_services',80),
('website_software','Domain and Hosting Assistance','domain-and-hosting-assistance',
 'Help choosing, registering and configuring domains, hosting, SSL certificates and business email.',
 'Domain registration guidance, DNS configuration, hosting setup, HTTPS certificates and email DNS records (SPF, DKIM, DMARC).',
 'dns',90),
('website_software','Technical Support','technical-support',
 'Responsive technical help for your website, software and related online tools.',
 'Troubleshooting, configuration help and guidance through email and WhatsApp during business hours.',
 'support_agent',100);

-- ------------------------------------------------------------ social_links
-- All platforms start disabled with no URL and no follower count.
INSERT IGNORE INTO social_links (platform, profile_name, profile_url, count_type, is_enabled, show_follower_count, display_order) VALUES
('instagram', NULL, NULL, 'manual', 0, 0, 10),
('facebook',  NULL, NULL, 'manual', 0, 0, 20),
('whatsapp',  NULL, NULL, 'manual', 0, 0, 30),
('threads',   NULL, NULL, 'manual', 0, 0, 40),
('youtube',   NULL, NULL, 'manual', 0, 0, 50),
('linkedin',  NULL, NULL, 'manual', 0, 0, 60);

-- ----------------------------------------------------------- site_settings
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
('company_name', 'TechLadder Digital Marketing'),
('hero_headline', 'Grow Your Business With Digital Innovation'),
('hero_subheading', 'Creative Digital Marketing, Professional Websites & Custom Software Solutions — All Under One Roof.'),
('hero_image_url', '/assets/images/hero-banner.svg'),
('logo_url', '/assets/images/logo.svg'),
('company_intro', 'TechLadder Digital Marketing helps businesses present themselves well online. We combine creative marketing — videos, design and social media — with practical website and software development, so you can work with one team from first idea to launch and beyond.'),
('business_email', ''),
('whatsapp_number', ''),
('business_phone', ''),
('business_address', ''),
('google_maps_url', ''),
('business_hours', ''),
('footer_text', 'TechLadder Digital Marketing — Digital marketing, websites and software for growing businesses.'),
('whatsapp_prefill_message', 'Hello TechLadder, I would like to know more about your services.');

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
