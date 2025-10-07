import express from "express";
import bcrypt from "bcrypt";
import { db } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create a driver (School admin only)
router.post("/", authMiddleware(["schooladmin"]), async (req, res) => {
  const { name, username, password } = req.body;
  const school_id = req.user.school_id;

  try {
    const hashed = await bcrypt.hash(password, 10);

    // Create user account
    const [userResult] = await db.query(
      "INSERT INTO users (username, password, role, school_id) VALUES (?, ?, 'driver', ?)",
      [username, hashed, school_id]
    );

    // Create driver profile
    await db.query(
      "INSERT INTO drivers (name, school_id, user_id) VALUES (?, ?, ?)",
      [name, school_id, userResult.insertId]
    );

    res.json({ success: true, message: "Driver created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating driver" });
  }
});

// Get all drivers for logged-in school admin
router.get("/", authMiddleware(["schooladmin"]), async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(
      `SELECT d.id, d.name, u.username, u.role, d.created_at
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.school_id = ?`,
      [school_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching drivers" });
  }
});

// ✅ Get all drivers (superadmin = all drivers, schooladmin = only their school's drivers)
router.get("/", authMiddleware(["superadmin", "schooladmin"]), async (req, res) => {
  const role = req.user.role;
  const school_id = req.user.school_id;

  try {
    let query = `
      SELECT d.id, d.name, u.username, u.role, s.name AS school_name, d.created_at
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN schools s ON d.school_id = s.id
    `;
    const params = [];

    // Restrict schooladmin to their own school
    if (role === "schooladmin") {
      query += " WHERE d.school_id = ?";
      params.push(school_id);
    }

    query += " ORDER BY d.id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching drivers" });
  }
});


// Update driver details
router.put("/:id", authMiddleware(["schooladmin"]), async (req, res) => {
  const { id } = req.params;
  const { name, password } = req.body;
  const school_id = req.user.school_id;

  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE users u JOIN drivers d ON u.id = d.user_id SET u.password=? WHERE d.id=? AND d.school_id=?",
        [hashed, id, school_id]
      );
    }
    if (name) {
      await db.query(
        "UPDATE drivers SET name=? WHERE id=? AND school_id=?",
        [name, id, school_id]
      );
    }

    res.json({ success: true, message: "Driver updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating driver" });
  }
});

// Delete driver (and linked user)
router.delete("/:id", authMiddleware(["schooladmin"]), async (req, res) => {
  const { id } = req.params;
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(
      "SELECT user_id FROM drivers WHERE id=? AND school_id=?",
      [id, school_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Driver not found" });

    const user_id = rows[0].user_id;

    await db.query("DELETE FROM drivers WHERE id=? AND school_id=?", [id, school_id]);
    await db.query("DELETE FROM users WHERE id=?", [user_id]);

    res.json({ success: true, message: "Driver deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting driver" });
  }
});

// Fetch stops by driver id
router.get("/by-driver/:driverId", authMiddleware(["schooladmin","superadmin"]), async (req, res) => {
  const { driverId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT rs.id, rs.round_name, rs.stop_order, rs.latitude, rs.longitude, rs.placename,
              d.name AS driver_name, s.name AS school_name, rs.created_at
       FROM round_stops rs
       JOIN drivers d ON rs.driver_id = d.id
       JOIN schools s ON rs.school_id = s.id
       WHERE rs.driver_id = ?
       ORDER BY rs.round_name, rs.stop_order ASC`,
      [driverId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stops by driver" });
  }
});

// Fetch driver by ID (superadmin or schooladmin)
router.get("/:id", authMiddleware(["superadmin","schooladmin"]), async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;
  const school_id = req.user.school_id;

  try {
    let query = `
      SELECT d.id, d.name, u.username, u.role, s.name AS school_name, d.created_at
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN schools s ON d.school_id = s.id
      WHERE d.id = ?
    `;
    let params = [id];

    if (role === "schooladmin") {
      query += " AND d.school_id = ?";
      params.push(school_id);
    }

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching driver" });
  }
});

// Fetch stops by driver id (superadmin or schooladmin)
router.get("/:id/stops", authMiddleware(["superadmin","schooladmin"]), async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;
  const school_id = req.user.school_id;

  try {
    let query = `
      SELECT rs.id, rs.round_name, rs.stop_order, rs.latitude, rs.longitude, rs.placename,
             d.name AS driver_name, s.name AS school_name, rs.created_at
      FROM round_stops rs
      JOIN drivers d ON rs.driver_id = d.id
      JOIN schools s ON rs.school_id = s.id
      WHERE rs.driver_id = ?
    `;
    let params = [id];

    if (role === "schooladmin") {
      query += " AND rs.school_id = ?";
      params.push(school_id);
    }

    query += " ORDER BY rs.round_name, rs.stop_order ASC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stops by driver" });
  }
});

// routes/driver.js
router.get("/all", authMiddleware(["superadmin"]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.name, u.username, u.role, s.name AS school_name, u.created_at
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN schools s ON d.school_id = s.id
      ORDER BY d.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching all drivers" });
  }
});


export default router;
