import express from "express";
import bcrypt from "bcrypt";
import { db } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create a new school admin (Superadmin only)
router.post("/", authMiddleware(["superadmin"]), async (req, res) => {
  const { username, password, school_id } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, password, role, school_id) VALUES (?, ?, 'schooladmin', ?)",
      [username, hashed, school_id]
    );

    res.json({ success: true, message: "School admin created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating school admin" });
  }
});

// Get all school admins (Superadmin only)
router.get("/", authMiddleware(["superadmin"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.role, s.name AS school_name
       FROM users u
       JOIN schools s ON u.school_id = s.id
       WHERE u.role = 'schooladmin'
       ORDER BY s.name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching school admins" });
  }
});

// Delete a school admin (Superadmin only)
router.delete("/:id", authMiddleware(["superadmin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "DELETE FROM users WHERE id = ? AND role = 'schooladmin'",
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "School admin not found" });

    res.json({ success: true, message: "School admin deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting school admin" });
  }
});

// Update a school admin (Superadmin only)
router.put("/:id", authMiddleware(["superadmin"]), async (req, res) => {
  const { id } = req.params;
  const { username, password, school_id } = req.body;

  try {
    // Build dynamic update query
    let query = "UPDATE users SET ";
    const params = [];
    if (username) {
      query += "username = ?, ";
      params.push(username);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += "password = ?, ";
      params.push(hashed);
    }
    if (school_id) {
      query += "school_id = ?, ";
      params.push(school_id);
    }

    // Remove last comma
    query = query.slice(0, -2);
    query += " WHERE id = ? AND role = 'schooladmin'";
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "School admin not found" });

    res.json({ success: true, message: "School admin updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating school admin" });
  }
});


router.get("/export/school", authMiddleware(["schooladmin"]), async (req, res) => {
  const school_id = req.user.school_id;
  const { round, driver_id } = req.query; // ✅ filters

  try {
    let query = `
      SELECT rs.round_name, rs.stop_order, rs.latitude, rs.longitude,
             d.name AS driver_name, s.name AS school_name, rs.created_at
      FROM round_stops rs
      JOIN drivers d ON rs.driver_id = d.id
      JOIN schools s ON rs.school_id = s.id
      WHERE rs.school_id = ?
    `;
    const params = [school_id];

    if (round) {
      query += " AND rs.round_name = ?";
      params.push(round);
    }

    if (driver_id) {
      query += " AND rs.driver_id = ?";
      params.push(driver_id);
    }

    query += " ORDER BY rs.round_name, rs.stop_order ASC";

    const [rows] = await db.query(query, params);

    if (rows.length === 0) return res.status(404).json({ message: "No stops found" });

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`stops_school_${school_id}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error exporting CSV" });
  }
});


export default router;
