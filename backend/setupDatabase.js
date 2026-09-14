import db from "./db.js";

async function verifyDatabase() {
  try {
    const [tables] = await db.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`PostgreSQL connected. Found ${tables.length} public tables.`);
    for (const table of tables) console.log(`- ${table.tablename}`);
  } catch (error) {
    console.error("Database verification failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

verifyDatabase();
