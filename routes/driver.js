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

export default router;
