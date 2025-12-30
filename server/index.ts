import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://intitutoas-three.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200
}));

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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("❌ Error en Servidor:", err.stack);
    res.status(err.status || 500).json({ 
      message: err.message || "Internal Server Error"
    });
  }
);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const dbCheck = await pool.query("SELECT NOW()");
    console.log("✅ DB Conectada:", dbCheck.rows[0].now);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor listo en puerto ${PORT}`);
      console.log(`📡 CORS activo para: https://myinstitute-three.vercel.app`);
    });
  } catch (err) {
    console.error("❌ Error Crítico de DB:", err);
    process.exit(1);
  }
}

startServer();