CREATE DATABASE IF NOT EXISTS slumlink
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE slumlink;


CREATE TABLE organizations (
  org_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  org_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,

  org_age INT UNSIGNED NOT NULL,

  password VARCHAR(100) NOT NULL,

  status ENUM('pending','accepted','rejected','suspended')
    NOT NULL DEFAULT 'pending',

  license_filename VARCHAR(255) NOT NULL,
  license_mimetype VARCHAR(100) NOT NULL,
  license_size BIGINT UNSIGNED NOT NULL,

  license_file LONGBLOB NOT NULL
);

-- ==================================================
-- Slum dwellers, spouses, children and requests
-- ==================================================

-- Main slum dwellers table (applications + accounts)
CREATE TABLE IF NOT EXISTS slum_dwellers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,  -- Assigned after insert via trigger in format SR######
  slum_code VARCHAR(8) DEFAULT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20),
  nid VARCHAR(30),
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  education VARCHAR(100),
  occupation VARCHAR(100),
  income VARCHAR(50),
  area VARCHAR(150),
  district VARCHAR(150),
  division VARCHAR(150),
  family_members INT UNSIGNED DEFAULT 0,
  -- account/application lifecycle
  status ENUM('pending','accepted','rejected','suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Spouse records. New additions/removals should be requested via the
-- `change_requests` table; `status` indicates current state.

CREATE TABLE IF NOT EXISTS spouses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  nid VARCHAR(30),
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  mobile VARCHAR(20),
  marriage_certificate LONGBLOB,
  divorce_certificate LONGBLOB,
  -- 'pending_add' used if inserted tentatively; prefer using change_requests
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
);


-- Children records. Same lifecycle as spouses.

CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  preferred_job VARCHAR(150),
  birth_certificate LONGBLOB,
  death_certificate LONGBLOB,
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
);

-- Requests created by slum dwellers for add/remove spouse/child or profile edits.
-- Admins review these and apply the approved changes.

-- ==================================================
-- Trigger: generate `slum_code` in format SR + zero-padded 6-digit id
-- ==================================================
DELIMITER $$
CREATE TRIGGER trg_slum_dwellers_after_insert
AFTER INSERT ON slum_dwellers
FOR EACH ROW
BEGIN
  -- update the generated slum_code based on the auto-increment id
  UPDATE slum_dwellers
    SET slum_code = CONCAT('SR', LPAD(NEW.id, 6, '0'))
    WHERE id = NEW.id;
END$$
DELIMITER ;

SELECT * FROM slum_dwellers;
SELECT * FROM spouses;
SELECT * FROM children;
SELECT * FROM organizations;

drop table spouses;
drop table children;
drop table slum_dwellers;

-- Fix for the slum_dwellers trigger error
-- Drop the problematic AFTER INSERT trigger
DROP TRIGGER IF EXISTS trg_slum_dwellers_after_insert;

-- Create a new BEFORE INSERT trigger that sets slum_code before insertion
DELIMITER $$
CREATE TRIGGER trg_slum_dwellers_before_insert
BEFORE INSERT ON slum_dwellers
FOR EACH ROW
BEGIN
  -- We can't use NEW.id because it's not assigned yet (AUTO_INCREMENT)
  -- So we'll use a different approach: set slum_code to NULL and update after
  -- Actually, let's compute the next ID value
  DECLARE next_id BIGINT;
  
  SELECT IFNULL(MAX(id), 0) + 1 INTO next_id FROM slum_dwellers;
  SET NEW.slum_code = CONCAT('SR', LPAD(next_id, 6, '0'));
END$$
DELIMITER ;


-- Add documents table for tracking new document uploads by residents
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- 'marriage_certificate', 'birth_certificate', 'nid_scan', etc.
  document_title VARCHAR(150),
  file_blob LONGBLOB NOT NULL,
  file_mimetype VARCHAR(100),
  file_size BIGINT UNSIGNED,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(150), -- Admin email or name
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,
  INDEX idx_slum_status (slum_id, status),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
-- ==================================================
-- Complaints table
-- ==================================================
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(150) NOT NULL,
  attachment_filename VARCHAR(255) NOT NULL,
  attachment_mimetype VARCHAR(100) NOT NULL,
  attachment_size BIGINT UNSIGNED NOT NULL,
  attachment_file LONGBLOB NOT NULL,
  status ENUM('pending', 'in progress', 'resolved') NOT NULL DEFAULT 'pending',
  responded_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_complaint_dweller
    FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,
  
  INDEX idx_complaint_slum (slum_id),
  INDEX idx_complaint_status (status),
  INDEX idx_complaint_created (created_at DESC)
);

SELECT * FROM complaints;

-- ==================================================
-- New table 
-- ==================================================


/* 1) Add org_type column (only once) */
ALTER TABLE organizations
  ADD COLUMN org_type ENUM('ngo','localauthority') NOT NULL DEFAULT 'ngo' AFTER org_id;

/* 2) Insert Local Authorities (fixed IDs) */
INSERT IGNORE INTO organizations (
  org_id,
  org_type,
  org_name,
  email,
  phone,
  org_age,
  password,
  status,
  license_filename,
  license_mimetype,
  license_size,
  license_file
) VALUES
(1001, 'localauthority', 'Dhaka Local Authority',       'dhaka@gov.bd',       '01700000001', 50, 'dhakaslum123',       'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1002, 'localauthority', 'Chattogram Local Authority',  'chattogram@gov.bd',  '01700000002', 50, 'chattogramslum123',  'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1003, 'localauthority', 'Khulna Local Authority',      'khulna@gov.bd',      '01700000003', 50, 'khulnaslum123',      'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1004, 'localauthority', 'Rajshahi Local Authority',    'rajshahi@gov.bd',    '01700000004', 50, 'rajashaislum123',    'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1005, 'localauthority', 'Barishal Local Authority',    'barishal@gov.bd',    '01700000005', 50, 'barishalslum123',    'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1006, 'localauthority', 'Sylhet Local Authority',      'sylhet@gov.bd',      '01700000006', 50, 'sylhetslum123',      'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1007, 'localauthority', 'Rangpur Local Authority',     'rangpur@gov.bd',     '01700000007', 50, 'rangpurslum123',     'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1008, 'localauthority', 'Mymensingh Local Authority',  'mymensingh@gov.bd',  '01700000008', 50, 'mymensinghslum123',  'accepted', 'license.pdf', 'application/pdf', 0, '');

/* 3) Prevent NGO auto IDs from ever clashing with 1001–1008 */
ALTER TABLE organizations AUTO_INCREMENT = 2000;


/* =========================================================
   4) Re-create tables (MODIFIED to match your create-campaign.js)
   - Stores: division, district, slum_area, target_gender, age_group,
             education_required, skills_required
   - Dates: DATE (YYYY-MM-DD), Time: TIME (HH:MM:SS)
   ========================================================= */

CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id BIGINT UNSIGNED NOT NULL,

  title VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,

  -- EXACT fields from your JS payload:
  division VARCHAR(150) NOT NULL,
  district VARCHAR(150) NOT NULL,
  slum_area VARCHAR(150) NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL,

  -- EXACT values your HTML sends:
  -- all | female | male | others
  target_gender ENUM('all','female','male','others') NOT NULL DEFAULT 'all',

  -- child | adult | both
  age_group ENUM('child','adult','both') NOT NULL,

  -- Your JS currently sends: none/primary/secondary/hsc/diploma/graduate or ""
  education_required VARCHAR(50) NULL,

  -- Your JS currently sends one skill key (tailoring, embroidery, ...) or ""
  skills_required VARCHAR(50) NULL,

  description TEXT NOT NULL,

  status ENUM('pending','in_progress','completed','not_executed','cancelled')
    NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_campaign_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id)
    ON DELETE RESTRICT,
    
  INDEX idx_campaign_org (org_id),
  INDEX idx_campaign_area (division, district, slum_area),
  INDEX idx_campaign_filters (target_gender, age_group, education_required, skills_required),
  INDEX idx_campaign_dates (start_date, end_date),
  INDEX idx_campaign_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO campaigns (
  org_id, title, category,
  division, district, slum_area,
  start_date, end_date, start_time,
  target_gender, age_group, education_required, skills_required,
  description, status
) VALUES
(3, 'Korail Winter Clothing Drive', 'Clothing',
 'Dhaka', 'Dhaka', 'Korail',
 '2026-02-10', '2026-02-12', '10:00:00',
 'all', 'both', 'none', '',
 'Distribution of winter clothing packages for families in Korail. Priority to elderly, children, and working adults.',
 'pending'),

(3, 'Basic First-Aid Awareness Session', 'Skill Training',
 'Dhaka', 'Dhaka', 'Korail',
 '2026-02-15', '2026-02-15', '15:30:00',
 'all', 'adult', 'primary', '',
 'Hands-on session on first-aid basics (wound care, fever response, emergency steps).',
 'in_progress'),

(3, 'Tailoring Starter Training Batch-1', 'Skill Training',
 'Dhaka', 'Dhaka', 'Mirpur',
 '2026-03-01', '2026-03-30', '09:30:00',
 'female', 'adult', 'primary', 'tailoring',
 '4-week practical tailoring training with basic tools orientation and practice modules.',
 'pending'),

(3, 'School Kit Support for Children', 'Food',
 'Dhaka', 'Dhaka', 'Kamrangirchar',
 '2026-02-20', '2026-02-22', '11:00:00',
 'all', 'child', 'none', '',
 'School-support kits + nutrition packs for children to reduce dropout risk.',
 'pending'),

(3, 'Medicine Support Desk', 'Medicine',
 'Dhaka', 'Dhaka', 'Rampura',
 '2026-02-18', '2026-02-18', '13:00:00',
 'all', 'both', 'none', '',
 'Basic medicine distribution for common illnesses with quick screening and referral guidance.',
 'pending');

-- ---------------------------------------------------
-- 2) Dummy campaigns for org_id=1001 (Local Authority)
-- ---------------------------------------------------
INSERT INTO campaigns (
  org_id, title, category,
  division, district, slum_area,
  start_date, end_date, start_time,
  target_gender, age_group, education_required, skills_required,
  description, status
) VALUES
(1001, 'Korail Sanitation & Hygiene Supplies', 'Food',
 'Dhaka', 'Dhaka', 'Korail',
 '2026-02-09', '2026-02-11', '09:00:00',
 'all', 'both', 'none', '',
 'Hygiene and sanitation supplies distribution with awareness messaging and follow-up checks.',
 'in_progress'),

(1001, 'Community Clean-up & Waste Segregation', 'Job Placement',
 'Dhaka', 'Dhaka', 'Mirpur',
 '2026-02-14', '2026-02-14', '08:30:00',
 'all', 'adult', 'secondary', '',
 'Community clean-up drive; residents are registered for short-term paid work opportunities linked to cleanup effort.',
 'pending'),

(1001, 'Emergency Cash Support (Verified Households)', 'Cash',
 'Dhaka', 'Dhaka', 'Kamrangirchar',
 '2026-02-16', '2026-02-16', '12:00:00',
 'all', 'both', 'none', '',
 'One-time emergency cash support for verified households facing immediate hardship.',
 'pending'),

(1001, 'Women Skill Uplift: Embroidery Batch', 'Skill Training',
 'Dhaka', 'Dhaka', 'Rampura',
 '2026-03-05', '2026-03-28', '10:30:00',
 'female', 'adult', 'primary', 'embroidery',
 'Skill uplift program focusing on embroidery for income generation, with attendance tracking and evaluation.',
 'pending'),

(1001, 'Health Camp + Medicine Booth', 'Medicine',
 'Dhaka', 'Dhaka', 'Korail',
 '2026-02-22', '2026-02-22', '10:00:00',
 'all', 'both', 'none', '',
 'Local authority health camp with a medicine booth for common treatments and referrals.',
 'pending');
 


USE slumlink;

INSERT INTO slum_dwellers
(password_hash, full_name, mobile, nid, dob, gender, education, occupation, income, area, district, division, family_members, status)
VALUES
('hash1','Rahim Uddin','01711111111','NID-1001','1995-04-12','Male','primary','rickshaw puller','12000','Korail','Dhaka','Dhaka',5,'accepted'),
('hash2','Ayesha Akter','01722222222','NID-1002','1998-09-20','Female','secondary','housewife','0','Korail','Dhaka','Dhaka',3,'accepted'),
('hash3','Karim Mia','01733333333','NID-1003','1990-01-05','Male','none','day labor','10000','Mirpur','Dhaka','Dhaka',2,'accepted'),
('hash4','Jannat Ara','01744444444','NID-1004','1992-06-11','Female','hsc','tailor','15000','Rampura','Dhaka','Dhaka',4,'accepted'),
('hash5','Selim Hossain','01755555555','NID-1005','1987-12-25','Male','primary','vendor','9000','Kamrangirchar','Dhaka','Dhaka',6,'accepted'),
('hash6','Mitu Sultana','01766666666','NID-1006','2000-03-03','Female','graduate','tutor','8000','Mirpur','Dhaka','Dhaka',1,'accepted'),
('hash7','Babu Sheikh','01777777777','NID-1007','1996-08-18','Male','secondary','electric helper','13000','Rampura','Dhaka','Dhaka',2,'accepted'),
('hash8','Rupa Khatun','01788888888','NID-1008','1999-02-02','Female','primary','garments worker','14000','Korail','Dhaka','Dhaka',4,'accepted');

INSERT INTO spouses
(slum_id, name, dob, gender, nid, education, job, income, mobile, status)
VALUES
('SR000001','Salma Rahim','1997-05-10','Female','SPN-2001','primary','housewife','0','01811111111','active'),
('SR000003','Fatema Karim','1993-03-21','Female','SPN-2003','secondary','home','0','01833333333','active'),
('SR000005','Nusrat Selim','1990-10-15','Female','SPN-2005','none','home','0','01855555555','active');

INSERT INTO children
(slum_id, name, dob, gender, education, job, income, preferred_job, status)
VALUES
('SR000001','Rafi','2016-01-10','Male','Class 3',NULL,NULL,'student','active'),
('SR000001','Mim','2019-07-25','Female','Playgroup',NULL,NULL,'student','active'),

('SR000002','Samiha','2014-04-09','Female','Class 5',NULL,NULL,'student','active'),

('SR000004','Tuhin','2013-11-11','Male','Class 6',NULL,NULL,'student','active'),
('SR000004','Raisa','2018-02-20','Female','KG',NULL,NULL,'student','active'),

('SR000005','Shuvo','2012-09-01','Male','Class 7',NULL,NULL,'student','active'),

('SR000008','Nabila','2015-05-05','Female','Class 4',NULL,NULL,'student','active');


USE slumlink;

-- -----------------------------
-- SLUM DWELLERS (ACCEPTED USERS)
-- -----------------------------
INSERT INTO slum_dwellers
(password_hash, full_name, mobile, nid, dob, gender, education, occupation, income, area, district, division, family_members, status)
VALUES
-- KORAIL (has children)  -> should receive child campaigns
('hash1','Korail Family A','01711111111','1111111111','1992-05-12','Female','primary','tailoring','8000','Korail','Dhaka','Dhaka',4,'accepted'),

-- KORAIL (no children)   -> should NOT receive child campaigns
('hash2','Korail Family B','01711111112','1111111112','1988-08-20','Male','secondary','day_labor','9000','Korail','Dhaka','Dhaka',3,'accepted'),

-- MIRPUR (has child)
('hash3','Mirpur Family C','01711111113','1111111113','1990-02-10','Female','primary','embroidery','7000','Mirpur','Dhaka','Dhaka',5,'accepted'),

-- MIRPUR (no child)
('hash4','Mirpur Family D','01711111114','1111111114','1995-11-01','Male','hsc','driver','12000','Mirpur','Dhaka','Dhaka',2,'accepted'),

-- RAMPURA (has child)
('hash5','Rampura Family E','01711111115','1111111115','1993-07-07','Female','secondary','tailoring','8500','Rampura','Dhaka','Dhaka',4,'accepted'),

-- KAMRANGIRCHAR (no child)
('hash6','Kamrangirchar Family F','01711111116','1111111116','1987-03-03','Male','none','rickshaw_pull','6000','Kamrangirchar','Dhaka','Dhaka',3,'accepted');

-- -----------------------------------------
-- FIND THEIR GENERATED slum_codes (SR######)
-- -----------------------------------------
SELECT slum_code, full_name, area, district, division, education, occupation, status
FROM slum_dwellers
ORDER BY id DESC
LIMIT 20;

-- -----------------------------
-- CHILDREN (for "child" filters)
-- Use slum_code from above output.
-- -----------------------------
-- Replace SR0000XX with your real values from SELECT.
-- Example assumes the latest 6 inserted codes are SR000001..SR000006 (your DB may differ).
INSERT INTO children (slum_id, name, dob, gender, education, job, income, preferred_job, status)
VALUES
('SR000001','Child A1','2015-06-01','Male','primary',NULL,NULL,'student','active'),
('SR000003','Child C1','2012-04-15','Female','primary',NULL,NULL,'student','active'),
('SR000005','Child E1','2016-09-09','Male','none',NULL,NULL,'student','active');

-- -----------------------------
-- SPOUSES (optional)
-- -----------------------------
INSERT INTO spouses (slum_id, name, dob, gender, nid, education, job, income, mobile, status)
VALUES
('SR000001','Spouse A','1991-01-01','Male','2222222222','secondary','day_labor','9000','01722222221','active'),
('SR000003','Spouse C','1989-02-02','Male','2222222223','primary','tailoring','8000','01722222223','active');


SELECT notification_id, slum_code, campaign_id, type, title, created_at
FROM notifications
ORDER BY notification_id DESC
LIMIT 50;



---- New Table ----

DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_code VARCHAR(8) NOT NULL,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,

  type ENUM('campaign_created','campaign_updated','campaign_cancelled') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_slum
    FOREIGN KEY (slum_code) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,

  CONSTRAINT fk_notif_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,

  CONSTRAINT fk_notif_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,

  INDEX idx_notifications_user (slum_code, is_read, created_at),
  INDEX idx_notifications_campaign (campaign_id, created_at)
);

DROP TABLE IF EXISTS campaign_targets;

CREATE TABLE campaign_targets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  slum_code VARCHAR(8) NOT NULL,
  matched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_target_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,

  CONSTRAINT fk_target_slum
    FOREIGN KEY (slum_code) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,

  UNIQUE KEY uq_campaign_target (campaign_id, slum_code),
  INDEX idx_target_user (slum_code),
  INDEX idx_target_campaign (campaign_id)
);


DROP VIEW IF EXISTS vw_family_donation_history;
DROP TABLE IF EXISTS distribution_entries;
DROP TABLE IF EXISTS distribution_sessions;
DROP TABLE IF EXISTS aid_types;


CREATE TABLE IF NOT EXISTS aid_types (
  aid_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  requires_quantity TINYINT(1) NOT NULL DEFAULT 0,
  unit_label VARCHAR(40) NULL
);

INSERT IGNORE INTO aid_types (name, requires_quantity, unit_label) VALUES
('Food', 1, 'pack'),
('Clothing', 1, 'pcs'),
('Medicine', 1, 'pcs'),
('Cash', 1, 'BDT'),
('Skill Training', 0, NULL),
('Job Placement', 0, NULL);

CREATE TABLE IF NOT EXISTS distribution_sessions (
  session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  aid_type_id INT UNSIGNED NOT NULL,

  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,

  performed_by VARCHAR(150) NULL,

  CONSTRAINT fk_session_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_session_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_session_aid_type
    FOREIGN KEY (aid_type_id) REFERENCES aid_types(aid_type_id)
    ON DELETE RESTRICT,

  INDEX idx_session_campaign (campaign_id),
  INDEX idx_session_org (org_id),
  INDEX idx_session_status (status)
);

CREATE TABLE IF NOT EXISTS distribution_entries (
  entry_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  session_id BIGINT UNSIGNED NOT NULL,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,

  family_code VARCHAR(8) NOT NULL,

  -- ✅ allow multiple gives per session+family using rounds
  round_no INT UNSIGNED NOT NULL DEFAULT 1,

  quantity INT UNSIGNED NULL,
  comment VARCHAR(500) NULL,

  distributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verification_method ENUM('CODE','QR') NOT NULL DEFAULT 'CODE',

  CONSTRAINT fk_entry_session
    FOREIGN KEY (session_id) REFERENCES distribution_sessions(session_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_entry_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_entry_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_entry_family
    FOREIGN KEY (family_code) REFERENCES slum_dwellers(slum_code)
    ON DELETE RESTRICT,

  -- ❌ no unique per (session,family) anymore
  -- ✅ unique per (session,family,round_no) so round numbers don’t duplicate
  UNIQUE KEY uq_session_family_round (session_id, family_code, round_no),

  INDEX idx_session_family (session_id, family_code),
  INDEX idx_family_history (family_code, distributed_at),
  INDEX idx_org_history (org_id, distributed_at),
  INDEX idx_campaign_history (campaign_id, distributed_at)
);

-- Auto-assign next round_no when inserting another entry for same session+family
DROP TRIGGER IF EXISTS trg_distribution_entries_round_no;

DELIMITER $$
CREATE TRIGGER trg_distribution_entries_round_no
BEFORE INSERT ON distribution_entries
FOR EACH ROW
BEGIN
  DECLARE next_round INT UNSIGNED;

  IF NEW.round_no IS NULL OR NEW.round_no <= 0 THEN
    SELECT IFNULL(MAX(round_no), 0) + 1
      INTO next_round
    FROM distribution_entries
    WHERE session_id = NEW.session_id
      AND family_code = NEW.family_code;

    SET NEW.round_no = next_round;
  END IF;
END$$
DELIMITER ;

-- -----------------------------
-- Recreate the view
-- -----------------------------
CREATE OR REPLACE VIEW vw_family_donation_history AS
SELECT
  de.family_code,
  de.distributed_at,
  o.org_name,
  c.title AS campaign_title,
  c.category,
  c.division,
  c.district,
  c.slum_area,
  at.name AS aid_type,
  de.quantity,
  de.verification_method,
  de.comment,
  de.round_no,
  de.session_id
FROM distribution_entries de
JOIN distribution_sessions ds ON ds.session_id = de.session_id
JOIN campaigns c ON c.campaign_id = ds.campaign_id
JOIN organizations o ON o.org_id = ds.org_id
JOIN aid_types at ON at.aid_type_id = ds.aid_type_id;

-- ==============================================
-- Add skills columns to slum dwellers, spouses and children tables
-- ==============================================

-- Add skills columns to slum_dwellers table
ALTER TABLE slum_dwellers 
ADD COLUMN skills_1 VARCHAR(100) DEFAULT 'None',
ADD COLUMN skills_2 VARCHAR(100) DEFAULT 'None';

-- Add skills columns to spouses table
ALTER TABLE spouses 
ADD COLUMN skills_1 VARCHAR(100) DEFAULT 'None',
ADD COLUMN skills_2 VARCHAR(100) DEFAULT 'None';

-- Add skills columns to children table
ALTER TABLE children 
ADD COLUMN skills_1 VARCHAR(100) DEFAULT 'None',
ADD COLUMN skills_2 VARCHAR(100) DEFAULT 'None',
ADD COLUMN age_group ENUM('child', 'adult') DEFAULT 'child',
ADD COLUMN birth_certificate_number VARCHAR(50) UNIQUE;

-- Add location columns to complaints table
ALTER TABLE complaints
ADD COLUMN division VARCHAR(150),
ADD COLUMN district VARCHAR(150),
ADD COLUMN area VARCHAR(150);

-- Remove the old location column from complaints table
ALTER TABLE complaints
DROP COLUMN location;