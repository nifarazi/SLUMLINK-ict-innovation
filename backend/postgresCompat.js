import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in backend/.env");
}

// Preserve the numeric behavior expected by the existing controllers.
pg.types.setTypeParser(20, (value) => Number(value));
pg.types.setTypeParser(1700, (value) => Number(value));

const postgresPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true,
  application_name: "slumlink-api",
});

postgresPool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

function expandBulkValues(sql, values) {
  if (!/\bVALUES\s+\?/i.test(sql)) return null;
  if (values.length !== 1 || !Array.isArray(values[0])) return null;

  const rows = values[0];
  if (!rows.length || !rows.every(Array.isArray)) {
    throw new Error("Bulk INSERT requires at least one row of values");
  }

  const flattened = [];
  const groups = rows.map((row) => {
    const placeholders = row.map((value) => {
      flattened.push(value);
      return `$${flattened.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  return {
    sql: sql.replace(/\bVALUES\s+\?/i, `VALUES ${groups.join(", ")}`),
    values: flattened,
  };
}

function expandPlaceholders(sql, values) {
  const bulk = expandBulkValues(sql, values);
  if (bulk) return bulk;

  const flattened = [];
  let valueIndex = 0;
  let translated = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (char === "'" && !inDoubleQuote) {
      translated += char;
      if (inSingleQuote && next === "'") {
        translated += next;
        index += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      translated += char;
      if (inDoubleQuote && next === '"') {
        translated += next;
        index += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (char !== "?" || inSingleQuote || inDoubleQuote) {
      translated += char;
      continue;
    }

    if (valueIndex >= values.length) {
      throw new Error("SQL placeholder count exceeds supplied values");
    }

    const value = values[valueIndex];
    valueIndex += 1;

    if (Array.isArray(value)) {
      if (!value.length) {
        translated += "NULL";
      } else {
        translated += value
          .map((item) => {
            flattened.push(item);
            return `$${flattened.length}`;
          })
          .join(", ");
      }
    } else {
      flattened.push(value);
      translated += `$${flattened.length}`;
    }
  }

  if (valueIndex !== values.length) {
    throw new Error("More SQL values were supplied than placeholders");
  }

  return { sql: translated, values: flattened };
}

const insertIdColumns = {
  organizations: "org_id",
  slum_dwellers: "id",
  spouses: "id",
  children: "id",
  documents: "id",
  complaints: "complaint_id",
  campaigns: "campaign_id",
  notifications: "notification_id",
  campaign_targets: "id",
  aid_types: "aid_type_id",
  distribution_sessions: "session_id",
  distribution_entries: "entry_id",
};

function addInsertReturning(sql) {
  if (!/^\s*INSERT\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) return sql;
  const tableName = sql.match(/^\s*INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)/i)?.[1]?.toLowerCase();
  const idColumn = insertIdColumns[tableName];
  const returning = idColumn ? `RETURNING ${idColumn}` : "RETURNING *";
  return `${sql.trim().replace(/;$/, "")} ${returning}`;
}

function getInsertId(row) {
  if (!row) return 0;
  const preferred = [
    "id",
    "org_id",
    "campaign_id",
    "complaint_id",
    "notification_id",
    "session_id",
    "entry_id",
    "aid_type_id",
  ];
  const key = preferred.find((name) => row[name] !== undefined)
    || Object.keys(row).find((name) => name.endsWith("_id"));
  return key ? row[key] : 0;
}

async function runCompatQuery(client, sql, params = []) {
  const values = Array.isArray(params) ? params : [params];
  const translated = expandPlaceholders(String(sql), values);
  const queryText = addInsertReturning(translated.sql);
  const result = await client.query(queryText, translated.values);

  if (/^\s*(SELECT|WITH)\b/i.test(queryText)) {
    return [result.rows, result.fields];
  }

  return [{
    insertId: getInsertId(result.rows[0]),
    affectedRows: result.rowCount || 0,
    changedRows: result.rowCount || 0,
    rows: result.rows,
  }, result.fields];
}

function createConnectionAdapter(client, release = null) {
  return {
    query: (sql, params) => runCompatQuery(client, sql, params),
    execute: (sql, params) => runCompatQuery(client, sql, params),
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    release: () => release?.(),
    end: () => release ? release() : client.end(),
  };
}

const pool = {
  query: (sql, params) => runCompatQuery(postgresPool, sql, params),
  execute: (sql, params) => runCompatQuery(postgresPool, sql, params),
  async getConnection() {
    const client = await postgresPool.connect();
    return createConnectionAdapter(client, () => client.release());
  },
  end: () => postgresPool.end(),
  raw: postgresPool,
};

export default pool;
