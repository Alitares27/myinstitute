import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { pool } from "./models/db";
import users from "./routes/users";
import students from "./routes/students";
import teachers from "./routes/teachers";
import courses from "./routes/courses";
import enrollments from "./routes/enrollments";
import attendance from "./routes/attendance";
import grades from "./routes/grades";
import auth from "./routes/auth";
import dashboard from "./routes/dashboard";
import topicRoutes from "./routes/topics";
import templesRoutes from "./routes/temples";
import templeTripsRoutes from "./routes/templeTrips";
import tripReservationsRoutes from "./routes/tripReservations";

import speakersRoutes from "./routes/speakers";
import temasRoutes from "./routes/temas";


const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://gestionar-three.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", users);
app.use("/api/students", students);
app.use("/api/teachers", teachers);
app.use("/api/courses", courses);
app.use("/api/enrollments", enrollments);
app.use("/api/attendance", attendance);
app.use("/api/grades", grades);
app.use("/api", auth);
app.use("/api", dashboard);
app.use("/api/topics", topicRoutes);
app.use("/api/temples", templesRoutes);
app.use("/api/temple-trips", templeTripsRoutes);
app.use("/api/trip-reservations", tripReservationsRoutes);
app.use("/api/speakers", speakersRoutes);      
app.use("/api/temas", temasRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/test-topics", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM topics ORDER BY course_id, order_index ASC");
    res.json(result.rows);
  } catch(e: any) {
    res.json({ error: e.message });
  }
});

app.use("*", (req, res) => {
  res.status(404).json({ message: "Endpoint no encontrado" });
});

app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("❌ Error en Servidor:", err.stack);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error"
    });
  }
);

async function startServer() {
  try {
    const dbCheck = await pool.query("SELECT NOW()");
    console.log("✅ DB Conectada:", dbCheck.rows[0].now);

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`✅ CORS habilitado para institutoas-three.vercel.app`);
    });
  } catch (err) {
    console.error("❌ Error Crítico de DB:", err);
    process.exit(1);
  }
}

startServer();
