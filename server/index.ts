import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import users from "./routes/users";
import students from "./routes/students";
import teachers from "./routes/teachers";
import courses from "./routes/courses";
import enrollments from "./routes/enrollments";
import attendance from "./routes/attendance";
import auth from "./routes/auth"; 
import dashboard from "./routes/dashboard";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", users);
app.use("/api/students", students);
app.use("/api/teachers", teachers);
app.use("/api/courses", courses);
app.use("/api/enrollments", enrollments);
app.use("/api/attendance", attendance);
app.use("/api", auth); 
app.use("/api", dashboard);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});