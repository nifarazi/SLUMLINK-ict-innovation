import pool from "./db.js";

async function testDocuments() {
  try {
    console.log('Testing documents query...\n');
    
    // First, check slum_dwellers table
    const [residents] = await pool.query('SELECT id, full_name, slum_code FROM slum_dwellers LIMIT 5');
    console.log('=== SLUM DWELLERS (first 5) ===');
    console.table(residents);
    
    // Then check documents table
    const [documents] = await pool.query('SELECT id, slum_id, document_type, status, uploaded_at FROM documents LIMIT 10');
    console.log('\n=== DOCUMENTS (first 10) ===');
    console.table(documents);
    
    // Check if we have any documents at all
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM documents');
    console.log('\n=== DOCUMENT COUNT ===');
    console.log('Total documents in database:', countResult[0].total);
    
    // For each resident, show their documents
    console.log('\n=== DOCUMENTS BY RESIDENT ===');
    for (const resident of residents) {
      const [residentDocs] = await pool.query(
        'SELECT id, document_type, status FROM documents WHERE slum_id = ?',
        [resident.slum_code]
      );
      console.log(`${resident.full_name} (${resident.slum_code}): ${residentDocs.length} documents`);
      if (residentDocs.length > 0) {
        residentDocs.forEach(doc => {
          console.log(`  - ${doc.document_type} (${doc.status})`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDocuments();
