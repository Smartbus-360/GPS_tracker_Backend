import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import schoolRoutes from "./routes/school.js";
import schoolAdminRoutes from "./routes/schoolAdmins.js";
import driverRoutes from "./routes/driver.js";
import stopRoutes from "./routes/stop.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/schooladmins", schoolAdminRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/stops", stopRoutes);


// // 🔍 Debug: list all registered routes safely
// app._router.stack.forEach(r => {
//   try {
//     if (r.route && r.route.path) {
//       console.log("Route:", r.route.path);
//     } else if (r.name === "router" && r.handle && Array.isArray(r.handle.stack)) {
//       r.handle.stack.forEach(handler => {
//         if (handler.route) {
//           console.log("Subroute:", handler.route.path);
//         }
//       });
//     }
//   } catch (err) {
//     console.log("Skipping a middleware layer");
//   }
// });




app.listen(5001, () => console.log("🚀 Server running on port 5001"));
