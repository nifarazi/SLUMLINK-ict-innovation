// backend/controllers/aidType.controller.js
import db from "../db.js";

export async function getAidTypes(req, res) {
  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.execute(
      `SELECT aid_type_id AS id, name, requires_quantity, unit_label
       FROM aid_types
       ORDER BY name ASC`
    );

    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        requires_quantity: !!r.requires_quantity,
        unit_label: r.unit_label || "",
      })),
    });
  } catch (err) {
    console.error("getAidTypes error:", err);
    return res.status(500).json({ success: false, message: "Failed to load aid types" });
  } finally {
    if (conn) conn.release();
  }
}