// import express from "express";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { db } from "../config/db.js";

// const router = express.Router();
// const JWT_SECRET = "supersecret";

// router.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const [rows] = await db.query("SELECT * FROM users WHERE username=?", [username]);
//   if (rows.length === 0) return res.status(400).json({ message: "User not found" });

//   const user = rows[0];
//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(400).json({ message: "Wrong password" });

//   const token = jwt.sign(
//     { id: user.id, role: user.role, school_id: user.school_id },
//     JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   res.json({ token, role: user.role, school_id: user.school_id });
// });

// export default router;

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

const router = express.Router();
const JWT_SECRET = "supersecret";

router.post("/login", async (req, res) => {
    console.log("Incoming body:", req.body);   // 👈 add this line

  try {
    // ✅ Prevent crash if req.body is missing
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // ✅ Query DB
    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [username]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = rows[0];

    // ✅ Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // ✅ Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role, school_id: user.school_id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role, school_id: user.school_id });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
