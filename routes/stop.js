import express from "express";
import { db } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { Parser } from "json2csv";

const router = express.Router();

// Driver saves stops for a round
// router.post("/save_round", authMiddleware(["driver"]), async (req, res) => {
//   const { round_name, stops } = req.body;
//   const driver_id = req.user.id;
//   const school_id = req.user.school_id;

//   if (!round_name || !stops || !Array.isArray(stops)) {
//     return res.status(400).json({ message: "Invalid payload" });
//   }

//   try {
//     for (const stop of stops) {
//       await db.query(
//         "INSERT INTO round_stops (driver_id, school_id, round_name, stop_order, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
//         [driver_id, school_id, round_name, stop.order, stop.latitude, stop.longitude]
//       );
//     }
//     res.json({ success: true, message: "Stops saved successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error saving stops" });
//   }
// });
router.post("/save_round", authMiddleware(["driver"]), async (req, res) => {
  const { round_name, stops } = req.body;
  console.log("Incoming round:", round_name);
  console.log("Incoming stops:", JSON.stringify(stops, null, 2));  // 👈 add this
  const user_id = req.user.id;        // this is users.id
  const school_id = req.user.school_id;

  if (!round_name || !stops || !Array.isArray(stops)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    // 1. Get the driver's actual ID
    const [driverRows] = await db.query("SELECT id FROM drivers WHERE user_id=?", [user_id]);
    if (driverRows.length === 0) {
      return res.status(400).json({ message: "Driver profile not found" });
    }
    const driver_id = driverRows[0].id;

    // 2. Insert stops using driver_id
    for (const stop of stops) {
      await db.query(
        "INSERT INTO round_stops (driver_id, school_id, round_name, stop_order, latitude, longitude,placename) VALUES (?, ?, ?, ?, ?, ?,?)",
        [driver_id, school_id, round_name, stop.order, stop.latitude, stop.longitude,stop.placename  && stop.placename.trim() !== "" ? stop.placename : "Unknown Stop"
]
      );
    }

    res.json({ success: true, message: "Stops saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving stops" });
  }
});


// School admin fetches stops
router.get("/school", authMiddleware(["schooladmin"]), async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(
      `SELECT rs.id, rs.round_name, rs.stop_order, rs.latitude, rs.longitude,rs.placename,
              d.name AS driver_name, s.name AS school_name, rs.created_at
       FROM round_stops rs
       JOIN drivers d ON rs.driver_id = d.id
       JOIN schools s ON rs.school_id = s.id
       WHERE rs.school_id = ?
       ORDER BY rs.round_name, rs.stop_order ASC`,
      [school_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stops" });
  }
});

// Superadmin fetches all stops
router.get("/all", authMiddleware(["superadmin"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rs.id, rs.round_name, rs.stop_order, rs.latitude, rs.longitude,rs.placename,
              d.name AS driver_name, s.name AS school_name, rs.created_at
       FROM round_stops rs
       JOIN drivers d ON rs.driver_id = d.id
       JOIN schools s ON rs.school_id = s.id
       ORDER BY s.name, rs.round_name, rs.stop_order ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stops" });
  }
});

// School admin export stops to CSV
router.get("/export/school", authMiddleware(["schooladmin"]), async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(
      `SELECT rs.round_name, rs.stop_order, rs.latitude, rs.longitude,rs.placename,
              d.name AS driver_name, s.name AS school_name, rs.created_at
       FROM round_stops rs
       JOIN drivers d ON rs.driver_id = d.id
       JOIN schools s ON rs.school_id = s.id
       WHERE rs.school_id = ?
       ORDER BY rs.round_name, rs.stop_order ASC`,
      [school_id]
    );

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

// Export stops filtered by driver id and/or driver name
router.get("/export/filter", authMiddleware(["superadmin","schooladmin"]), async (req, res) => {
  const { driver_id, driver_name } = req.query;
  const role = req.user.role;
  const school_id = req.user.school_id;

  try {
    let query = `
      SELECT rs.round_name, rs.stop_order, rs.latitude, rs.longitude, rs.placename,
             d.name AS driver_name, s.name AS school_name, rs.created_at
      FROM round_stops rs
      JOIN drivers d ON rs.driver_id = d.id
      JOIN schools s ON rs.school_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (driver_id) {
      query += " AND rs.driver_id = ?";
      params.push(driver_id);
    }

    if (driver_name) {
      query += " AND d.name LIKE ?";
      params.push(`%${driver_name}%`);
    }

    if (role === "schooladmin") {
      query += " AND rs.school_id = ?";
      params.push(school_id);
    }

    query += " ORDER BY rs.round_name, rs.stop_order ASC";

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No stops found" });
    }

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("filtered_stops.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Error exporting filtered stops:", err);
    res.status(500).json({ message: "Error exporting filtered stops" });
  }
});


// Superadmin export all stops to CSV
router.get("/export/all", authMiddleware(["superadmin"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rs.round_name, rs.stop_order, rs.latitude, rs.longitude,rs.placename,
              d.name AS driver_name, s.name AS school_name, rs.created_at
       FROM round_stops rs
       JOIN drivers d ON rs.driver_id = d.id
       JOIN schools s ON rs.school_id = s.id
       ORDER BY s.name, rs.round_name, rs.stop_order ASC`
    );

    if (rows.length === 0) return res.status(404).json({ message: "No stops found" });

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`stops_all.csv`);
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error exporting CSV" });
  }
});

export default router;
