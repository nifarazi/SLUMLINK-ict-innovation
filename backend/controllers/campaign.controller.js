// backend/controllers/campaign.controller.js
import db from "../db.js";

/* ----------------------------- helpers ----------------------------- */

function cleanStr(v) { return String(v ?? "").trim(); }
function cleanDate(v) { return cleanStr(v).slice(0, 10); } // YYYY-MM-DD
function cleanTimeHHMM(v) { return cleanStr(v).slice(0, 5); } // HH:MM
function toSqlTime(vHHMM) {
  const t = cleanTimeHHMM(vHHMM);
  return t ? `${t}:00` : null;
}

function asISODate(v){
  if (!v) return "";
  if (typeof v === "string") return v.trim().slice(0, 10);
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return String(v).trim().slice(0, 10);
}

function asHHMM(v){
  if (!v) return "";
  return String(v).trim().slice(0, 5);
}

function campaignSummaryText(c) {
  const parts = [
    `Title: ${c.title}`,
    `Category: ${c.category}`,
    `Location: ${c.division}, ${c.district}, ${c.slum_area}`,
    `Start: ${asISODate(c.start_date)}`,
    `End: ${asISODate(c.end_date)}`,
    `Time: ${asHHMM(c.start_time) || "—"}`,
    `Target Gender: ${c.target_gender}`,
    `Age Group: ${c.age_group}`,
    `Education Required: ${c.education_required || "—"}`,
    `Skill Required: ${c.skills_required || "—"}`,
    `Description: ${c.description}`,
  ];
  return parts.join("\n");
}

function diffText(oldC, newC) {
  const changed = [];
  const oldStart = asISODate(oldC.start_date);
  const oldEnd = asISODate(oldC.end_date);
  const oldTime = asHHMM(oldC.start_time);

  const newStart = asISODate(newC.start_date);
  const newEnd = asISODate(newC.end_date);
  const newTime = asHHMM(newC.start_time);

  if (oldStart !== newStart) changed.push(`Start Date: ${oldStart || "—"} → ${newStart || "—"}`);
  if (oldEnd !== newEnd) changed.push(`End Date: ${oldEnd || "—"} → ${newEnd || "—"}`);
  if (oldTime !== newTime) changed.push(`Time: ${oldTime || "—"} → ${newTime || "—"}`);

  return changed.length ? changed.join("\n") : "No visible field changed.";
}

/**
 * Recipient selection with member-level filtering (returns {slum_code, full_name, eligible_names}):
 * - Checks dwellers + spouses + children for matching criteria
 * - Returns one row per family, with eligible_names = comma-separated matching member names
 * - Filters:
 *    gender: target dweller/spouse/child gender matches
 *    age_group: DOB-based (< 18 = child, >= 18 = adult)
 *    education: member education matches
 *    skills: member skills_1 or skills_2 matches
 */
async function getRecipients(connection, campaignRow) {
  const params = [];
  let sql = `
    SELECT
      sd.slum_code,
      sd.full_name AS family_head_name,
      GROUP_CONCAT(DISTINCT eligible.person_name) AS eligible_names
    FROM slum_dwellers sd
    INNER JOIN (
      SELECT
        sd2.slum_code,
        sd2.full_name AS person_name,
        sd2.dob AS dob,
        sd2.gender AS gender,
        sd2.education AS education,
        sd2.skills_1 AS skills_1,
        sd2.skills_2 AS skills_2
      FROM slum_dwellers sd2
      WHERE sd2.status = 'accepted'


      UNION ALL


      SELECT
        sp.slum_id AS slum_code,
        sp.name AS person_name,
        sp.dob AS dob,
        sp.gender AS gender,
        sp.education AS education,
        sp.skills_1 AS skills_1,
        sp.skills_2 AS skills_2
      FROM spouses sp
      WHERE sp.status = 'active'


      UNION ALL


      SELECT
        ch.slum_id AS slum_code,
        ch.name AS person_name,
        ch.dob AS dob,
        ch.gender AS gender,
        ch.education AS education,
        ch.skills_1 AS skills_1,
        ch.skills_2 AS skills_2
      FROM children ch
      WHERE ch.status = 'active'
    ) eligible ON eligible.slum_code = sd.slum_code


    WHERE sd.slum_code IS NOT NULL
      AND sd.status = 'accepted'
      AND sd.division = ?
      AND sd.area = ?
  `;


  params.push(String(campaignRow.division), String(campaignRow.slum_area));


  // Member-based filters
  const tg = String(campaignRow.target_gender || "all").toLowerCase();
  if (tg !== "all") {
    sql += ` AND LOWER(eligible.gender) = ? `;
    params.push(tg);
  }


  const ag = String(campaignRow.age_group || "both").toLowerCase();
  if (ag === "child") {
    sql += ` AND eligible.dob IS NOT NULL AND TIMESTAMPDIFF(YEAR, eligible.dob, CURDATE()) < 18 `;
  } else if (ag === "adult") {
    sql += ` AND eligible.dob IS NOT NULL AND TIMESTAMPDIFF(YEAR, eligible.dob, CURDATE()) >= 18 `;
  }


  const edu = String(campaignRow.education_required || "").trim();
  if (edu && edu.toLowerCase() !== "none") {
    sql += ` AND (eligible.education = ? OR eligible.education LIKE ?) `;
    params.push(edu, `%${edu}%`);
  }


  const skill = String(campaignRow.skills_required || "").trim();
  if (skill) {
    const like = `%${skill}%`;
    sql += ` AND (eligible.skills_1 LIKE ? OR eligible.skills_2 LIKE ?) `;
    params.push(like, like);
  }


  sql += `
    GROUP BY sd.slum_code, sd.full_name
    HAVING COUNT(*) > 0
  `;


  const [rows] = await connection.execute(sql, params);


  return rows
    .filter(r => r.slum_code)
    .map(r => ({
      slum_code: r.slum_code,
      full_name: r.family_head_name,
      eligible_names: r.eligible_names || ""
    }));
}

async function insertNotificationsBulk(connection, rows) {
  if (!rows.length) return 0;

  const values = rows.map((r) => [
    r.slum_code,
    r.campaign_id,
    r.org_id,
    r.type,
    r.title,
    r.message,
  ]);

  const sql = `
    INSERT INTO notifications
      (slum_code, campaign_id, org_id, type, title, message)
    VALUES ?
  `;

  const [result] = await connection.query(sql, [values]);
  return result.affectedRows || 0;
}

async function insertTargetsBulk(connection, campaign_id, slumCodes) {
  if (!slumCodes.length) return 0;

  const values = slumCodes.map((code) => [campaign_id, code]);
  const sql = `INSERT IGNORE INTO campaign_targets (campaign_id, slum_code) VALUES ?`;

  const [result] = await connection.query(sql, [values]);
  return result.affectedRows || 0;
}

async function replaceCampaignTargets(connection, campaign_id, slumCodes) {
  await connection.execute(`DELETE FROM campaign_targets WHERE campaign_id = ?`, [campaign_id]);
  return insertTargetsBulk(connection, campaign_id, slumCodes);
}

/* ✅ B-Strong: Refresh campaign statuses based on dates */
async function refreshCampaignStatuses(connection, orgIdNum = null){
  // Refresh only non-final statuses. Cancelled + not_executed stay as-is.
  let sql = `
    UPDATE campaigns
    SET status = CASE
      WHEN status IN ('cancelled','not_executed') THEN status
      WHEN end_date < CURDATE() THEN 'completed'
      WHEN start_date <= CURDATE() AND end_date >= CURDATE() THEN 'in_progress'
      ELSE 'pending'
    END
    WHERE status NOT IN ('cancelled','not_executed')
  `;
  const params = [];

  // If org_id filter is provided, refresh only that org's campaigns (faster & safer)
  if (orgIdNum) {
    sql += ` AND org_id = ? `;
    params.push(orgIdNum);
  }

  await connection.execute(sql, params);
}

/* ----------------------------- controllers ----------------------------- */

export async function createCampaign(req, res) {
  let connection;
  try {
    const {
      org_id,
      title,
      category,
      division,
      district,
      slum_area,
      start_date,
      end_date,
      start_time,
      target_gender,
      age_group,
      education_required,
      skills_required,
      description,
    } = req.body || {};

    const orgIdNum = Number(org_id);

    const cleanTitle = cleanStr(title);
    const cleanCategory = cleanStr(category);
    const cleanDivision = cleanStr(division);
    const cleanDistrict = cleanStr(district);
    const cleanSlumArea = cleanStr(slum_area);

    const cleanStartDate = cleanDate(start_date);
    const cleanEndDate = cleanDate(end_date);
    const cleanStartTime = cleanTimeHHMM(start_time);

    const cleanGender = cleanStr(target_gender).toLowerCase();
    const cleanAge = cleanStr(age_group).toLowerCase();

    const cleanDesc = cleanStr(description);
    const cleanEdu = cleanStr(education_required);
    const cleanSkills = cleanStr(skills_required);

    if (
      !Number.isInteger(orgIdNum) ||
      orgIdNum <= 0 ||
      !cleanTitle ||
      !cleanCategory ||
      !cleanDivision ||
      !cleanDistrict ||
      !cleanSlumArea ||
      !cleanStartDate ||
      !cleanEndDate ||
      !cleanGender ||
      !cleanAge ||
      !cleanDesc
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const allowedGender = new Set(["all", "female", "male", "others"]);
    const allowedAge = new Set(["child", "adult", "both"]);

    if (!allowedGender.has(cleanGender)) {
      return res.status(400).json({ success: false, message: "Invalid target_gender." });
    }
    if (!allowedAge.has(cleanAge)) {
      return res.status(400).json({ success: false, message: "Invalid age_group." });
    }
    if (cleanEndDate < cleanStartDate) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orgRows] = await connection.execute(
      `SELECT org_id, status FROM organizations WHERE org_id = ? LIMIT 1`,
      [orgIdNum]
    );
    if (!orgRows.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Referenced organization (org_id=${orgIdNum}) not found.`,
      });
    }
    if (orgRows[0].status !== "accepted") {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Organization is not accepted yet. Campaign creation is not allowed.",
      });
    }

    const insertSql = `
      INSERT INTO campaigns (
        org_id, title, category,
        division, district, slum_area,
        start_date, end_date, start_time,
        target_gender, age_group,
        education_required, skills_required,
        description,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        CASE
          WHEN ? < CURDATE() THEN 'completed'
          WHEN ? <= CURDATE() AND ? >= CURDATE() THEN 'in_progress'
          ELSE 'pending'
        END
      )
    `;

    const [ins] = await connection.execute(insertSql, [
      orgIdNum,
      cleanTitle,
      cleanCategory,
      cleanDivision,
      cleanDistrict,
      cleanSlumArea,
      cleanStartDate,
      cleanEndDate,
      toSqlTime(cleanStartTime),
      cleanGender,
      cleanAge,
      cleanEdu || null,
      cleanSkills || null,
      cleanDesc,
      // for CASE
      cleanEndDate,
      cleanStartDate,
      cleanEndDate
    ]);

    const campaignId = ins.insertId;

    const [cRows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [campaignId]
    );
    const c = cRows[0];

    const recipients = await getRecipients(connection, c); // [{slum_code, full_name}]
    const slumCodes = recipients.map(r => r.slum_code);

    const targetsCreated = await insertTargetsBulk(connection, c.campaign_id, slumCodes);

    const titleText = `New Campaign: ${c.title}`;

    const notifsCreated = await insertNotificationsBulk(
      connection,
      recipients.map((r) => ({
        slum_code: r.slum_code,
        campaign_id: c.campaign_id,
        org_id: c.org_id,
        type: "campaign_created",
        title: titleText,
        message:
          `Hello ${r.full_name} (${r.slum_code}),\n` +
          `Eligible member(s): ${r.eligible_names || r.full_name}\n\n` +
          campaignSummaryText(c),
      }))
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "New campaign has been created",
      data: {
        campaign_id: campaignId,
        notifications_created: notifsCreated,
        targets_created: targetsCreated,
      },
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    try { if (connection) await connection.rollback(); } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function getAllCampaigns(req, res) {
  let connection;
  try {
    const { org_id } = req.query;
    connection = await db.getConnection();

    const orgIdNum = org_id ? Number(org_id) : null;

    // ✅ B-Strong: keep DB status consistent every time campaigns are requested
    await refreshCampaignStatuses(connection, orgIdNum);

    let sql = `
      SELECT c.campaign_id, c.org_id, c.title, c.category, c.division, c.district, c.slum_area,
             c.start_date, c.end_date, c.start_time, c.target_gender, c.age_group,
             c.education_required, c.skills_required, c.description, c.status, c.created_at, c.updated_at,
             o.org_name, o.org_type
      FROM campaigns c
      LEFT JOIN organizations o ON o.org_id = c.org_id
    `;
    const params = [];

    if (org_id) {
      sql += ` WHERE c.org_id = ? `;
      params.push(Number(org_id));
    }

    sql += ` ORDER BY created_at DESC `;
    const [rows] = await connection.execute(sql, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error retrieving campaigns:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve campaigns",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function getCampaignById(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    connection = await db.getConnection();

    // ✅ B-Strong: refresh status before retrieving
    await refreshCampaignStatuses(connection, null);

    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error retrieving campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function updateCampaign(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    const payload = req.body || {};

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    const allowedKeys = new Set(["start_date", "end_date", "start_time", "status", "org_id"]);
    for (const k of Object.keys(payload)) {
      if (!allowedKeys.has(k)) {
        return res.status(400).json({
          success: false,
          message: `Only start_date, end_date, start_time can be edited (or status=cancelled). Invalid field: ${k}`,
        });
      }
    }

    const nextStart = payload.start_date !== undefined ? cleanDate(payload.start_date) : null;
    const nextEnd = payload.end_date !== undefined ? cleanDate(payload.end_date) : null;
    const nextTime = payload.start_time !== undefined ? cleanTimeHHMM(payload.start_time) : null;

    const nextStatusRaw = payload.status !== undefined ? cleanStr(payload.status).toLowerCase() : null;
    const allowedStatus = new Set(["cancelled"]);
    if (nextStatusRaw && !allowedStatus.has(nextStatusRaw)) {
      return res.status(400).json({ success: false, message: "Only status='cancelled' is allowed." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const cur = rows[0];
    const curStatus = String(cur.status || "").toLowerCase();

    if (curStatus === "cancelled") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Campaign already cancelled." });
    }

    const finalStart = nextStart ?? asISODate(cur.start_date);
    const finalEnd   = nextEnd   ?? asISODate(cur.end_date);
    const finalTime = payload.start_time !== undefined ? toSqlTime(nextTime) : cur.start_time;

    if (!finalStart || !finalEnd) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "start_date and end_date are required." });
    }
    if (finalEnd < finalStart) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    const sets = [];
    const vals = [];

    let isCancel = false;
    let isEdit = false;

    if (nextStatusRaw === "cancelled") {
      isCancel = true;
      sets.push(`status = 'cancelled'`);
    } else {
      if (payload.start_date !== undefined) { sets.push(`start_date = ?`); vals.push(finalStart); isEdit = true; }
      if (payload.end_date !== undefined) { sets.push(`end_date = ?`); vals.push(finalEnd); isEdit = true; }
      if (payload.start_time !== undefined) { sets.push(`start_time = ?`); vals.push(finalTime); isEdit = true; }
    }

    if (!sets.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    await connection.execute(
      `UPDATE campaigns SET ${sets.join(", ")}, updated_at = NOW() WHERE campaign_id = ?`,
      [...vals, idNum]
    );

    // ✅ After changing dates, refresh DB status so viewcampaign stays consistent
    await refreshCampaignStatuses(connection, cur.org_id);
    const [afterRows2] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    const after = afterRows2[0];

    // always notify existing targets only (targets never change on update)
    const [targetRows] = await connection.execute(
      `SELECT ct.slum_code, sd.full_name
       FROM campaign_targets ct
       JOIN slum_dwellers sd ON sd.slum_code = ct.slum_code
       WHERE ct.campaign_id = ?`,
      [idNum]
    );

    const targets = targetRows.map(r => ({ slum_code: r.slum_code, full_name: r.full_name }));

    let createdNotifs = 0;
    let targetsNow = targets.length;

    if (isCancel) {
      const titleText = `Campaign Cancelled: ${after.title}`;

      createdNotifs = await insertNotificationsBulk(
        connection,
        targets.map((t) => ({
          slum_code: t.slum_code,
          campaign_id: after.campaign_id,
          org_id: after.org_id,
          type: "campaign_cancelled",
          title: titleText,
          message: `Hello ${t.full_name} (${t.slum_code}), this campaign has been cancelled.`,
        }))
      );
    } else if (isEdit) {
      const titleText = `Campaign Updated: ${after.title}`;
      const msgTextBase =
        `This campaign schedule was updated.\n\nPrevious:\n${campaignSummaryText(cur)}\n\n` +
        `Changed:\n${diffText(cur, after)}\n\nNow:\n${campaignSummaryText(after)}`;

      createdNotifs = await insertNotificationsBulk(
        connection,
        targets.map((t) => ({
          slum_code: t.slum_code,
          campaign_id: after.campaign_id,
          org_id: after.org_id,
          type: "campaign_updated",
          title: titleText,
          message: `Hello ${t.full_name} (${t.slum_code}),\n\n${msgTextBase}`,
        }))
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: isCancel ? "Campaign cancelled successfully" : "Campaign updated successfully",
      data: {
        campaign_id: idNum,
        notifications_created: createdNotifs,
        targets_now: targetsNow,
      },
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    try { if (connection) await connection.rollback(); } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function deleteCampaign(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const c = rows[0];

    // fetch target names for notifications
    const [targetRows] = await connection.execute(
      `SELECT ct.slum_code, sd.full_name
       FROM campaign_targets ct
       JOIN slum_dwellers sd ON sd.slum_code = ct.slum_code
       WHERE ct.campaign_id = ?`,
      [idNum]
    );
    const targets = targetRows.map(r => ({ slum_code: r.slum_code, full_name: r.full_name }));

    const titleText = `Campaign Removed: ${c.title}`;

    const createdNotifs = targets.length
      ? await insertNotificationsBulk(
          connection,
          targets.map((t) => ({
            slum_code: t.slum_code,
            campaign_id: c.campaign_id,
            org_id: c.org_id,
            type: "campaign_cancelled",
            title: titleText,
            message: `Hello ${t.full_name} (${t.slum_code}), this campaign was deleted by the organization.`,
          }))
        )
      : 0;

    await connection.execute(`DELETE FROM campaign_targets WHERE campaign_id = ?`, [idNum]);

    const [del] = await connection.execute(
      `DELETE FROM campaigns WHERE campaign_id = ?`,
      [idNum]
    );

    if (!del.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
      data: { campaign_id: idNum, notifications_created: createdNotifs },
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    try { if (connection) await connection.rollback(); } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

// ✅ GET /api/campaigns/mine-active?org_id=...
export async function getMyActiveCampaignsToday(req, res) {
  let connection;
  try {
    const orgIdNum = Number(req.query.org_id);
    if (!Number.isInteger(orgIdNum) || orgIdNum <= 0) {
      return res.status(400).json({ success: false, message: "org_id is required and must be a positive integer." });
    }

    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT campaign_id, org_id, title, category, division, district, slum_area,
              start_date, end_date, start_time, target_gender, age_group,
              education_required, skills_required, description, status, created_at, updated_at
       FROM campaigns
       WHERE org_id = ?
         AND status <> 'cancelled'
         AND start_date <= CURDATE()
         AND end_date >= CURDATE()
       ORDER BY start_date ASC, created_at DESC`,
      [orgIdNum]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error retrieving active campaigns:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve active campaigns",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}