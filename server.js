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
// app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/schooladmins", schoolAdminRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/stops", stopRoutes);







app.listen(5001,"0.0.0.0" ,() => console.log("🚀 Server running on port 5001"));
