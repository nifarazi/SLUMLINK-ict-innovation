// backend/controllers/distribution.controller.js
import db from "../db.js";

/* ---------------- helpers ---------------- */

function cleanStr(v) {
  return String(v ?? "").trim();
}
function asInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function ensureOrgAccepted(conn, org_id) {
  const [rows] = await conn.execute(
    `SELECT org_id, status FROM organizations WHERE org_id = ? LIMIT 1`,
    [org_id]
  );
  if (!rows.length) return { ok: false, code: 400, msg: "Organization not found." };
  if (rows[0].status !== "accepted") return { ok: false, code: 403, msg: "Organization is not accepted." };
  return { ok: true };
}

async function ensureCampaignActiveForOrgToday(conn, campaign_id, org_id) {
  const [rows] = await conn.execute(
    `SELECT campaign_id
     FROM campaigns
     WHERE campaign_id = ?
       AND org_id = ?
       AND status <> 'cancelled'
       AND start_date <= CURDATE()
       AND end_date >= CURDATE()
     LIMIT 1`,
    [campaign_id, org_id]
  );

  if (!rows.length) {
    return { ok: false, code: 403, msg: "Campaign is not active today (or not owned by your org)." };
  }
  return { ok: true };
}

async function ensureAidTypeExists(conn, aid_type_id) {
  const [rows] = await conn.execute(
    `SELECT aid_type_id, requires_quantity FROM aid_types WHERE aid_type_id = ? LIMIT 1`,
    [aid_type_id]
  );
  if (!rows.length) return { ok: false, code: 400, msg: "Aid type not found." };
  return { ok: true, requires_quantity: !!rows[0].requires_quantity };
}

async function ensureDwellerExists(conn, slum_code) {
  const [rows] = await conn.execute(
    `SELECT slum_code, status, dob
     FROM slum_dwellers
     WHERE slum_code = ?
     LIMIT 1`,
    [slum_code]
  );
  if (!rows.length) return { ok: false, code: 404, msg: "Slum code not found." };
  return { ok: true, row: rows[0] };
}

function calcAgeFromDob(dob) {
  const dt = new Date(dob);
  if (Number.isNaN(dt.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dt.getFullYear();
  const m = today.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dt.getDate())) age -= 1;
  return age;
}

// ✅ Eligibility rule:
// Allow only if exists in campaign_targets.
// For older campaigns (before targets were added), fallback to notifications (created/updated).
async function ensureFamilyEligible(conn, campaign_id, slum_code) {
  const [t] = await conn.execute(
    `SELECT 1 FROM campaign_targets WHERE campaign_id = ? AND slum_code = ? LIMIT 1`,
    [campaign_id, slum_code]
  );
  if (t.length) return { ok: true };

  const [n] = await conn.execute(
    `SELECT 1
     FROM notifications
     WHERE campaign_id = ?
       AND slum_code = ?
       AND type IN ('campaign_created','campaign_updated')
     LIMIT 1`,
    [campaign_id, slum_code]
  );
  if (n.length) return { ok: true };

  return { ok: false, code: 403, msg: "Sorry, you were not included for this session." };
}

async function safeMemberRows(conn, tableName, slum_code) {
  // tries slum_id first, then slum_code; ignores missing table/column
  const try1 = async () =>
    conn.execute(`SELECT dob FROM ${tableName} WHERE slum_id = ? AND status='active'`, [slum_code]);
  const try2 = async () =>
    conn.execute(`SELECT dob FROM ${tableName} WHERE slum_code = ? AND status='active'`, [slum_code]);

  try {
    const [rows] = await try1();
    return rows;
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return [];
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      try {
        const [rows2] = await try2();
        return rows2;
      } catch (e2) {
        if (e2?.code === "ER_NO_SUCH_TABLE" || e2?.code === "ER_BAD_FIELD_ERROR") return [];
        throw e2;
      }
    }
    throw e;
  }
}

/* ---------------- controllers ---------------- */

/**
 * POST /api/distribution-sessions
 * body: { org_id, campaignId, aidTypeId, performed_by? }
 */
export async function createDistributionSession(req, res) {
  let conn;
  try {
    const org_id = asInt(req.body?.org_id);
    const campaignId = asInt(req.body?.campaignId);
    const aidTypeId = asInt(req.body?.aidTypeId);
    const performed_by = cleanStr(req.body?.performed_by || "");

    if (!org_id || !campaignId || !aidTypeId) {
      return res.status(400).json({ success: false, message: "org_id, campaignId and aidTypeId are required." });
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const orgOk = await ensureOrgAccepted(conn, org_id);
    if (!orgOk.ok) { await conn.rollback(); return res.status(orgOk.code).json({ success:false, message: orgOk.msg }); }

    const campOk = await ensureCampaignActiveForOrgToday(conn, campaignId, org_id);
    if (!campOk.ok) { await conn.rollback(); return res.status(campOk.code).json({ success:false, message: campOk.msg }); }

    const typeOk = await ensureAidTypeExists(conn, aidTypeId);
    if (!typeOk.ok) { await conn.rollback(); return res.status(typeOk.code).json({ success:false, message: typeOk.msg }); }

    const [ins] = await conn.execute(
      `INSERT INTO distribution_sessions (campaign_id, org_id, aid_type_id, performed_by)
       VALUES (?, ?, ?, ?)`,
      [campaignId, org_id, aidTypeId, performed_by || null]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      sessionId: ins.insertId,
    });
  } catch (err) {
    console.error("createDistributionSession error:", err);
    try { if (conn) await conn.rollback(); } catch {}
    return res.status(500).json({ success: false, message: "Failed to create distribution session." });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * POST /api/distribution-sessions/:sessionId/entries
 * body: { org_id, familyCode, quantity?, comment?, verification_method? }
 */
export async function addDistributionEntry(req, res) {
  let conn;
  try {
    const sessionId = Number(req.params.sessionId);
    const org_id = asInt(req.body?.org_id);

    const familyCode = cleanStr(req.body?.familyCode);
    const quantity = req.body?.quantity === null || req.body?.quantity === undefined ? null : Number(req.body?.quantity);
    const comment = cleanStr(req.body?.comment || "");
    const verification_method = cleanStr(req.body?.verification_method || "CODE").toUpperCase();

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid sessionId." });
    }
    if (!org_id) {
      return res.status(400).json({ success: false, message: "org_id is required." });
    }
    if (!familyCode) {
      return res.status(400).json({ success: false, message: "familyCode is required." });
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [sessRows] = await conn.execute(
      `SELECT session_id, campaign_id, org_id, aid_type_id, status
       FROM distribution_sessions
       WHERE session_id = ?
       LIMIT 1`,
      [sessionId]
    );
    if (!sessRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    const sess = sessRows[0];
    if (Number(sess.org_id) !== Number(org_id)) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: "This session does not belong to your org." });
    }
    if (String(sess.status) !== "OPEN") {
      await conn.rollback();
      return res.status(403).json({ success: false, message: "Session is closed." });
    }

    const campOk = await ensureCampaignActiveForOrgToday(conn, Number(sess.campaign_id), org_id);
    if (!campOk.ok) { await conn.rollback(); return res.status(campOk.code).json({ success:false, message: campOk.msg }); }

    const typeOk = await ensureAidTypeExists(conn, Number(sess.aid_type_id));
    if (!typeOk.ok) { await conn.rollback(); return res.status(typeOk.code).json({ success:false, message: typeOk.msg }); }

    if (typeOk.requires_quantity) {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Quantity is required and must be > 0 for this aid type." });
      }
    }

    const dwOk = await ensureDwellerExists(conn, familyCode);
    if (!dwOk.ok) { await conn.rollback(); return res.status(dwOk.code).json({ success:false, message: dwOk.msg }); }

    // ✅ enforce eligibility
    const elig = await ensureFamilyEligible(conn, Number(sess.campaign_id), familyCode);
    if (!elig.ok) { await conn.rollback(); return res.status(elig.code).json({ success:false, message: elig.msg }); }

    const [ins] = await conn.execute(
      `INSERT INTO distribution_entries
       (session_id, campaign_id, org_id, family_code, quantity, comment, verification_method, round_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        sessionId,
        sess.campaign_id,
        org_id,
        familyCode,
        typeOk.requires_quantity ? quantity : null,
        comment || null,
        ["CODE", "QR"].includes(verification_method) ? verification_method : "CODE"
      ]
    );

    const entryId = ins.insertId;

    const [meta] = await conn.execute(
      `SELECT round_no, distributed_at
       FROM distribution_entries
       WHERE entry_id = ?
       LIMIT 1`,
      [entryId]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Entry recorded.",
      data: {
        entry_id: entryId,
        round_no: meta?.[0]?.round_no ?? null,
        distributed_at: meta?.[0]?.distributed_at ?? null,
      }
    });
  } catch (err) {
    console.error("addDistributionEntry error:", err);
    try { if (conn) await conn.rollback(); } catch {}
    return res.status(500).json({ success: false, message: "Failed to record entry." });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * POST /api/distribution-sessions/:sessionId/finish
 * body: { org_id }
 */
export async function finishDistributionSession(req, res) {
  let conn;
  try {
    const sessionId = Number(req.params.sessionId);
    const org_id = asInt(req.body?.org_id);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid sessionId." });
    }
    if (!org_id) {
      return res.status(400).json({ success: false, message: "org_id is required." });
    }

    conn = await db.getConnection();

    const [sessRows] = await conn.execute(
      `SELECT session_id, org_id, status
       FROM distribution_sessions
       WHERE session_id = ?
       LIMIT 1`,
      [sessionId]
    );
    if (!sessRows.length) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }
    const sess = sessRows[0];
    if (Number(sess.org_id) !== Number(org_id)) {
      return res.status(403).json({ success: false, message: "This session does not belong to your org." });
    }
    if (String(sess.status) !== "OPEN") {
      return res.status(200).json({ success: true, message: "Session already closed." });
    }

    await conn.execute(
      `UPDATE distribution_sessions
       SET status='CLOSED', finished_at=NOW()
       WHERE session_id = ?`,
      [sessionId]
    );

    return res.json({ success: true, message: "Session finished." });
  } catch (err) {
    console.error("finishDistributionSession error:", err);
    return res.status(500).json({ success: false, message: "Failed to finish session." });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * GET /api/distribution/families/:slum_code/snapshot
 * ✅ Returns: family size + ages + FULL history (ALL orgs)
 */
export async function getFamilySnapshotAllHistory(req, res) {
  let conn;
  try {
    const slum_code = cleanStr(req.params.slum_code);
    if (!slum_code) return res.status(400).json({ success: false, message: "slum_code required." });

    conn = await db.getConnection();

    const dwOk = await ensureDwellerExists(conn, slum_code);
    if (!dwOk.ok) return res.status(dwOk.code).json({ success: false, message: dwOk.msg });

    const spouseRows = await safeMemberRows(conn, "spouses", slum_code);
    const childRows = await safeMemberRows(conn, "children", slum_code);

    const ages = [];
    if (dwOk.row?.dob) {
      const a = calcAgeFromDob(dwOk.row.dob);
      if (Number.isFinite(a)) ages.push(a);
    }

    for (const r of spouseRows) {
      if (r?.dob) {
        const a = calcAgeFromDob(r.dob);
        if (Number.isFinite(a)) ages.push(a);
      }
    }

    for (const r of childRows) {
      if (r?.dob) {
        const a = calcAgeFromDob(r.dob);
        if (Number.isFinite(a)) ages.push(a);
      }
    }

    const familySize = 1 + spouseRows.length + childRows.length;

    const [hist] = await conn.execute(
      `SELECT
         de.distributed_at,
         o.org_name,
         c.title AS campaign_title,
         c.campaign_id,
         at.name AS aid_type,
         de.quantity,
         de.verification_method,
         de.comment,
         de.round_no,
         de.session_id
       FROM distribution_entries de
       JOIN distribution_sessions ds ON ds.session_id = de.session_id
       JOIN organizations o ON o.org_id = ds.org_id
       JOIN campaigns c ON c.campaign_id = ds.campaign_id
       JOIN aid_types at ON at.aid_type_id = ds.aid_type_id
       WHERE de.family_code = ?
       ORDER BY de.distributed_at DESC
       LIMIT 50`,
      [slum_code]
    );

    return res.json({
      success: true,
      data: {
        family: { size: familySize, ages },
        allHistory: hist.map((h) => ({
          date: String(h.distributed_at).replace("T", " ").slice(0, 19),
          orgName: h.org_name,
          campaignTitle: h.campaign_title,
          campaignId: h.campaign_id,
          aidType: h.aid_type,
          quantity: h.quantity,
          verification: h.verification_method,
          comment: h.comment,
          roundNo: h.round_no,
          sessionId: h.session_id,
        })),
      },
    });
  } catch (err) {
    console.error("getFamilySnapshotAllHistory error:", err);
    return res.status(500).json({ success: false, message: "Failed to load family snapshot." });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * ✅ NEW: GET /api/campaigns/:campaignId/distribution-history
 * Returns date-wise distribution records for a completed campaign
 */
// ✅ GET /api/campaigns/:campaignId/distribution-history
// Returns date-wise distribution records for a campaign (works for completed too)
export async function getCampaignDistributionHistory(req, res) {
  let conn;
  try {
    const campaignId = Number(req.params.campaignId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    conn = await db.getConnection();

    // campaign info
    const [campRows] = await conn.execute(
      `SELECT campaign_id, title, status FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [campaignId]
    );
    if (!campRows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    const campaign = campRows[0];

    // ✅ 1) Day-wise totals (NO double counting)
    // - families_count: distinct families on that date
    // - people_count: sum of family_members for DISTINCT families on that date
    const [dayTotals] = await conn.execute(
      `
      SELECT
        x.distribution_date AS date,
        COUNT(*) AS families_count,
        COALESCE(SUM(x.family_members), 0) AS people_count
      FROM (
        SELECT
          DATE(de.distributed_at) AS distribution_date,
          de.family_code,
          COALESCE(sd.family_members, 0) AS family_members
        FROM distribution_entries de
        LEFT JOIN slum_dwellers sd ON sd.slum_code = de.family_code
        WHERE de.campaign_id = ?
        GROUP BY DATE(de.distributed_at), de.family_code
      ) x
      GROUP BY x.distribution_date
      ORDER BY x.distribution_date ASC
      `,
      [campaignId]
    );

    // ✅ 2) Detail rows (table entries)
    const [detailRows] = await conn.execute(
      `
      SELECT
        DATE(de.distributed_at) AS distribution_date,
        de.family_code,
        sd.full_name AS family_head,
        at.name AS aid_type,
        de.quantity,
        o.org_name
      FROM distribution_entries de
      JOIN distribution_sessions ds ON ds.session_id = de.session_id
      JOIN organizations o ON o.org_id = ds.org_id
      JOIN aid_types at ON at.aid_type_id = ds.aid_type_id
      LEFT JOIN slum_dwellers sd ON sd.slum_code = de.family_code
      WHERE de.campaign_id = ?
      ORDER BY de.distributed_at ASC, de.entry_id ASC
      `,
      [campaignId]
    );

    // ✅ build history array the frontend expects
    const map = new Map();
    for (const d of dayTotals) {
      map.set(String(d.date), {
        date: String(d.date),
        families_count: Number(d.families_count || 0),
        people_count: Number(d.people_count || 0),
        distributions: []
      });
    }

    for (const r of detailRows) {
      const key = String(r.distribution_date);
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          families_count: 0,
          people_count: 0,
          distributions: []
        });
      }
      map.get(key).distributions.push({
        family_code: r.family_code,
        family_head: r.family_head || "—",
        aid_type: r.aid_type || "—",
        quantity: r.quantity ?? null,
        org_name: r.org_name || "—"
      });
    }

    const history = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      success: true,
      data: {
        campaign_id: campaign.campaign_id,
        campaign_title: campaign.title,
        campaign_status: campaign.status,
        history
      }
    });
  } catch (error) {
    console.error("Error retrieving campaign distribution history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve distribution history",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
}

// ✅ GET /api/campaigns/:campaignId/impact
export async function getCampaignImpact(req, res) {
  let conn;
  try {
    const campaignId = Number(req.params.campaignId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    conn = await db.getConnection();

    const [rows] = await conn.execute(
      `
      SELECT
        COUNT(*) AS families_helped,
        COALESCE(SUM(x.family_members), 0) AS people_helped
      FROM (
        SELECT
          de.family_code,
          COALESCE(sd.family_members, 0) AS family_members
        FROM distribution_entries de
        LEFT JOIN slum_dwellers sd ON sd.slum_code = de.family_code
        WHERE de.campaign_id = ?
        GROUP BY de.family_code
      ) x
      `,
      [campaignId]
    );

    const out = rows?.[0] || { families_helped: 0, people_helped: 0 };

    return res.json({
      success: true,
      data: {
        families_helped: Number(out.families_helped || 0),
        people_helped: Number(out.people_helped || 0),
        beneficiaries: Number(out.people_helped || 0) // ✅ backward compatible with your frontend
      }
    });
  } catch (e) {
    console.error("getCampaignImpact error:", e);
    return res.status(500).json({ success: false, message: "Failed to load impact", error: e.message });
  } finally {
    if (conn) conn.release();
  }
}