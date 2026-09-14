import db from "../backend/db.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const marker = `migration-check-${Date.now()}`;
const connection = await db.getConnection();
let transactionOpen = false;

try {
  await connection.beginTransaction();
  transactionOpen = true;

  const [organizationResult] = await connection.query(
    `INSERT INTO organizations
      (org_type, org_name, email, phone, org_age, password,
       license_filename, license_mimetype, license_size, license_file)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "ngo",
      marker,
      `${marker}@example.invalid`,
      `test-${Date.now()}`,
      1,
      "not-a-real-password",
      "test.txt",
      "text/plain",
      4,
      Buffer.from("test"),
    ],
  );
  assert(organizationResult.insertId, "Organization insertId compatibility failed");

  const [dwellerResult] = await connection.query(
    `INSERT INTO slum_dwellers (password_hash, full_name, status)
     VALUES (?, ?, ?)`,
    ["not-a-real-hash", marker, "accepted"],
  );
  assert(dwellerResult.insertId, "Dweller insertId compatibility failed");

  const [dwellers] = await connection.query(
    "SELECT slum_code FROM slum_dwellers WHERE id = ? LIMIT 1",
    [dwellerResult.insertId],
  );
  assert(/^SR\d{6}$/.test(dwellers[0]?.slum_code), "Slum code trigger failed");
  const slumCode = dwellers[0].slum_code;

  const today = new Date().toISOString().slice(0, 10);
  const [campaignResult] = await connection.query(
    `INSERT INTO campaigns
      (org_id, title, category, division, district, slum_area,
       start_date, end_date, age_group, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationResult.insertId,
      marker,
      "test",
      "Dhaka",
      "Dhaka",
      "test",
      today,
      today,
      "both",
      "Migration compatibility test",
    ],
  );
  assert(campaignResult.insertId, "Campaign insertId compatibility failed");

  const [targetResult] = await connection.query(
    `INSERT INTO campaign_targets (campaign_id, slum_code) VALUES ?
     ON CONFLICT (campaign_id, slum_code) DO NOTHING`,
    [[
      [campaignResult.insertId, slumCode],
      [campaignResult.insertId, slumCode],
    ]],
  );
  assert(targetResult.affectedRows === 1, "Bulk insert/conflict compatibility failed");

  const [notificationResult] = await connection.query(
    `INSERT INTO notifications
      (slum_code, campaign_id, org_id, type, title, message)
     VALUES ?`,
    [[[
      slumCode,
      campaignResult.insertId,
      organizationResult.insertId,
      "campaign_created",
      marker,
      "Migration compatibility test",
    ]]],
  );
  assert(notificationResult.affectedRows === 1, "Notification bulk insert failed");

  const [notificationUpdate] = await connection.query(
    "UPDATE notifications SET is_read = true WHERE slum_code = ? AND is_read = false",
    [slumCode],
  );
  assert(notificationUpdate.affectedRows === 1, "Boolean update compatibility failed");

  const [selected] = await connection.query(
    "SELECT COUNT(*) AS count FROM campaign_targets WHERE slum_code IN (?)",
    [[slumCode]],
  );
  assert(selected[0]?.count === 1, "Array placeholder or numeric parsing failed");

  await connection.rollback();
  transactionOpen = false;

  const [remaining] = await connection.query(
    "SELECT COUNT(*) AS count FROM organizations WHERE org_name = ?",
    [marker],
  );
  assert(remaining[0]?.count === 0, "Smoke-test transaction did not roll back");

  console.log("PostgreSQL compatibility smoke test passed; no test rows retained.");
} catch (error) {
  if (transactionOpen) await connection.rollback();
  console.error("PostgreSQL compatibility smoke test failed:", error.message);
  process.exitCode = 1;
} finally {
  connection.release();
  await db.end();
}
