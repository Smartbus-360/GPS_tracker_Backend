import express from "express";
import { db } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware(["superadmin"]), async (req, res) => {
  const { name, address } = req.body;
  try {
    const [result] = await db.query("INSERT INTO schools (name, address) VALUES (?, ?)", [name, address]);
    res.json({ success: true, school_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Error creating school" });
  }
});

// router.get("/", authMiddleware(["superadmin"]), async (req, res) => {
//   const [rows] = await db.query("SELECT * FROM schools ORDER BY id DESC");
//   res.json(rows);
// });

// ✅ Unified route: superadmin → all schools, schooladmin → only their own school
router.get("/", authMiddleware(["superadmin", "schooladmin"]), async (req, res) => {
  const role = req.user.role;
  const school_id = req.user.school_id;

  try {
    let query = "SELECT * FROM schools";
    let params = [];

    // 🏫 If the logged-in user is a school admin, show only their school
    if (role === "schooladmin") {
      query += " WHERE id = ?";
      params.push(school_id);
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching schools" });
  }
});


router.put("/:id", authMiddleware(["superadmin"]), async (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;
  await db.query("UPDATE schools SET name=?, address=? WHERE id=?", [name, address, id]);
  res.json({ success: true });
});

router.delete("/:id", authMiddleware(["superadmin"]), async (req, res) => {
  await db.query("DELETE FROM schools WHERE id=?", [req.params.id]);
  res.json({ success: true });
});

export default router;
