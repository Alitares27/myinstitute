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

const allowedOrigins = [
  "http://localhost:5173", 
  "https://myinstitute-1.onrender.com" 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use("/api/users", users);
app.use("/api/students", students);
app.use("/api/teachers", teachers);
app.use("/api/courses", courses);
app.use("/api/enrollments", enrollments);
app.use("/api/attendance", attendance);
app.use("/api/grades", grades);        
app.use("/api", auth);
app.use("/api", dashboard);


app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("❌ Error en el servidor:", err.stack);
    res.status(500).json({ 
      message: "Internal Server Error", 
      detail: process.env.NODE_ENV === 'development' ? err.message : "Error interno" 
    });
  }
);


const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Conexión a Base de Datos exitosa:", res.rows[0].now);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor listo en el puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error crítico: No se pudo conectar a la DB", err);
    process.exit(1);
  }
}

startServer();