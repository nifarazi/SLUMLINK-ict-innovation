# Steps to Fix Campaign Creation Issue

## Problem
Campaigns table has a foreign key constraint on `org_id` that references the `organizations` table. Local authorities don't have organization records, so campaigns can't be created.

## Solution
Insert local authority organization records into the database.

### Step 1: Open XAMPP and Start MySQL
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL

### Step 2: Execute SQL via phpMyAdmin
1. Open your browser and go to `http://localhost/phpmyadmin`
2. Click on the `slumlink` database on the left
3. Click the "SQL" tab at the top
4. Copy and paste this SQL:

```sql
INSERT IGNORE INTO organizations (
  org_id, 
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
(1001, 'Dhaka Local Authority', 'dhaka@gov.bd', '01700000001', 50, 'dhakaslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1002, 'Chattogram Local Authority', 'chattogram@gov.bd', '01700000002', 50, 'chattogramslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1003, 'Khulna Local Authority', 'khulna@gov.bd', '01700000003', 50, 'khulnaslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1004, 'Rajshahi Local Authority', 'rajshahi@gov.bd', '01700000004', 50, 'rajashaislum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1005, 'Barishal Local Authority', 'barishal@gov.bd', '01700000005', 50, 'barishalslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1006, 'Sylhet Local Authority', 'sylhet@gov.bd', '01700000006', 50, 'sylhetslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1007, 'Rangpur Local Authority', 'rangpur@gov.bd', '01700000007', 50, 'rangpurslum123', 'accepted', 'license.pdf', 'application/pdf', 0, ''),
(1008, 'Mymensingh Local Authority', 'mymensingh@gov.bd', '01700000008', 50, 'mymensinghslum123', 'accepted', 'license.pdf', 'application/pdf', 0, '');
```

5. Click "Go" button to execute

### Step 3: Verify the records were inserted
- The table should show "8 rows inserted" (or similar)
- Go to the `organizations` table and you should see the 8 new local authority records

### Step 4: Test Campaign Creation
1. Stop the backend server (if running)
2. Start it again: `npm start`
3. Sign in as a local authority (e.g., dhaka@gov.bd / dhakaslum123)
4. Create a new campaign
5. The campaign should now be saved to the database

## What Changed in the Code
- Backend now maps authority email prefixes to org_ids in the organizations table
- Example: "dhaka@gov.bd" (prefix "dha") → org_id 1001
- Campaigns are created with the corresponding org_id
