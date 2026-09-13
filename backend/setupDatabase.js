import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nanjiba@282002",
    database: process.env.DB_NAME || "slumlink",
  });

  try {
    console.log("Setting up database tables...");
    
    // Read and execute documents table SQL
    const sqlPath = path.join(__dirname, "sql", "add_documents_table.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Split by semicolon and execute each statement
    const statements = sql.split(";").filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log("Executing:", statement.substring(0, 50) + "...");
        await connection.execute(statement);
      }
    }
    
    console.log("✅ Database setup completed successfully");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
  } finally {
    await connection.end();
  }
}

setupDatabase();
