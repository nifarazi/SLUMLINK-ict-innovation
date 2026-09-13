import pool from "../db.js";

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

// Create a new complaint
export const createComplaint = async (req, res) => {
  try {
    const { slum_id, title, category, description, attachment } = req.body;

    // Validate required fields
    if (!slum_id || !title || !category || !description || !attachment) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required (slum_id, title, category, description, attachment)."
      });
    }

    // Get slum dweller's location information (division, district, area)
    const [dwellerRows] = await pool.query(
      'SELECT division, district, area FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slum_id, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or account not active."
      });
    }

    const dwellerLocation = dwellerRows[0];
    const division = dwellerLocation.division || 'Not specified';
    const district = dwellerLocation.district || 'Not specified';
    const area = dwellerLocation.area || 'Not specified';

    // Convert attachment Data URL to Buffer
    const attachmentBuffer = dataUrlToBuffer(attachment);
    if (!attachmentBuffer) {
      return res.status(400).json({
        status: "error",
        message: "Invalid attachment format. Please provide a valid base64 encoded image."
      });
    }

    // Extract filename and mimetype from the data URL
    const mimetypeMatch = attachment.match(/^data:([^;]+)/);
    const mimetype = mimetypeMatch ? mimetypeMatch[1] : 'application/octet-stream';
    
    // Generate filename based on title
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const extension = mimetype.split('/')[1] || 'jpg';
    const filename = `${sanitizedTitle}_${Date.now()}.${extension}`;

    // Insert complaint into database
    const sql = `
      INSERT INTO complaints 
      (slum_id, title, category, description, division, district, area,
       attachment_filename, attachment_mimetype, attachment_size, attachment_file, 
       status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;

    const values = [
      slum_id,
      title,
      category,
      description,
      division,
      district,
      area,
      filename,
      mimetype,
      attachmentBuffer.length,
      attachmentBuffer
    ];

    const [result] = await pool.query(sql, values);

    console.log('✅ Complaint created successfully:', {
      complaint_id: result.insertId,
      slum_id,
      title,
      division,
      district,
      area
    });

    return res.status(201).json({
      status: "success",
      message: "Complaint submitted successfully.",
      data: {
        complaint_id: result.insertId,
        slum_id,
        title,
        category,
        division,
        district,
        area,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error creating complaint:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to submit complaint. Please try again.",
      error: error.message
    });
  }
};

// Get all complaints for a specific slum dweller
export const getComplaintsBySlumId = async (req, res) => {
  try {
    const { slum_id } = req.params;

    const [complaints] = await pool.query(
      `SELECT complaint_id, slum_id, title, category, description, division, district, area, 
              status, responded_by, created_at, updated_at,
              attachment_filename, attachment_mimetype, attachment_size
       FROM complaints 
       WHERE slum_id = ? 
       ORDER BY created_at DESC`,
      [slum_id]
    );

    return res.json({
      status: "success",
      data: complaints || []
    });

  } catch (error) {
    console.error("❌ Error fetching complaints:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch complaints.",
      error: error.message
    });
  }
};

// Get a single complaint with attachment
export const getComplaintById = async (req, res) => {
  try {
    const { complaint_id } = req.params;

    const [complaints] = await pool.query(
      'SELECT * FROM complaints WHERE complaint_id = ?',
      [complaint_id]
    );

    if (!complaints || complaints.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Complaint not found."
      });
    }

    const complaint = complaints[0];

    // Convert BLOB to base64 for frontend display
    if (complaint.attachment_file) {
      const base64 = complaint.attachment_file.toString('base64');
      complaint.attachment = `data:${complaint.attachment_mimetype};base64,${base64}`;
      delete complaint.attachment_file; // Remove raw buffer
    }

    return res.json({
      status: "success",
      data: complaint
    });

  } catch (error) {
    console.error("❌ Error fetching complaint:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch complaint details.",
      error: error.message
    });
  }
};

// Get all complaints (for admin/authority)
export const getAllComplaints = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT complaint_id, slum_id, title, category, description, division, district, area, 
             status, responded_by, created_at, updated_at,
             attachment_filename, attachment_mimetype, attachment_size
      FROM complaints
    `;

    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const [complaints] = await pool.query(sql, params);

    return res.json({
      status: "success",
      data: complaints || []
    });

  } catch (error) {
    console.error("❌ Error fetching all complaints:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch complaints.",
      error: error.message
    });
  }
};

// Update complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { status, responded_by } = req.body;

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required."
      });
    }

    const validStatuses = ['pending', 'in progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status. Must be one of: pending, in progress, resolved"
      });
    }

    const sql = `
      UPDATE complaints 
      SET status = ?, responded_by = ?, updated_at = NOW()
      WHERE complaint_id = ?
    `;

    const [result] = await pool.query(sql, [status, responded_by || null, complaint_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Complaint not found."
      });
    }

    console.log('✅ Complaint status updated:', { complaint_id, status });

    return res.json({
      status: "success",
      message: "Complaint status updated successfully."
    });

  } catch (error) {
    console.error("❌ Error updating complaint status:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update complaint status.",
      error: error.message
    });
  }
};
