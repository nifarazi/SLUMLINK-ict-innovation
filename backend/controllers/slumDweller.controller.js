import pool from "../db.js";
import bcrypt from "bcrypt";
import { sendSMS, createVerificationMessage, createOTPMessage, createSpouseAddedMessage, createSpouseRemovedMessage } from "../utils/sms.js";

// Signin controller for slum dwellers using slum_code and password
export const signinSlumDweller = async (req, res) => {
  try {
    const { slum_code, password } = req.body;

    // Validate required fields
    if (!slum_code || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide both slum code and password."
      });
    }

    // Query slum dweller by slum_code
    const [dwellers] = await pool.query(
      'SELECT id, slum_code, password_hash, full_name, mobile, status FROM slum_dwellers WHERE slum_code = ?',
      [slum_code]
    );

    // Check if user exists
    if (dwellers.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid slum code or password"
      });
    }

    const dweller = dwellers[0];

    // Check if account is accepted/active
    if (dweller.status !== 'accepted') {
      return res.status(403).json({
        status: "error",
        message: `Your account is ${dweller.status}. Please wait for admin approval.`
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, dweller.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid slum code or password"
      });
    }

    // Successful authentication
    return res.json({
      status: "success",
      message: "Sign in successful",
      data: {
        id: dweller.id,
        slum_code: dweller.slum_code,
        full_name: dweller.full_name,
        mobile: dweller.mobile
      }
    });

  } catch (error) {
    console.error("Slum Dweller Signin Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while signing in."
    });
  }
};

// Enhanced NID duplicate checking function
export const checkNidDuplicate = async (req, res) => {
  try {
    const { nid, excludeSlumId = null, excludeSpouseId = null, context = 'general' } = req.body;

    // Validate NID input
    if (!nid) {
      return res.status(400).json({
        status: "error",
        message: "NID number is required."
      });
    }

    // Remove any spaces from NID for consistent checking
    const cleanNid = String(nid).replace(/\s+/g, '');

    const duplicateInfo = await checkNidDuplicateInternal(cleanNid, excludeSlumId, excludeSpouseId, context);

    return res.json({
      status: "success",
      isDuplicate: duplicateInfo.isDuplicate,
      message: duplicateInfo.message,
      details: duplicateInfo.details
    });

  } catch (error) {
    console.error("NID Check Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while checking NID."
    });
  }
};

// Check Birth Certificate duplicate
export const checkBirthCertificateDuplicate = async (req, res) => {
  try {
    const { birth_certificate_number } = req.body;

    // Validate birth certificate number input
    if (!birth_certificate_number) {
      return res.status(400).json({
        status: "error",
        message: "Birth certificate number is required."
      });
    }

    // Remove any spaces from birth certificate number for consistent checking
    const cleanCertNumber = String(birth_certificate_number).replace(/\s+/g, '');

    // Validate 17-digit format
    if (!/^\d{17}$/.test(cleanCertNumber)) {
      return res.status(400).json({
        status: "error",
        message: "Birth certificate number must be exactly 17 digits."
      });
    }

    // Check if birth certificate number already exists in children table
    const [existingRows] = await pool.query(
      'SELECT COUNT(*) as count FROM children WHERE birth_certificate_number = ?',
      [cleanCertNumber]
    );

    const isDuplicate = existingRows[0].count > 0;

    let details = [];
    if (isDuplicate) {
      // Get details of the duplicate record
      const [detailRows] = await pool.query(
        'SELECT slum_id, name FROM children WHERE birth_certificate_number = ? LIMIT 1',
        [cleanCertNumber]
      );
      
      if (detailRows.length > 0) {
        details.push({
          location: "children",
          slum_id: detailRows[0].slum_id,
          name: detailRows[0].name
        });
      }
    }

    return res.json({
      status: "success",
      isDuplicate: isDuplicate,
      message: isDuplicate ? "Birth certificate number already exists in the system" : "Birth certificate number is available",
      details: details
    });

  } catch (error) {
    console.error("Birth Certificate Check Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while checking birth certificate number."
    });
  }
};

// Internal helper function for comprehensive NID checking
async function checkNidDuplicateInternal(cleanNid, excludeSlumId = null, excludeSpouseId = null, context = 'general') {
  // Check in slum_dwellers table - count only first
  let slumDwellerCountQuery = 'SELECT COUNT(*) as count FROM slum_dwellers WHERE nid = ?';
  const slumDwellerCountParams = [cleanNid];
  
  if (excludeSlumId) {
    slumDwellerCountQuery += ' AND slum_code != ?';
    slumDwellerCountParams.push(excludeSlumId);
  }

  const [slumDwellerCountRows] = await pool.query(slumDwellerCountQuery, slumDwellerCountParams);
  const slumDwellerCount = slumDwellerCountRows[0].count;

  // Check in spouses table - count only first
  let spousesCountQuery = 'SELECT COUNT(*) as count FROM spouses WHERE nid = ? AND status != "pending_remove"';
  const spousesCountParams = [cleanNid];
  
  if (excludeSpouseId) {
    spousesCountQuery += ' AND id != ?';
    spousesCountParams.push(excludeSpouseId);
  }
  
  if (excludeSlumId) {
    spousesCountQuery += ' AND slum_id != ?';
    spousesCountParams.push(excludeSlumId);
  }

  const [spousesCountRows] = await pool.query(spousesCountQuery, spousesCountParams);
  const spousesCount = spousesCountRows[0].count;

  const totalDuplicates = slumDwellerCount + spousesCount;
  const isDuplicate = totalDuplicates > 0;

  let message = "NID is available";
  let details = [];

  // If duplicates exist, get detailed info with separate queries
  if (isDuplicate) {
    if (slumDwellerCount > 0) {
      let slumDwellerDetailQuery = 'SELECT slum_code, full_name FROM slum_dwellers WHERE nid = ?';
      const slumDwellerDetailParams = [cleanNid];
      
      if (excludeSlumId) {
        slumDwellerDetailQuery += ' AND slum_code != ?';
        slumDwellerDetailParams.push(excludeSlumId);
      }
      slumDwellerDetailQuery += ' LIMIT 1';
      
      const [slumDwellerDetailRows] = await pool.query(slumDwellerDetailQuery, slumDwellerDetailParams);
      if (slumDwellerDetailRows.length > 0) {
        message = "NID already exists in the system";
        details.push({
          location: "slum_dwellers",
          slum_code: slumDwellerDetailRows[0].slum_code,
          name: slumDwellerDetailRows[0].full_name
        });
      }
    }
    
    if (spousesCount > 0) {
      let spousesDetailQuery = 'SELECT slum_id, name FROM spouses WHERE nid = ? AND status != "pending_remove"';
      const spousesDetailParams = [cleanNid];
      
      if (excludeSpouseId) {
        spousesDetailQuery += ' AND id != ?';
        spousesDetailParams.push(excludeSpouseId);
      }
      
      if (excludeSlumId) {
        spousesDetailQuery += ' AND slum_id != ?';
        spousesDetailParams.push(excludeSlumId);
      }
      spousesDetailQuery += ' LIMIT 1';
      
      const [spousesDetailRows] = await pool.query(spousesDetailQuery, spousesDetailParams);
      if (spousesDetailRows.length > 0) {
        message = "NID already exists in the system";
        details.push({
          location: "spouses",
          slum_id: spousesDetailRows[0].slum_id,
          name: spousesDetailRows[0].name
        });
      }
    }
  }

  return {
    isDuplicate,
    message,
    details,
    slumDwellerCount,
    spousesCount
  };
}

// Function to validate NIDs within a registration context
async function validateRegistrationNids(personalNid, spousesData) {
  const errors = [];
  const cleanPersonalNid = personalNid ? String(personalNid).replace(/\s+/g, '') : null;
  
  // Check personal NID for duplicates if provided
  if (cleanPersonalNid) {
    const personalCheck = await checkNidDuplicateInternal(cleanPersonalNid);
    if (personalCheck.isDuplicate) {
      errors.push({
        field: 'personal.nid',
        message: 'Personal NID already exists in the system',
        details: personalCheck.details
      });
    }
  }
  
  // Check spouse NIDs
  if (spousesData && Array.isArray(spousesData)) {
    const spouseNids = [];
    
    for (let i = 0; i < spousesData.length; i++) {
      const spouse = spousesData[i];
      const cleanSpouseNid = spouse.nid ? String(spouse.nid).replace(/\s+/g, '') : null;
      
      if (cleanSpouseNid) {
        // Check if spouse NID matches personal NID
        if (cleanPersonalNid && cleanSpouseNid === cleanPersonalNid) {
          errors.push({
            field: `spouses[${i}].nid`,
            message: 'Spouse NID cannot be the same as personal NID',
            spouseName: spouse.name
          });
        }
        
        // Check if spouse NID is duplicate with other spouses in current registration
        if (spouseNids.includes(cleanSpouseNid)) {
          errors.push({
            field: `spouses[${i}].nid`,
            message: 'Duplicate NID found among spouses in current registration',
            spouseName: spouse.name
          });
        }
        spouseNids.push(cleanSpouseNid);
        
        // Check if spouse NID exists in database
        const spouseCheck = await checkNidDuplicateInternal(cleanSpouseNid);
        if (spouseCheck.isDuplicate) {
          errors.push({
            field: `spouses[${i}].nid`,
            message: 'Spouse NID already exists in the system',
            spouseName: spouse.name,
            details: spouseCheck.details
          });
        }
      }
    }
  }
  
  return errors;
}

// Helper function to convert Data URL to Buffer for BLOB storage
function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  
  try {
    // Data URL format: data:mime/type;base64,<base64data>
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error converting Data URL to Buffer:', error);
    return null;
  }
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  if (isNaN(birthDate.getTime())) return null;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : null;
}

// Helper function to determine age group based on calculated age
function getAgeGroup(age) {
  if (age === null || age === undefined) return 'child'; // Default to child if age cannot be calculated
  return age >= 18 ? 'adult' : 'child';
}

function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) return 'application/octet-stream';

  const signature = buffer.subarray(0, 4);

  if (signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46) {
    return 'application/pdf';
  }

  if (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47) {
    return 'image/png';
  }

  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
    return 'image/jpeg';
  }

  if (signature[0] === 0x47 && signature[1] === 0x49 && signature[2] === 0x46) {
    return 'image/gif';
  }

  return 'application/octet-stream';
}

function extensionFromMime(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

export const registerSlumDweller = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { personal, spouses, children } = req.body;

    console.log('📝 Registration request received:', { 
      personal: personal?.name, 
      spousesCount: spouses?.length, 
      childrenCount: children?.length 
    });

    // Validate required fields
    if (!personal || !personal.name || !personal.mobile || !personal.password) {
      console.error('❌ Validation failed:', { personal });
      return res.status(400).json({ 
        status: "error", 
        message: "Missing required personal information." 
      });
    }

    // Enhanced NID validation for registration
    const nidValidationErrors = await validateRegistrationNids(personal.nid, spouses);
    if (nidValidationErrors.length > 0) {
      console.error('❌ NID validation failed:', nidValidationErrors);
      return res.status(400).json({
        status: "error",
        message: "NID validation failed",
        errors: nidValidationErrors
      });
    }

    await connection.beginTransaction();

    // Hash password
    const password_hash = await bcrypt.hash(personal.password, 10);

    // Insert into slum_dwellers table (family_members will be calculated after family data is inserted)
    const dwellerSql = `
      INSERT INTO slum_dwellers 
      (full_name, mobile, dob, gender, nid, education, occupation, income, area, district, division, password_hash, skills_1, skills_2, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const dwellerValues = [
      personal.name,
      personal.mobile,
      personal.dob || null,
      personal.gender || null,
      personal.nid || null,
      personal.education || null,
      personal.occupation || null,
      personal.income || null,
      personal.area || null,
      personal.district || null,
      personal.division || null,
      password_hash,
      personal.skills_1 || 'None',
      personal.skills_2 || 'None'
    ];

    const [dwellerResult] = await connection.query(dwellerSql, dwellerValues);
    const slumDwellerId = dwellerResult.insertId;

    // The trigger will auto-generate slum_code after insert
    // Retrieve the generated slum_code
    const [dwellerRow] = await connection.query(
      'SELECT slum_code FROM slum_dwellers WHERE id = ?',
      [slumDwellerId]
    );
    const slumCode = dwellerRow[0]?.slum_code;

    // Insert spouses if any
    if (spouses && Array.isArray(spouses) && spouses.length > 0) {
      for (const spouse of spouses) {
        // Convert marriage certificate Data URL to Buffer
        const certBuffer = dataUrlToBuffer(spouse.marriageCertificate);
        
        const spouseSql = `
          INSERT INTO spouses 
          (slum_id, name, dob, gender, nid, education, job, income, mobile, marriage_certificate, skills_1, skills_2)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const spouseValues = [
          slumCode,
          spouse.name,
          spouse.dob || null,
          spouse.gender || null,
          spouse.nid || null,
          spouse.education || null,
          spouse.occupation || null,
          spouse.income || null,
          spouse.mobile || null,
          certBuffer,
          spouse.skills_1 || 'None',
          spouse.skills_2 || 'None'
        ];
        await connection.query(spouseSql, spouseValues);
      }
    }

    // Insert children if any
    if (children && Array.isArray(children) && children.length > 0) {
      for (const child of children) {
        // Convert birth certificate Data URL to Buffer
        const certBuffer = dataUrlToBuffer(child.birthCertificate);
        
        // Calculate age and determine age group
        const childAge = calculateAge(child.dob);
        const ageGroup = getAgeGroup(childAge);
        
        console.log(`👶 Child: ${child.name}, DOB: ${child.dob}, Age: ${childAge}, Age Group: ${ageGroup}`);
        
        const childSql = `
          INSERT INTO children 
          (slum_id, name, dob, gender, education, job, income, preferred_job, birth_certificate, birth_certificate_number, skills_1, skills_2, age_group)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const childValues = [
          slumCode,
          child.name,
          child.dob || null,
          child.gender || null,
          child.education || null,
          child.job || null,
          child.income || null,
          child.preferredJob || null,
          certBuffer,
          child.birthCertificateNumber || null,
          child.skills_1 || 'None',
          child.skills_2 || 'None',
          ageGroup
        ];
        await connection.query(childSql, childValues);

        // Also insert birth certificate as a document if it exists
        if (certBuffer) {
          const mimetypeMatch = child.birthCertificate?.match(/^data:([^;]+)/) || [];
          const mimetype = mimetypeMatch[1] || 'application/octet-stream';
          
          const docSql = `
            INSERT INTO documents 
            (slum_id, document_type, document_title, file_blob, file_mimetype, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `;
          const docValues = [
            slumCode,
            'Birth Certificate',
            `${child.name} - Birth Certificate`,
            certBuffer,
            mimetype,
            certBuffer.length
          ];
          await connection.query(docSql, docValues);
          console.log('📄 Birth certificate uploaded for child:', child.name);
        }
      }
    }

    // Also insert marriage certificates as documents
    if (spouses && Array.isArray(spouses) && spouses.length > 0) {
      for (let idx = 0; idx < spouses.length; idx++) {
        const spouse = spouses[idx];
        const certBuffer = dataUrlToBuffer(spouse.marriageCertificate);
        if (certBuffer) {
          const mimetypeMatch = spouse.marriageCertificate?.match(/^data:([^;]+)/) || [];
          const mimetype = mimetypeMatch[1] || 'application/octet-stream';
          
          const docSql = `
            INSERT INTO documents 
            (slum_id, document_type, document_title, file_blob, file_mimetype, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `;
          const docValues = [
            slumCode,
            'Marriage Certificate',
            `${spouse.name} - Marriage Certificate`,
            certBuffer,
            mimetype,
            certBuffer.length
          ];
          await connection.query(docSql, docValues);
          console.log('📄 Marriage certificate uploaded for spouse:', spouse.name);
        }
      }
    }

    // Calculate and update family_members count
    // Family members = 1 (main dweller) + number of spouses + number of children
    const spouseCount = spouses && Array.isArray(spouses) ? spouses.length : 0;
    const childrenCount = children && Array.isArray(children) ? children.length : 0;
    const totalFamilyMembers = 1 + spouseCount + childrenCount;

    // Update the family_members field
    await connection.query(
      'UPDATE slum_dwellers SET family_members = ? WHERE id = ?',
      [totalFamilyMembers, slumDwellerId]
    );

    console.log(`🔢 Family members calculated: ${totalFamilyMembers} (1 dweller + ${spouseCount} spouse(s) + ${childrenCount} children)`);

    await connection.commit();

    console.log('✅ Registration successful:', { slum_code: slumCode, id: slumDwellerId });

    return res.json({
      status: "success",
      message: "Registration submitted successfully. Your application is pending approval.",
      slum_code: slumCode,
      id: slumDwellerId
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Registration error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      status: "error", 
      message: "Registration failed. Please try again.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get all pending slum dwellers
export const getPendingSlumDwellers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, slum_code, full_name, mobile, nid, gender, education, occupation, income, area, district, division, created_at FROM slum_dwellers WHERE status = ? ORDER BY created_at DESC',
      ['pending']
    );
    
    console.log('📋 Retrieved pending slum dwellers:', rows.length);
    return res.json({
      status: "success",
      data: rows || []
    });
  } catch (error) {
    console.error("❌ Error fetching pending slum dwellers:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch pending accounts.",
      error: error.message 
    });
  }
};

// Get all active slum dwellers
export const getActiveSlumDwellers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         sd.id,
         sd.slum_code,
         sd.full_name,
         sd.mobile,
         sd.nid,
         sd.gender,
         sd.education,
         sd.occupation,
         sd.income,
         sd.area,
         sd.district,
         sd.division,
         sd.created_at,
         (SELECT COUNT(*) FROM spouses s 
          WHERE s.slum_id = sd.slum_code 
            AND s.status IN ('pending_add', 'pending_remove')) AS spouse_updates,
         (SELECT COUNT(*) FROM children c 
          WHERE c.slum_id = sd.slum_code 
            AND c.status IN ('pending_add', 'pending_remove')) AS child_updates
       FROM slum_dwellers sd
       WHERE sd.status = ?
       ORDER BY sd.created_at DESC`,
      ['accepted']
    );
    
    console.log('📋 Retrieved active slum dwellers:', rows.length);
    return res.json({
      status: "success",
      data: rows || []
    });
  } catch (error) {
    console.error("❌ Error fetching active slum dwellers:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch active accounts.",
      error: error.message 
    });
  }
};

// Get single slum dweller with spouse and children
export const getSlumDwellerById = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    // Get main resident info
    const [dwellerRows] = await connection.query(
      'SELECT * FROM slum_dwellers WHERE id = ?',
      [id]
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found." 
      });
    }

    const resident = dwellerRows[0];
    const slumCode = resident.slum_code;

    // Get spouses (include active, pending_add, pending_remove)
    const [spouseRows] = await connection.query(
      `SELECT 
         id,
         slum_id,
         name,
         dob,
         gender,
         nid,
         education,
         job,
         income,
         mobile,
         skills_1,
         skills_2,
         status,
         CASE WHEN marriage_certificate IS NULL THEN 0 ELSE 1 END AS has_marriage_certificate,
         CASE WHEN divorce_certificate IS NULL THEN 0 ELSE 1 END AS has_divorce_certificate
       FROM spouses 
       WHERE slum_id = ? AND status IN (?, ?, ?)`,
      [slumCode, 'active', 'pending_add', 'pending_remove']
    );

    // Get children (include active, pending_add, pending_remove)
    const [childrenRows] = await connection.query(
      `SELECT 
         id,
         slum_id,
         name,
         dob,
         gender,
         education,
         job,
         income,
         preferred_job,
         birth_certificate_number,
         skills_1,
         skills_2,
         status,
         CASE WHEN birth_certificate IS NULL THEN 0 ELSE 1 END AS has_birth_certificate,
         CASE WHEN death_certificate IS NULL THEN 0 ELSE 1 END AS has_death_certificate
       FROM children 
       WHERE slum_id = ? AND status IN (?, ?, ?)`,
      [slumCode, 'active', 'pending_add', 'pending_remove']
    );

    console.log('👤 Retrieved resident:', resident.full_name);

    return res.json({
      status: "success",
      data: {
        resident,
        spouses: spouseRows || [],
        children: childrenRows || []
      }
    });
  } catch (error) {
    console.error("❌ Error fetching resident:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch resident details.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get analytics for a slum area
export const getSlumAnalytics = async (req, res) => {
  const slum = (req.query.slum || '').trim();

  if (!slum) {
    return res.status(400).json({
      status: "error",
      message: "Slum name is required."
    });
  }

  const connection = await pool.getConnection();

  try {
    const [householdRows] = await connection.query(
      `SELECT COUNT(*) AS households, COALESCE(SUM(family_members), 0) AS population
       FROM slum_dwellers
       WHERE status = 'accepted' AND area = ?`,
      [slum]
    );

    const [genderRows] = await connection.query(
      `SELECT gender, COUNT(*) AS count
       FROM slum_dwellers
       WHERE status = 'accepted' AND area = ?
       GROUP BY gender`,
      [slum]
    );

    const [spouseRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM spouses
       WHERE status = 'active'
         AND slum_id IN (SELECT slum_code FROM slum_dwellers WHERE status = 'accepted' AND area = ?)`,
      [slum]
    );

    const [childRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM children
       WHERE status = 'active'
         AND slum_id IN (SELECT slum_code FROM slum_dwellers WHERE status = 'accepted' AND area = ?)`,
      [slum]
    );

    const [educationRows] = await connection.query(
      `SELECT education, COUNT(*) AS count
       FROM slum_dwellers
       WHERE status = 'accepted' AND area = ?
       GROUP BY education
       ORDER BY count DESC
       LIMIT 5`,
      [slum]
    );

    const [occupationRows] = await connection.query(
      `SELECT occupation, COUNT(*) AS count
       FROM slum_dwellers
       WHERE status = 'accepted' AND area = ?
       GROUP BY occupation
       ORDER BY count DESC
       LIMIT 5`,
      [slum]
    );

    const [campaignRows] = await connection.query(
      `SELECT category, COUNT(*) AS count
       FROM campaigns
       WHERE slum_area = ?
       GROUP BY category
       ORDER BY count DESC`,
      [slum]
    );

    const [activeCampaignRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM campaigns
       WHERE slum_area = ? AND status IN ('pending', 'in_progress')`,
      [slum]
    );

    const [complaintRows] = await connection.query(
      `SELECT c.status, COUNT(*) AS count
       FROM complaints c
       JOIN slum_dwellers s ON c.slum_id = s.slum_code
       WHERE s.area = ?
       GROUP BY c.status`,
      [slum]
    );

    const [complaintTotalRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM complaints c
       JOIN slum_dwellers s ON c.slum_id = s.slum_code
       WHERE s.area = ?`,
      [slum]
    );

    const [complaintCategoryRows] = await connection.query(
      `SELECT c.category, COUNT(*) AS count
       FROM complaints c
       JOIN slum_dwellers s ON c.slum_id = s.slum_code
       WHERE s.area = ?
       GROUP BY c.category
       ORDER BY count DESC`,
      [slum]
    );

    const [documentRows] = await connection.query(
      `SELECT d.status, COUNT(*) AS count
       FROM documents d
       JOIN slum_dwellers s ON d.slum_id = s.slum_code
       WHERE s.area = ?
       GROUP BY d.status`,
      [slum]
    );

    const households = householdRows[0]?.households || 0;
    const population = householdRows[0]?.population || 0;

    const genderStats = genderRows.reduce((acc, row) => {
      const key = row.gender || 'Unknown';
      acc[key] = row.count;
      return acc;
    }, {});

    return res.json({
      status: "success",
      data: {
        slum,
        households,
        population,
        adults: households + (spouseRows[0]?.count || 0),
        children: childRows[0]?.count || 0,
        activeProjects: activeCampaignRows[0]?.count || 0,
        gender: genderStats,
        educationTop: educationRows || [],
        occupationTop: occupationRows || [],
        aidByCategory: campaignRows || [],
        complaintsByStatus: complaintRows || [],
        complaintsByCategory: complaintCategoryRows || [],
        documentsByStatus: documentRows || []
        ,complaintsTotal: complaintTotalRows[0]?.count || 0
      }
    });
  } catch (error) {
    console.error("❌ Error fetching slum analytics:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch slum analytics.",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get spouse document (marriage/divorce)
export const getSpouseDocument = async (req, res) => {
  const { slumId, spouseId, docType } = req.params;

  const columnMap = {
    marriage_certificate: 'marriage_certificate',
    divorce_certificate: 'divorce_certificate'
  };

  const column = columnMap[docType];
  if (!column) {
    return res.status(400).json({
      status: "error",
      message: "Invalid document type"
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT ${column} AS file_blob FROM spouses WHERE id = ? AND slum_id = ?`,
      [spouseId, slumId]
    );

    if (!rows.length || !rows[0].file_blob) {
      return res.status(404).json({
        status: "error",
        message: "Document not found"
      });
    }

    const buffer = rows[0].file_blob;
    const mimeType = detectMimeType(buffer);
    const extension = extensionFromMime(mimeType);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docType}.${extension}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('❌ Error fetching spouse document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch spouse document",
      error: error.message
    });
  }
};

// Get child document (birth/death)
export const getChildDocument = async (req, res) => {
  const { slumId, childId, docType } = req.params;

  const columnMap = {
    birth_certificate: 'birth_certificate',
    death_certificate: 'death_certificate'
  };

  const column = columnMap[docType];
  if (!column) {
    return res.status(400).json({
      status: "error",
      message: "Invalid document type"
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT ${column} AS file_blob FROM children WHERE id = ? AND slum_id = ?`,
      [childId, slumId]
    );

    if (!rows.length || !rows[0].file_blob) {
      return res.status(404).json({
        status: "error",
        message: "Document not found"
      });
    }

    const buffer = rows[0].file_blob;
    const mimeType = detectMimeType(buffer);
    const extension = extensionFromMime(mimeType);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docType}.${extension}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('❌ Error fetching child document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch child document",
      error: error.message
    });
  }
};

// List spouse/child documents for a resident (active members only)
export const getMemberDocuments = async (req, res) => {
  const { slumId } = req.params;

  try {
    const [spouseDocs] = await pool.query(
      `SELECT 
         id,
         name,
         created_at,
         CASE WHEN marriage_certificate IS NULL THEN 0 ELSE 1 END AS has_marriage_certificate,
         CASE WHEN divorce_certificate IS NULL THEN 0 ELSE 1 END AS has_divorce_certificate
       FROM spouses
       WHERE slum_id = ? AND status = 'active'`,
      [slumId]
    );

    const [childDocs] = await pool.query(
      `SELECT 
         id,
         name,
         created_at,
         CASE WHEN birth_certificate IS NULL THEN 0 ELSE 1 END AS has_birth_certificate,
         CASE WHEN death_certificate IS NULL THEN 0 ELSE 1 END AS has_death_certificate
       FROM children
       WHERE slum_id = ? AND status = 'active'`,
      [slumId]
    );

    const documents = [];

    spouseDocs.forEach((spouse) => {
      if (spouse.has_marriage_certificate) {
        documents.push({
          source: 'member',
          member_type: 'spouse',
          member_id: spouse.id,
          member_name: spouse.name,
          document_type: 'marriage_certificate',
          document_title: 'Marriage Certificate',
          uploaded_at: spouse.created_at
        });
      }
      if (spouse.has_divorce_certificate) {
        documents.push({
          source: 'member',
          member_type: 'spouse',
          member_id: spouse.id,
          member_name: spouse.name,
          document_type: 'divorce_certificate',
          document_title: 'Divorce Certificate',
          uploaded_at: spouse.created_at
        });
      }
    });

    childDocs.forEach((child) => {
      if (child.has_birth_certificate) {
        documents.push({
          source: 'member',
          member_type: 'child',
          member_id: child.id,
          member_name: child.name,
          document_type: 'birth_certificate',
          document_title: 'Birth Certificate',
          uploaded_at: child.created_at
        });
      }
      if (child.has_death_certificate) {
        documents.push({
          source: 'member',
          member_type: 'child',
          member_id: child.id,
          member_name: child.name,
          document_type: 'death_certificate',
          document_title: 'Death Certificate',
          uploaded_at: child.created_at
        });
      }
    });

    return res.json({
      status: "success",
      data: documents
    });
  } catch (error) {
    console.error('❌ Error fetching member documents:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch member documents",
      error: error.message
    });
  }
};

// Approve pending slum dweller (change status to 'accepted')
export const approveSlumDweller = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get slum dweller details including mobile number and slum_code
    const [dwellerRows] = await connection.query(
      'SELECT slum_code, mobile, full_name FROM slum_dwellers WHERE id = ? AND status = ?',
      [id, 'pending']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found or already processed." 
      });
    }

    const { slum_code: slumCode, mobile, full_name: fullName } = dwellerRows[0];

    // Update slum_dweller status to 'accepted'
    await connection.query(
      'UPDATE slum_dwellers SET status = ? WHERE id = ?',
      ['accepted', id]
    );

    // Approve any documents submitted during registration
    await connection.query(
      `UPDATE documents
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
       WHERE slum_id = ? AND status = 'pending'`,
      ['admin', slumCode]
    );

    // Update all spouses status to 'active'
    await connection.query(
      'UPDATE spouses SET status = ? WHERE slum_id = ?',
      ['active', slumCode]
    );

    // Update all children status to 'active'
    await connection.query(
      'UPDATE children SET status = ? WHERE slum_id = ?',
      ['active', slumCode]
    );

    await connection.commit();

    console.log('✅ Approved slum dweller:', id, 'Slum Code:', slumCode);

    // Send SMS notification (don't fail the approval if SMS fails)
    if (mobile && slumCode) {
      try {
        const message = createVerificationMessage(slumCode);
        const smsSent = await sendSMS(mobile, message);
        if (smsSent) {
          console.log('📱 Verification SMS sent to:', mobile);
        } else {
          console.warn('⚠️ Failed to send verification SMS to:', mobile);
        }
      } catch (smsError) {
        console.error('❌ SMS sending error for user', fullName, ':', smsError.message);
      }
    } else {
      console.warn('⚠️ No mobile number or slum code found for SMS notification');
    }

    return res.json({
      status: "success",
      message: "Account approved successfully."
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error approving slum dweller:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to approve account.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Reject/Delete slum dweller
export const rejectSlumDweller = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get slum_code first
    const [dwellerRows] = await connection.query(
      'SELECT slum_code FROM slum_dwellers WHERE id = ?',
      [id]
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found." 
      });
    }

    const slumCode = dwellerRows[0].slum_code;

    // Delete spouses first (due to foreign key)
    await connection.query(
      'DELETE FROM spouses WHERE slum_id = ?',
      [slumCode]
    );

    // Delete children (due to foreign key)
    await connection.query(
      'DELETE FROM children WHERE slum_id = ?',
      [slumCode]
    );

    // Delete slum_dweller
    await connection.query(
      'DELETE FROM slum_dwellers WHERE id = ?',
      [id]
    );

    await connection.commit();

    console.log('✅ Rejected/deleted slum dweller:', id);

    return res.json({
      status: "success",
      message: "Account rejected and deleted successfully."
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error rejecting slum dweller:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to reject account.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get current user's profile (for dashboard)
export const getCurrentUserProfile = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get main resident info (basic fields for dashboard)
    const [dwellerRows] = await pool.query(
      'SELECT id, slum_code, full_name, mobile, status FROM slum_dwellers WHERE id = ? AND status = ?',
      [id, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "User not found or account not active." 
      });
    }

    const user = dwellerRows[0];

    console.log('👤 Retrieved user profile for dashboard:', user.full_name);

    return res.json({
      status: "success",
      data: {
        id: user.id,
        slum_code: user.slum_code,
        full_name: user.full_name,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch user profile.",
      error: error.message 
    });
  }
};

// Update slum dweller personal information
export const updatePersonalInfo = async (req, res) => {
  try {
    const { slumId } = req.params;
    const updates = req.body;

    // Validate slumId
    if (!slumId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID is required."
      });
    }

    // Enhanced NID validation for updates
    if (updates.nid) {
      const cleanNid = String(updates.nid).replace(/\s+/g, '');
      
      // Check for NID duplicates excluding current user
      const nidCheck = await checkNidDuplicateInternal(cleanNid, slumId);
      if (nidCheck.isDuplicate) {
        return res.status(400).json({
          status: "error",
          message: "NID already exists in the system",
          details: nidCheck.details
        });
      }
    }

    // Build dynamic update query
    const allowedFields = [
      'full_name', 'nid', 'dob', 'gender', 'education', 
      'occupation', 'income', 'area', 'district', 'division', 'family_members',
      'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(slumId);
    
    const [result] = await pool.query(
      `UPDATE slum_dwellers SET ${updateFields.join(', ')} WHERE slum_code = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found."
      });
    }
    
    return res.json({
      status: "success",
      message: "Personal information updated successfully"
    });
    
  } catch (error) {
    console.error("Update Personal Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating personal information."
    });
  }
};

// Update spouse information
export const updateSpouseInfo = async (req, res) => {
  try {
    const { slumId, spouseId } = req.params;
    const updates = req.body;

    // Validate required parameters
    if (!slumId || !spouseId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID and Spouse ID are required."
      });
    }

    // Enhanced NID validation for spouse updates
    if (updates.nid) {
      const cleanNid = String(updates.nid).replace(/\s+/g, '');
      
      // Check for NID duplicates excluding current spouse
      const nidCheck = await checkNidDuplicateInternal(cleanNid, slumId, spouseId);
      if (nidCheck.isDuplicate) {
        return res.status(400).json({
          status: "error",
          message: "NID already exists in the system",
          details: nidCheck.details
        });
      }
      
      // Check if spouse NID matches the main dweller's NID
      const [dwellerRows] = await pool.query(
        'SELECT nid FROM slum_dwellers WHERE slum_code = ?',
        [slumId]
      );
      
      if (dwellerRows.length > 0 && dwellerRows[0].nid) {
        const dwellerNid = String(dwellerRows[0].nid).replace(/\s+/g, '');
        if (cleanNid === dwellerNid) {
          return res.status(400).json({
            status: "error",
            message: "Spouse NID cannot be the same as main dweller's NID"
          });
        }
      }
      
      // Check if spouse NID matches other spouses' NIDs
      const [otherSpousesRows] = await pool.query(
        'SELECT COUNT(*) as count FROM spouses WHERE slum_id = ? AND id != ? AND nid = ? AND status != "pending_remove"',
        [slumId, spouseId, cleanNid]
      );
      
      if (otherSpousesRows[0].count > 0) {
        return res.status(400).json({
          status: "error",
          message: "NID already exists among other spouses"
        });
      }
    }

    // Build dynamic update query for spouse
    const allowedFields = [
      'name', 'dob', 'gender', 'nid', 'education', 
      'job', 'income', 'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(spouseId, slumId);
    
    const [result] = await pool.query(
      `UPDATE spouses SET ${updateFields.join(', ')} WHERE id = ? AND slum_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found."
      });
    }
    
    return res.json({
      status: "success",
      message: "Spouse information updated successfully"
    });
    
  } catch (error) {
    console.error("Update Spouse Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating spouse information."
    });
  }
};

// Update child information
export const updateChildInfo = async (req, res) => {
  try {
    const { slumId, childId } = req.params;
    const updates = req.body;

    // Validate required parameters
    if (!slumId || !childId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID and Child ID are required."
      });
    }

    // Build dynamic update query for child
    const allowedFields = [
      'name', 'dob', 'gender', 'education', 
      'job', 'income', 'preferred_job', 'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    // Check if date of birth is being updated to recalculate age_group
    let shouldUpdateAgeGroup = false;
    let newAgeGroup = null;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
        
        // If date of birth is being updated, calculate new age group
        if (key === 'dob' && updates[key]) {
          const childAge = calculateAge(updates[key]);
          newAgeGroup = getAgeGroup(childAge);
          shouldUpdateAgeGroup = true;
          console.log(`🔄 Child DOB updated, new age: ${childAge}, new age group: ${newAgeGroup}`);
        }
      }
    });
    
    // Add age_group to update if DOB was changed
    if (shouldUpdateAgeGroup && newAgeGroup) {
      updateFields.push('age_group = ?');
      updateValues.push(newAgeGroup);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(childId, slumId);
    
    const [result] = await pool.query(
      `UPDATE children SET ${updateFields.join(', ')} WHERE id = ? AND slum_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Child not found."
      });
    }
    
    const responseMessage = shouldUpdateAgeGroup 
      ? `Child information updated successfully (age group: ${newAgeGroup})`
      : "Child information updated successfully";
    
    return res.json({
      status: "success",
      message: responseMessage
    });
    
  } catch (error) {
    console.error("Update Child Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating child information."
    });
  }
};

// In-memory storage for OTPs (In production, use Redis or database)
const otpStorage = new Map();

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with expiry
function storeOTP(key, otp, expiryMinutes = 5) {
  const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
  otpStorage.set(key, { otp, expiryTime });
}

// Verify and consume OTP
function verifyOTP(key, providedOTP) {
  const otpData = otpStorage.get(key);
  if (!otpData) return false;
  
  if (Date.now() > otpData.expiryTime) {
    otpStorage.delete(key);
    return false;
  }
  
  if (otpData.otp === providedOTP) {
    otpStorage.delete(key);
    return true;
  }
  
  return false;
}

// Initialize phone number change process
export const initPhoneChange = async (req, res) => {
  try {
    const { slumCode } = req.body;

    if (!slumCode) {
      return res.status(400).json({
        status: "error",
        message: "Slum code is required."
      });
    }

    // Get current user's phone number
    const [dwellers] = await pool.query(
      'SELECT mobile FROM slum_dwellers WHERE slum_code = ? AND status = "accepted"',
      [slumCode]
    );

    if (dwellers.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found or not active."
      });
    }

    const currentPhone = dwellers[0].mobile;
    if (!currentPhone) {
      return res.status(400).json({
        status: "error",
        message: "No phone number registered for this account."
      });
    }

    // Generate OTP for current phone verification
    const otp = generateOTP();
    const otpKey = `phone_change_current_${slumCode}`;
    storeOTP(otpKey, otp);

    // Send OTP to current phone
    const message = `Your SlumLink phone change verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(currentPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your current phone number",
      maskedPhone: currentPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Init Phone Change Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while initiating phone change."
    });
  }
};

// Verify current phone OTP
export const verifyCurrentPhone = async (req, res) => {
  try {
    const { slumCode, otp } = req.body;

    if (!slumCode || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and OTP are required."
      });
    }

    const otpKey = `phone_change_current_${slumCode}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Store verification status for new phone step
    const verifiedKey = `phone_change_verified_${slumCode}`;
    storeOTP(verifiedKey, "verified", 10); // 10 minutes to complete process

    return res.json({
      status: "success",
      message: "Current phone verified successfully"
    });

  } catch (error) {
    console.error("Verify Current Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while verifying current phone."
    });
  }
};

// Send OTP to new phone number
export const sendNewPhoneOTP = async (req, res) => {
  try {
    const { slumCode, newPhone } = req.body;

    if (!slumCode || !newPhone) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and new phone number are required."
      });
    }

    // Validate phone number format (11 digits)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    // Check if user has verified current phone
    const verifiedKey = `phone_change_verified_${slumCode}`;
    const verifiedData = otpStorage.get(verifiedKey);
    if (!verifiedData || Date.now() > verifiedData.expiryTime) {
      return res.status(400).json({
        status: "error",
        message: "Current phone verification expired. Please start over."
      });
    }

    // Check if new phone is already registered
    const [existingUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM slum_dwellers WHERE mobile = ? AND slum_code != ?',
      [newPhone, slumCode]
    );

    if (existingUsers[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "This phone number is already registered with another account."
      });
    }

    // Generate OTP for new phone
    const otp = generateOTP();
    const otpKey = `phone_change_new_${slumCode}_${newPhone}`;
    storeOTP(otpKey, otp);

    // Send OTP to new phone
    const message = `Your SlumLink new phone verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(newPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP to new phone. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your new phone number",
      maskedPhone: newPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Send New Phone OTP Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while sending OTP to new phone."
    });
  }
};

// Verify new phone and update database
export const verifyNewPhoneAndUpdate = async (req, res) => {
  try {
    const { slumCode, newPhone, otp } = req.body;

    if (!slumCode || !newPhone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, new phone number, and OTP are required."
      });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    const otpKey = `phone_change_new_${slumCode}_${newPhone}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Update phone number in database
    const [result] = await pool.query(
      'UPDATE slum_dwellers SET mobile = ? WHERE slum_code = ?',
      [newPhone, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found."
      });
    }

    // Clean up verification status
    const verifiedKey = `phone_change_verified_${slumCode}`;
    otpStorage.delete(verifiedKey);

    return res.json({
      status: "success",
      message: "Phone number updated successfully"
    });

  } catch (error) {
    console.error("Verify New Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating phone number."
    });
  }
};

// ===================
// SPOUSE PHONE NUMBER CHANGE FUNCTIONS
// ===================

// Initialize spouse phone number change process
export const initSpousePhoneChange = async (req, res) => {
  try {
    const { slumCode, spouseId } = req.body;

    if (!slumCode || !spouseId) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and spouse ID are required."
      });
    }

    // Get spouse's current phone number
    const [spouses] = await pool.query(
      'SELECT mobile FROM spouses WHERE id = ? AND slum_id = ? AND status = "active"',
      [spouseId, slumCode]
    );

    if (spouses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found or not active."
      });
    }

    const currentPhone = spouses[0].mobile;
    if (!currentPhone) {
      return res.status(400).json({
        status: "error",
        message: "No phone number registered for this spouse."
      });
    }

    // Generate OTP for current phone verification
    const otp = generateOTP();
    const otpKey = `spouse_phone_change_current_${slumCode}_${spouseId}`;
    storeOTP(otpKey, otp);

    // Send OTP to current phone
    const message = `Your SlumLink spouse phone change verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(currentPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to current phone number",
      maskedPhone: currentPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Init Spouse Phone Change Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while initiating spouse phone change."
    });
  }
};

// Verify spouse current phone OTP
export const verifySpouseCurrentPhone = async (req, res) => {
  try {
    const { slumCode, spouseId, otp } = req.body;

    if (!slumCode || !spouseId || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, and OTP are required."
      });
    }

    const otpKey = `spouse_phone_change_current_${slumCode}_${spouseId}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Store verification status for new phone step
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    storeOTP(verifiedKey, "verified", 10); // 10 minutes to complete process

    return res.json({
      status: "success",
      message: "Current phone verified successfully"
    });

  } catch (error) {
    console.error("Verify Spouse Current Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while verifying current phone."
    });
  }
};

// Send OTP to spouse new phone number
export const sendSpouseNewPhoneOTP = async (req, res) => {
  try {
    const { slumCode, spouseId, newPhone } = req.body;

    if (!slumCode || !spouseId || !newPhone) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, and new phone number are required."
      });
    }

    // Validate phone number format (11 digits)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    // Check if spouse has verified current phone
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    const verifiedData = otpStorage.get(verifiedKey);
    if (!verifiedData || Date.now() > verifiedData.expiryTime) {
      return res.status(400).json({
        status: "error",
        message: "Current phone verification expired. Please start over."
      });
    }

    // Check if new phone is already registered (for any slum dweller or spouse)
    const [existingDwellers] = await pool.query(
      'SELECT COUNT(*) as count FROM slum_dwellers WHERE mobile = ?',
      [newPhone]
    );
    
    const [existingSpouses] = await pool.query(
      'SELECT COUNT(*) as count FROM spouses WHERE mobile = ? AND NOT (slum_id = ? AND id = ?)',
      [newPhone, slumCode, spouseId]
    );

    if (existingDwellers[0].count > 0 || existingSpouses[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "This phone number is already registered with another account."
      });
    }

    // Generate OTP for new phone
    const otp = generateOTP();
    const otpKey = `spouse_phone_change_new_${slumCode}_${spouseId}_${newPhone}`;
    storeOTP(otpKey, otp);

    // Send OTP to new phone
    const message = `Your SlumLink new spouse phone verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(newPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP to new phone. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your new phone number",
      maskedPhone: newPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Send Spouse New Phone OTP Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while sending OTP to new phone."
    });
  }
};

// Verify spouse new phone and update database
export const verifySpouseNewPhoneAndUpdate = async (req, res) => {
  try {
    const { slumCode, spouseId, newPhone, otp } = req.body;

    if (!slumCode || !spouseId || !newPhone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, new phone number, and OTP are required."
      });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    const otpKey = `spouse_phone_change_new_${slumCode}_${spouseId}_${newPhone}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Update spouse phone number in database
    const [result] = await pool.query(
      'UPDATE spouses SET mobile = ? WHERE id = ? AND slum_id = ?',
      [newPhone, spouseId, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found."
      });
    }

    // Clean up verification status
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    otpStorage.delete(verifiedKey);

    return res.json({
      status: "success",
      message: "Spouse phone number updated successfully"
    });

  } catch (error) {
    console.error("Verify Spouse New Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating spouse phone number."
    });
  }
};

// Change password for slum dweller
export const changePassword = async (req, res) => {
  try {
    const { slumCode } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!slumCode || !currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, current password, and new password are required."
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters long."
      });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        status: "error",
        message: "New password must be different from current password."
      });
    }

    // Get the slum dweller profile from database
    const [residents] = await pool.query(
      'SELECT id, slum_code, password_hash FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slumCode, 'accepted']
    );
    
    if (residents.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or account not approved."
      });
    }

    const resident = residents[0];

    // Verify current password using bcrypt
    const passwordMatch = await bcrypt.compare(currentPassword, resident.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({
        status: "error",
        message: "Current password is incorrect."
      });
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const [result] = await pool.query(
      'UPDATE slum_dwellers SET password_hash = ?, updated_at = NOW() WHERE slum_code = ?',
      [hashedNewPassword, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        status: "error",
        message: "Failed to update password."
      });
    }

    console.log(`Password changed successfully for slum dweller: ${slumCode}`);

    return res.status(200).json({
      status: "success",
      message: "Password changed successfully."
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while changing password."
    });
  }
};

// Update spouse status (for removal requests)
export const updateSpouseStatus = async (req, res) => {
  const { slumId, spouseId } = req.params;
  const { status } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    // Validate status value
    const allowedStatuses = ['active', 'pending_remove', 'removed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value. Allowed values: active, pending_remove, removed"
      });
    }

    // Check if spouse exists and belongs to the slum dweller
    const [spouseRows] = await connection.query(
      'SELECT id FROM spouses WHERE id = ? AND slum_id = ?',
      [spouseId, slumId]
    );

    if (spouseRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found or does not belong to this slum dweller"
      });
    }

    let updateQuery = 'UPDATE spouses SET status = ?, updated_at = NOW()';
    let updateParams = [status];

    // Handle file upload if provided
    if (req.file) {
      const divorceFile = req.file;
      updateQuery += ', divorce_certificate = ?';
      updateParams.push(divorceFile.buffer);
      console.log(`📁 Divorce certificate uploaded for spouse ${spouseId}`);
    }

    updateQuery += ' WHERE id = ? AND slum_id = ?';
    updateParams.push(spouseId, slumId);

    // Update spouse status and certificate
    const [result] = await connection.query(updateQuery, updateParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Failed to update spouse status"
      });
    }

    console.log(`✅ Spouse ${spouseId} status updated to '${status}' for slum dweller ${slumId}`);

    return res.json({
      status: "success",
      message: `Spouse status updated to '${status}' successfully`
    });

  } catch (error) {
    console.error("❌ Error updating spouse status:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update spouse status",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update child status (for removal requests)
export const updateChildStatus = async (req, res) => {
  const { slumId, childId } = req.params;
  const { status } = req.body;
  
  const connection = await pool.getConnection();
  
  try {
    // Validate status value
    const allowedStatuses = ['active', 'pending_remove', 'removed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value. Allowed values: active, pending_remove, removed"
      });
    }

    // Check if child exists and belongs to the slum dweller
    const [childRows] = await connection.query(
      'SELECT id FROM children WHERE id = ? AND slum_id = ?',
      [childId, slumId]
    );

    if (childRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Child not found or does not belong to this slum dweller"
      });
    }

    let updateQuery = 'UPDATE children SET status = ?, updated_at = NOW()';
    let updateParams = [status];

    // Handle file upload if provided
    if (req.file) {
      const deathFile = req.file;
      updateQuery += ', death_certificate = ?';
      updateParams.push(deathFile.buffer);
      console.log(`📁 Death certificate uploaded for child ${childId}`);
    }

    updateQuery += ' WHERE id = ? AND slum_id = ?';
    updateParams.push(childId, slumId);

    // Update child status and certificate
    const [result] = await connection.query(updateQuery, updateParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Failed to update child status"
      });
    }

    console.log(`✅ Child ${childId} status updated to '${status}' for slum dweller ${slumId}`);

    return res.json({
      status: "success",
      message: `Child status updated to '${status}' successfully`
    });

  } catch (error) {
    console.error("❌ Error updating child status:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update child status",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Review spouse add/remove requests (admin)
export const reviewSpouseUpdate = async (req, res) => {
  const { slumId, spouseId } = req.params;
  const { action } = req.body;
  const connection = await pool.getConnection();

  try {
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid action. Allowed values: approve, reject"
      });
    }

    // Get spouse and slum dweller information for SMS notifications
    const [spouseRows] = await connection.query(
      `SELECT s.id, s.status, s.name, s.mobile, sd.full_name as slum_dweller_name
       FROM spouses s 
       JOIN slum_dwellers sd ON s.slum_id = sd.slum_code 
       WHERE s.id = ? AND s.slum_id = ?`,
      [spouseId, slumId]
    );

    if (spouseRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found or does not belong to this slum dweller"
      });
    }

    const spouseInfo = spouseRows[0];
    const currentStatus = spouseInfo.status;
    const spouseMobile = spouseInfo.mobile;
    const slumDwellerName = spouseInfo.slum_dweller_name;

    if (!['pending_add', 'pending_remove'].includes(currentStatus)) {
      return res.status(400).json({
        status: "error",
        message: "No pending update found for this spouse"
      });
    }

    let smsMessage = '';
    let sendSMSNotification = false;

    if (currentStatus === 'pending_add') {
      if (action === 'approve') {
        await connection.query(
          'UPDATE spouses SET status = ?, updated_at = NOW() WHERE id = ? AND slum_id = ?',
          ['active', spouseId, slumId]
        );
        // Send SMS notification to spouse about being added
        if (spouseMobile) {
          smsMessage = createSpouseAddedMessage(spouseInfo.name, slumDwellerName);
          sendSMSNotification = true;
        }
      } else {
        await connection.query(
          'DELETE FROM spouses WHERE id = ? AND slum_id = ?',
          [spouseId, slumId]
        );
        // No SMS for rejection of add request
      }
    }

    if (currentStatus === 'pending_remove') {
      if (action === 'approve') {
        await connection.query(
          'DELETE FROM spouses WHERE id = ? AND slum_id = ?',
          [spouseId, slumId]
        );
        // Send SMS notification to spouse about being removed
        if (spouseMobile) {
          smsMessage = createSpouseRemovedMessage(spouseInfo.name, slumDwellerName);
          sendSMSNotification = true;
        }
      } else {
        await connection.query(
          'UPDATE spouses SET status = ?, updated_at = NOW() WHERE id = ? AND slum_id = ?',
          ['active', spouseId, slumId]
        );
        // No SMS for rejection of remove request
      }
    }

    // Send SMS notification if applicable
    if (sendSMSNotification && smsMessage) {
      try {
        const smsResult = await sendSMS(spouseMobile, smsMessage);
        if (smsResult) {
          console.log(`📱 SMS sent to spouse (${spouseMobile}) for ${currentStatus} ${action} operation`);
        } else {
          console.warn(`⚠️ Failed to send SMS to spouse (${spouseMobile}) for ${currentStatus} ${action} operation`);
        }
      } catch (smsError) {
        console.error(`❌ SMS sending error for spouse (${spouseMobile}):`, smsError);
        // Don't fail the entire operation if SMS fails
      }
    }

    return res.json({
      status: "success",
      message: `Spouse update ${action}ed successfully`
    });
  } catch (error) {
    console.error("❌ Error reviewing spouse update:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to review spouse update",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Review child add/remove requests (admin)
export const reviewChildUpdate = async (req, res) => {
  const { slumId, childId } = req.params;
  const { action } = req.body;
  const connection = await pool.getConnection();

  try {
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid action. Allowed values: approve, reject"
      });
    }

    const [rows] = await connection.query(
      'SELECT id, status FROM children WHERE id = ? AND slum_id = ?',
      [childId, slumId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Child not found or does not belong to this slum dweller"
      });
    }

    const currentStatus = rows[0].status;

    if (!['pending_add', 'pending_remove'].includes(currentStatus)) {
      return res.status(400).json({
        status: "error",
        message: "No pending update found for this child"
      });
    }

    if (currentStatus === 'pending_add') {
      if (action === 'approve') {
        await connection.query(
          'UPDATE children SET status = ?, updated_at = NOW() WHERE id = ? AND slum_id = ?',
          ['active', childId, slumId]
        );
      } else {
        await connection.query(
          'DELETE FROM children WHERE id = ? AND slum_id = ?',
          [childId, slumId]
        );
      }
    }

    if (currentStatus === 'pending_remove') {
      if (action === 'approve') {
        await connection.query(
          'DELETE FROM children WHERE id = ? AND slum_id = ?',
          [childId, slumId]
        );
      } else {
        await connection.query(
          'UPDATE children SET status = ?, updated_at = NOW() WHERE id = ? AND slum_id = ?',
          ['active', childId, slumId]
        );
      }
    }

    return res.json({
      status: "success",
      message: `Child update ${action}ed successfully`
    });
  } catch (error) {
    console.error("❌ Error reviewing child update:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to review child update",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Prepare spouse addition - validate and send OTP without database insertion
export const prepareSpouseAdd = async (req, res) => {
  const { slumCode } = req.params;
  const connection = await pool.getConnection();

  try {
    // Verify the slum dweller exists and is active
    const [dwellerRows] = await connection.query(
      'SELECT id, slum_code FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slumCode, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or not active"
      });
    }

    // Parse spouse data from FormData
    let spouseData;
    try {
      spouseData = JSON.parse(req.body.spouseData);
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Invalid spouse data format"
      });
    }

    // Trim spaces from NID
    if (spouseData.nid) {
      spouseData.nid = spouseData.nid.replace(/\s+/g, '');
    }

    // Check for NID duplicate
    const nidDuplicateCheck = await checkNidDuplicateInternal(
      spouseData.nid,
      slumCode,
      null,
      'spouse_add'
    );

    if (nidDuplicateCheck.isDuplicate) {
      return res.status(400).json({
        status: "error",
        message: nidDuplicateCheck.message
      });
    }

    // Handle file upload (binary data for LONGBLOB)
    let marriage_certificate = null;
    if (req.file && req.file.buffer) {
      marriage_certificate = req.file.buffer;
    }

    // Store spouse data temporarily for OTP verification
    if (!global.pendingSpouseData) {
      global.pendingSpouseData = new Map();
    }

    const spouseKey = `spouse_${slumCode}_${spouseData.mobile}_${Date.now()}`;
    global.pendingSpouseData.set(spouseKey, {
      slumCode: slumCode,
      spouseData: spouseData,
      marriage_certificate: marriage_certificate,
      expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log('✅ Spouse data prepared for OTP verification:', spouseKey);

    return res.json({
      status: "success",
      message: "Spouse data validated. Ready for OTP verification.",
      data: {
        spouseKey: spouseKey,
        mobile: spouseData.mobile,
        name: spouseData.name
      }
    });

  } catch (error) {
    console.error("❌ Error preparing spouse add:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to prepare spouse addition",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Add spouse with pending_add status (kept for backward compatibility if needed)
export const addSpouse = async (req, res) => {
  const { slumCode } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify the slum dweller exists and is active
    const [dwellerRows] = await connection.query(
      'SELECT id, slum_code FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slumCode, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or not active"
      });
    }

    // Parse spouse data from FormData
    let spouseData;
    try {
      spouseData = JSON.parse(req.body.spouseData);
    } catch (error) {
      await connection.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid spouse data format"
      });
    }

    // Trim spaces from NID
    if (spouseData.nid) {
      spouseData.nid = spouseData.nid.replace(/\s+/g, '');
    }

    // Check for NID duplicate
    const nidDuplicateCheck = await checkNidDuplicateInternal(
      spouseData.nid,
      slumCode,
      null,
      'spouse_add'
    );

    if (nidDuplicateCheck.isDuplicate) {
      await connection.rollback();
      return res.status(400).json({
        status: "error",
        message: nidDuplicateCheck.message
      });
    }

    // Handle file upload (binary data for LONGBLOB)
    let marriage_certificate = null;
    if (req.file && req.file.buffer) {
      marriage_certificate = req.file.buffer;
    }

    // Insert spouse with pending_add status
    const [insertResult] = await connection.query(
      `INSERT INTO spouses 
       (slum_id, name, dob, gender, nid, mobile, education, job, skills_1, skills_2, income, 
        marriage_certificate, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        slumCode,
        spouseData.name,
        spouseData.dob,
        spouseData.gender,
        spouseData.nid,
        spouseData.mobile,
        spouseData.education,
        spouseData.job,
        spouseData.skills_1,
        spouseData.skills_2,
        spouseData.income,
        marriage_certificate,
        'pending_add'
      ]
    );

    await connection.commit();

    console.log('✅ Spouse added with pending_add status:', insertResult.insertId);

    return res.json({
      status: "success",
      message: "Spouse added successfully with pending verification",
      data: {
        spouseId: insertResult.insertId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error adding spouse:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to add spouse",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Add child with pending_add status
export const addChild = async (req, res) => {
  const { slumCode } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify the slum dweller exists and is active
    const [dwellerRows] = await connection.query(
      'SELECT id, slum_code FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slumCode, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or not active"
      });
    }

    // Parse child data from FormData
    let childData;
    try {
      childData = JSON.parse(req.body.childData);
    } catch (error) {
      await connection.rollback();
      return res.status(400).json({
        status: "error",
        message: "Invalid child data format"
      });
    }

    // Check for birth certificate duplicate if provided
    if (childData.birth_certificate_number) {
      const cleanCertNumber = String(childData.birth_certificate_number).replace(/\s+/g, '');
      
      // Validate 17-digit format
      if (!/^\d{17}$/.test(cleanCertNumber)) {
        await connection.rollback();
        return res.status(400).json({
          status: "error",
          message: "Birth certificate number must be exactly 17 digits"
        });
      }

      // Update childData with cleaned number
      childData.birth_certificate_number = cleanCertNumber;

      // Check if birth certificate number already exists
      const [existingRows] = await connection.query(
        'SELECT COUNT(*) as count FROM children WHERE birth_certificate_number = ?',
        [cleanCertNumber]
      );

      if (existingRows[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          status: "error",
          message: "Birth certificate number already exists in the system"
        });
      }
    }

    // Handle file upload (binary data for LONGBLOB)
    let birth_certificate = null;
    if (req.file && req.file.buffer) {
      birth_certificate = req.file.buffer;
    }

    // Calculate age and determine age group
    const childAge = calculateAge(childData.dob);
    const ageGroup = getAgeGroup(childAge);

    console.log(`👶 Child: ${childData.name}, DOB: ${childData.dob}, Age: ${childAge}, Age Group: ${ageGroup}`);

    // Insert child with pending_add status
    const [insertResult] = await connection.query(
      `INSERT INTO children 
       (slum_id, name, dob, gender, birth_certificate_number, education, job, skills_1, skills_2, 
        income, preferred_job, birth_certificate, age_group, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        slumCode,
        childData.name,
        childData.dob,
        childData.gender,
        childData.birth_certificate_number || null,
        childData.education,
        childData.job,
        childData.skills_1,
        childData.skills_2,
        childData.income,
        childData.preferred_job,
        birth_certificate,
        ageGroup,
        'pending_add'
      ]
    );

    await connection.commit();

    console.log('✅ Child added with pending_add status:', insertResult.insertId);

    return res.json({
      status: "success",
      message: "Child added successfully with pending verification",
      data: {
        childId: insertResult.insertId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error adding child:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to add child",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Send OTP to spouse mobile for add verification
export const sendSpouseAddOTP = async (req, res) => {
  try {
    const { mobile, spouseName, spouseKey } = req.body;

    if (!mobile || !spouseName) {
      return res.status(400).json({
        status: "error",
        message: "Mobile number and spouse name are required"
      });
    }

    // If spouseKey is provided, verify it exists in pendingSpouseData
    if (spouseKey) {
      if (!global.pendingSpouseData) {
        global.pendingSpouseData = new Map();
      }

      const pendingData = global.pendingSpouseData.get(spouseKey);
      if (!pendingData) {
        return res.status(400).json({
          status: "error",
          message: "Invalid or expired spouse preparation data. Please restart the process."
        });
      }

      // Check if data has expired
      if (Date.now() > pendingData.expiry) {
        global.pendingSpouseData.delete(spouseKey);
        return res.status(400).json({
          status: "error",
          message: "Spouse preparation data has expired. Please restart the process."
        });
      }
    }

    // Validate mobile number format
    const mobileRegex = /^[0-9]{11}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid mobile number format. Must be 11 digits."
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpMessage = createOTPMessage(otp, spouseName, 'spouse verification');

    // Store OTP in temporary storage (in production, use Redis or database)
    const otpKey = `spouse_add_otp_${mobile}`;
    if (!global.otpStorage) {
      global.otpStorage = new Map();
    }
    
    global.otpStorage.set(otpKey, {
      otp: otp.toString(),
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
      mobile: mobile,
      spouseName: spouseName,
      spouseKey: spouseKey // Link OTP to spouse preparation data
    });

    // Send OTP via SMS
    const smsResult = await sendSMS(mobile, otpMessage);

    if (!smsResult) {
      if (!process.env.BULKSMS_API_KEY) {
        console.warn('⚠️ SMS disabled: returning test OTP for development.');
        return res.json({
          status: "success",
          message: "OTP generated (SMS disabled).",
          data: {
            maskedPhone: mobile.replace(/(\d{3})\d{5}(\d{3})/, '$1*****$2'),
            testOtp: otp.toString()
          }
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP. Please check the mobile number and try again."
      });
    }

    console.log(`✅ Spouse add OTP sent to ${mobile} for ${spouseName}`);

    return res.json({
      status: "success",
      message: "OTP sent successfully to spouse mobile number",
      data: {
        maskedPhone: mobile.replace(/(\d{3})\d{5}(\d{3})/, '$1*****$2')
      }
    });

  } catch (error) {
    console.error("❌ Error sending spouse add OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to send OTP",
      error: error.message
    });
  }
};

// Verify spouse add OTP
export const verifySpouseAddOTP = async (req, res) => {
  try {
    const { mobile, otp, spouseKey } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Mobile number and OTP are required"
      });
    }

    // Check OTP from temporary storage
    const otpKey = `spouse_add_otp_${mobile}`;
    if (!global.otpStorage) {
      global.otpStorage = new Map();
    }

    const storedOtpData = global.otpStorage.get(otpKey);

    if (!storedOtpData) {
      return res.status(400).json({
        status: "error",
        message: "OTP not found or expired. Please request a new OTP."
      });
    }

    // Check OTP expiry
    if (Date.now() > storedOtpData.expiry) {
      global.otpStorage.delete(otpKey);
      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP. Please check and try again."
      });
    }

    // Get the spouseKey from either request body or stored OTP data
    const actualSpouseKey = spouseKey || storedOtpData.spouseKey;
    
    if (!actualSpouseKey) {
      return res.status(400).json({
        status: "error",
        message: "Spouse preparation data not found. Please restart the process."
      });
    }

    // Get spouse data from temporary storage
    if (!global.pendingSpouseData) {
      global.pendingSpouseData = new Map();
    }

    const pendingData = global.pendingSpouseData.get(actualSpouseKey);
    if (!pendingData) {
      return res.status(400).json({
        status: "error",
        message: "Spouse preparation data not found or expired. Please restart the process."
      });
    }

    // Check if pending data has expired
    if (Date.now() > pendingData.expiry) {
      global.pendingSpouseData.delete(actualSpouseKey);
      return res.status(400).json({
        status: "error",
        message: "Spouse preparation data has expired. Please restart the process."
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert the spouse data after successful OTP verification with pending_add status
      const [insertResult] = await connection.query(
        `INSERT INTO spouses 
         (slum_id, name, dob, gender, nid, mobile, education, job, skills_1, skills_2, income, 
          marriage_certificate, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          pendingData.slumCode,
          pendingData.spouseData.name,
          pendingData.spouseData.dob,
          pendingData.spouseData.gender,
          pendingData.spouseData.nid,
          pendingData.spouseData.mobile,
          pendingData.spouseData.education,
          pendingData.spouseData.job,
          pendingData.spouseData.skills_1,
          pendingData.spouseData.skills_2,
          pendingData.spouseData.income,
          pendingData.marriage_certificate,
          'pending_add' // Insert with pending_add status after OTP verification
        ]
      );

      await connection.commit();

      // Clear both OTP and pending data from storage
      global.otpStorage.delete(otpKey);
      global.pendingSpouseData.delete(actualSpouseKey);

      console.log('✅ Spouse add OTP verified and spouse inserted successfully with pending_add status for:', mobile, 'ID:', insertResult.insertId);

      return res.json({
        status: "success",
        message: "Spouse verification completed and added successfully with pending status",
        data: {
          spouseId: insertResult.insertId
        }
      });

    } catch (dbError) {
      await connection.rollback();
      console.error("❌ Database error during spouse insertion:", dbError);
      return res.status(500).json({
        status: "error",
        message: "Failed to add spouse to database after verification"
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("❌ Error verifying spouse add OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify OTP",
      error: error.message
    });
  }
};

// Get spouses by slum area
export const getSpousesByArea = async (req, res) => {
  try {
    const area = (req.query.area || '').trim();

    if (!area) {
      return res.status(400).json({
        status: "error",
        message: "Area name is required."
      });
    }

    const [spouses] = await pool.query(
      `SELECT 
         s.id,
         s.slum_id,
         s.name,
         s.dob,
         s.gender,
         s.nid,
         s.education,
         s.job,
         s.income,
         s.mobile,
         s.status
       FROM spouses s
       JOIN slum_dwellers sd ON s.slum_id = sd.slum_code
       WHERE sd.area = ? AND s.status IN ('active', 'pending_add')
       ORDER BY s.created_at DESC`,
      [area]
    );

    console.log('📋 Retrieved spouses for area:', area, '- Count:', spouses.length);
    return res.json({
      status: "success",
      data: spouses || []
    });
  } catch (error) {
    console.error("❌ Error fetching spouses by area:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch spouses.",
      error: error.message
    });
  }
};

// Get children by slum area
export const getChildrenByArea = async (req, res) => {
  try {
    const area = (req.query.area || '').trim();

    if (!area) {
      return res.status(400).json({
        status: "error",
        message: "Area name is required."
      });
    }

    const [children] = await pool.query(
      `SELECT 
         c.id,
         c.slum_id,
         c.name,
         c.dob,
         c.gender,
         c.education,
         c.job,
         c.income,
         c.preferred_job,
         c.status,
         c.age_group
       FROM children c
       JOIN slum_dwellers sd ON c.slum_id = sd.slum_code
       WHERE sd.area = ? AND c.status IN ('active', 'pending_add')
       ORDER BY c.created_at DESC`,
      [area]
    );

    console.log('📋 Retrieved children for area:', area, '- Count:', children.length);
    return res.json({
      status: "success",
      data: children || []
    });
  } catch (error) {
    console.error("❌ Error fetching children by area:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch children.",
      error: error.message
    });
  }
};
