import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

const router = express.Router();
const JWT_SECRET = "supersecret";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query("SELECT * FROM users WHERE username=?", [username]);
  if (rows.length === 0) return res.status(400).json({ message: "User not found" });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, role: user.role, school_id: user.school_id },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, role: user.role, school_id: user.school_id });
});

export default router;
