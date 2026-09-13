-- =========================================================
-- SLUMLINK FINAL CONSOLIDATED DATABASE
-- Ready for XAMPP phpMyAdmin Import
-- =========================================================

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
CREATE TABLE organizations (
  org_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_type ENUM('ngo','localauthority') NOT NULL DEFAULT 'ngo',
  org_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  org_age INT UNSIGNED NOT NULL,
  password VARCHAR(100) NOT NULL,
  status ENUM('pending','accepted','rejected','suspended') NOT NULL DEFAULT 'pending',
  license_filename VARCHAR(255) NOT NULL,
  license_mimetype VARCHAR(100) NOT NULL,
  license_size BIGINT UNSIGNED NOT NULL,
  license_file LONGBLOB NOT NULL
) ENGINE=InnoDB;

-- Prevent clash with local authority fixed IDs
ALTER TABLE organizations AUTO_INCREMENT = 2000;

-- =========================================================
-- SLUM DWELLERS
-- =========================================================
CREATE TABLE slum_dwellers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_code VARCHAR(8) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20),
  nid VARCHAR(30),
  dob DATE,
  gender ENUM('Male','Female','Others'),
  education VARCHAR(100),
  occupation VARCHAR(100),
  income VARCHAR(50),
  area VARCHAR(150),
  district VARCHAR(150),
  division VARCHAR(150),
  family_members INT UNSIGNED DEFAULT 0,
  status ENUM('pending','accepted','rejected','suspended') NOT NULL DEFAULT 'pending',
  skills_1 VARCHAR(100) DEFAULT 'None',
  skills_2 VARCHAR(100) DEFAULT 'None',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Trigger for slum_code generation
DELIMITER $$
CREATE TRIGGER trg_slum_dwellers_before_insert
BEFORE INSERT ON slum_dwellers
FOR EACH ROW
BEGIN
  DECLARE next_id BIGINT;
  SELECT IFNULL(MAX(id),0) + 1 INTO next_id FROM slum_dwellers;
  SET NEW.slum_code = CONCAT('SR', LPAD(next_id,6,'0'));
END$$
DELIMITER ;

-- =========================================================
-- SPOUSES
-- =========================================================
CREATE TABLE spouses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8),
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others'),
  nid VARCHAR(30),
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  mobile VARCHAR(20),
  marriage_certificate LONGBLOB,
  divorce_certificate LONGBLOB,
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  skills_1 VARCHAR(100) DEFAULT 'None',
  skills_2 VARCHAR(100) DEFAULT 'None',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- CHILDREN
-- =========================================================
CREATE TABLE children (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8),
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others'),
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  preferred_job VARCHAR(150),
  birth_certificate LONGBLOB,
  death_certificate LONGBLOB,
  birth_certificate_number VARCHAR(50) UNIQUE,
  age_group ENUM('child','adult') DEFAULT 'child',
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  skills_1 VARCHAR(100) DEFAULT 'None',
  skills_2 VARCHAR(100) DEFAULT 'None',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- DOCUMENTS
-- =========================================================
CREATE TABLE documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  document_title VARCHAR(150),
  file_blob LONGBLOB NOT NULL,
  file_mimetype VARCHAR(100),
  file_size BIGINT UNSIGNED,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(150),
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- COMPLAINTS
-- =========================================================
CREATE TABLE complaints (
  complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  attachment_filename VARCHAR(255) NOT NULL,
  attachment_mimetype VARCHAR(100) NOT NULL,
  attachment_size BIGINT UNSIGNED NOT NULL,
  attachment_file LONGBLOB NOT NULL,
  division VARCHAR(150),
  district VARCHAR(150),
  area VARCHAR(150),
  status ENUM('pending','in progress','resolved') DEFAULT 'pending',
  responded_by VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- CAMPAIGNS (FINAL STRUCTURE, org_id NULLABLE, NO FK)
-- =========================================================
CREATE TABLE campaigns (
  campaign_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  division VARCHAR(150) NOT NULL,
  district VARCHAR(150) NOT NULL,
  slum_area VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  target_gender ENUM('all','female','male','others') NOT NULL DEFAULT 'all',
  age_group ENUM('child','adult','both') NOT NULL,
  education_required VARCHAR(50),
  skills_required VARCHAR(50),
  description TEXT NOT NULL,
  status ENUM('pending','in_progress','completed','not_executed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE notifications (
  notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_code VARCHAR(8) NOT NULL,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  type ENUM('campaign_created','campaign_updated','campaign_cancelled') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_code) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- CAMPAIGN TARGETS
-- =========================================================
CREATE TABLE campaign_targets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  slum_code VARCHAR(8) NOT NULL,
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_target (campaign_id, slum_code)
) ENGINE=InnoDB;

-- =========================================================
-- AID TYPES
-- =========================================================
CREATE TABLE aid_types (
  aid_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  requires_quantity TINYINT(1) DEFAULT 0,
  unit_label VARCHAR(40)
) ENGINE=InnoDB;

INSERT INTO aid_types (name, requires_quantity, unit_label) VALUES
('Food',1,'pack'),
('Clothing',1,'pcs'),
('Medicine',1,'pcs'),
('Cash',1,'BDT'),
('Skill Training',0,NULL),
('Job Placement',0,NULL);

-- =========================================================
-- DISTRIBUTION SESSIONS
-- =========================================================
CREATE TABLE distribution_sessions (
  session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  aid_type_id INT UNSIGNED NOT NULL,
  status ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  performed_by VARCHAR(150)
) ENGINE=InnoDB;

-- =========================================================
-- DISTRIBUTION ENTRIES
-- =========================================================
CREATE TABLE distribution_entries (
  entry_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  family_code VARCHAR(8) NOT NULL,
  round_no INT UNSIGNED NOT NULL DEFAULT 1,
  quantity INT UNSIGNED,
  comment VARCHAR(500),
  distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_method ENUM('CODE','QR') DEFAULT 'CODE',
  UNIQUE KEY uq_session_family_round (session_id,family_code,round_no)
) ENGINE=InnoDB;

DELIMITER $$
CREATE TRIGGER trg_distribution_entries_round_no
BEFORE INSERT ON distribution_entries
FOR EACH ROW
BEGIN
  DECLARE next_round INT;
  IF NEW.round_no IS NULL OR NEW.round_no <= 0 THEN
    SELECT IFNULL(MAX(round_no),0)+1
    INTO next_round
    FROM distribution_entries
    WHERE session_id = NEW.session_id
      AND family_code = NEW.family_code;
    SET NEW.round_no = next_round;
  END IF;
END$$
DELIMITER ;

-- =========================================================
-- VIEW
-- =========================================================
CREATE OR REPLACE VIEW vw_family_donation_history AS
SELECT
  de.family_code,
  de.distributed_at,
  de.campaign_id,
  de.org_id,
  de.quantity,
  de.verification_method,
  de.comment,
  de.round_no,
  de.session_id
FROM distribution_entries de;

-- =========================================================
-- LOCAL AUTHORITIES (FINAL INSERT)
-- =========================================================
INSERT IGNORE INTO organizations
(org_id,org_type,org_name,email,phone,org_age,password,status,license_filename,license_mimetype,license_size,license_file)
VALUES
(1001,'localauthority','Dhaka Local Authority','dhaka@gov.bd','01700000001',50,'dhakaslum123','accepted','license.pdf','application/pdf',0,''),
(1002,'localauthority','Chattogram Local Authority','chattogram@gov.bd','01700000002',50,'chattogramslum123','accepted','license.pdf','application/pdf',0,''),
(1003,'localauthority','Khulna Local Authority','khulna@gov.bd','01700000003',50,'khulnaslum123','accepted','license.pdf','application/pdf',0,''),
(1004,'localauthority','Rajshahi Local Authority','rajshahi@gov.bd','01700000004',50,'rajashaislum123','accepted','license.pdf','application/pdf',0,''),
(1005,'localauthority','Barishal Local Authority','barishal@gov.bd','01700000005',50,'barishalslum123','accepted','license.pdf','application/pdf',0,''),
(1006,'localauthority','Sylhet Local Authority','sylhet@gov.bd','01700000006',50,'sylhetslum123','accepted','license.pdf','application/pdf',0,''),
(1007,'localauthority','Rangpur Local Authority','rangpur@gov.bd','01700000007',50,'rangpurslum123','accepted','license.pdf','application/pdf',0,''),
(1008,'localauthority','Mymensingh Local Authority','mymensingh@gov.bd','01700000008',50,'mymensinghslum123','accepted','license.pdf','application/pdf',0,'');

-- =========================================================
-- END OF FINAL DATABASE
-- =========================================================
