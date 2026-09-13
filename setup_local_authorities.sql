-- Insert local authority organizations into the organizations table
-- This allows campaigns created by local authorities to have valid org_id references

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
