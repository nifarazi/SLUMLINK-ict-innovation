import pool from "../db.js";

// Helper function to convert Data URL to Buffer
function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  
  try {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error converting Data URL to Buffer:', error);
    return null;
  }
}

// Upload new document (by resident or admin)
export const uploadDocument = async (req, res) => {
  const { slum_id, document_type, document_title, file_data } = req.body;

  try {
    if (!slum_id || !document_type || !file_data) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: slum_id, document_type, file_data"
      });
    }

    const fileBuffer = dataUrlToBuffer(file_data);
    if (!fileBuffer) {
      return res.status(400).json({
        status: "error",
        message: "Invalid file data format"
      });
    }

    // Extract mimetype from data URL
    const mimetypeMatch = file_data.match(/^data:([^;]+)/);
    const mimetype = mimetypeMatch ? mimetypeMatch[1] : 'application/octet-stream';

    const [result] = await pool.query(
      `INSERT INTO documents (slum_id, document_type, document_title, file_blob, file_mimetype, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [slum_id, document_type, document_title || document_type, fileBuffer, mimetype, fileBuffer.length]
    );

    console.log('📄 Document uploaded:', {
      id: result.insertId,
      slum_id,
      document_type,
      size: fileBuffer.length
    });

    return res.json({
      status: "success",
      message: "Document uploaded successfully. Pending admin approval.",
      document_id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to upload document.",
      error: error.message
    });
  }
};

// Get pending documents for a resident
export const getPendingDocumentsForResident = async (req, res) => {
  const { slum_id } = req.params;

  try {
    const [documents] = await pool.query(
      'SELECT id, document_type, document_title, file_mimetype, file_size, uploaded_at, status FROM documents WHERE slum_id = ? AND status = ? ORDER BY uploaded_at DESC',
      [slum_id, 'pending']
    );

    return res.json({
      status: "success",
      data: documents || []
    });
  } catch (error) {
    console.error('❌ Error fetching pending documents:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pending documents.",
      error: error.message
    });
  }
};

// Get all documents for a resident (pending, approved, rejected)
export const getAllDocumentsForResident = async (req, res) => {
  const { slum_id } = req.params;

  try {
    console.log('🔍 Querying documents for slum_code:', slum_id);
    
    const [documents] = await pool.query(
      `SELECT id, slum_id, document_type, document_title, file_mimetype, file_size, 
              status, uploaded_at, rejection_reason 
       FROM documents 
       WHERE slum_id = ? 
       ORDER BY uploaded_at DESC`,
      [slum_id]
    );

    console.log('📄 Documents found:', documents.length);
    if (documents.length > 0) {
      console.log('First document:', documents[0]);
    }

    return res.json({
      success: true,
      documents: documents || []
    });
  } catch (error) {
    console.error('❌ Error fetching all documents:', error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch documents."
    });
  }
};

// Get all pending documents (for admin dashboard)
export const getAllPendingDocuments = async (req, res) => {
  try {
    const [documents] = await pool.query(
      `SELECT 
        d.id, d.slum_id, d.document_type, d.document_title, 
        d.file_mimetype, d.file_size, d.uploaded_at, d.status,
        s.full_name, s.mobile
       FROM documents d
       JOIN slum_dwellers s ON d.slum_id = s.slum_code
       WHERE d.status = 'pending'
       ORDER BY d.uploaded_at DESC`
    );

    return res.json({
      status: "success",
      data: documents || []
    });
  } catch (error) {
    console.error('❌ Error fetching all pending documents:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pending documents.",
      error: error.message
    });
  }
};

// Get document by ID with file content
export const getDocumentById = async (req, res) => {
  const { document_id } = req.params;

  try {
    const [documents] = await pool.query(
      'SELECT id, slum_id, document_type, document_title, file_blob, file_mimetype, uploaded_at FROM documents WHERE id = ?',
      [document_id]
    );

    if (!documents || documents.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Document not found."
      });
    }

    const doc = documents[0];
    // Convert buffer to base64 for transmission
    const base64 = doc.file_blob.toString('base64');
    const dataUrl = `data:${doc.file_mimetype};base64,${base64}`;

    return res.json({
      status: "success",
      data: {
        id: doc.id,
        slum_id: doc.slum_id,
        document_type: doc.document_type,
        document_title: doc.document_title,
        file_data: dataUrl,
        file_mimetype: doc.file_mimetype,
        uploaded_at: doc.uploaded_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch document.",
      error: error.message
    });
  }
};

// Approve document
export const approveDocument = async (req, res) => {
  const { document_id } = req.params;
  const { reviewed_by } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE documents 
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reviewed_by || 'admin', document_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Document not found."
      });
    }

    console.log('✅ Document approved:', document_id);

    return res.json({
      status: "success",
      message: "Document approved successfully."
    });
  } catch (error) {
    console.error('❌ Error approving document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to approve document.",
      error: error.message
    });
  }
};

// Reject document
export const rejectDocument = async (req, res) => {
  const { document_id } = req.params;
  const { reviewed_by, rejection_reason } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE documents 
       SET status = 'rejected', reviewed_by = ?, rejection_reason = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reviewed_by || 'admin', rejection_reason || '', document_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Document not found."
      });
    }

    console.log('❌ Document rejected:', document_id);

    return res.json({
      status: "success",
      message: "Document rejected successfully."
    });
  } catch (error) {
    console.error('❌ Error rejecting document:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reject document.",
      error: error.message
    });
  }
};

// Get document count for resident
export const getDocumentCount = async (req, res) => {
  const { slum_id } = req.params;

  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as pending_count FROM documents WHERE slum_id = ? AND status = ?',
      [slum_id, 'pending']
    );

    return res.json({
      status: "success",
      pending_count: result[0]?.pending_count || 0
    });
  } catch (error) {
    console.error('❌ Error fetching document count:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch document count.",
      error: error.message
    });
  }
};
