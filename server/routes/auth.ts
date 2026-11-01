import { asyncRouter } from "../middleware/asyncRouter";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { pool } from "../models/db";
const router = asyncRouter();
router.post("/logout", verifyToken, async (req: AuthRequest, res) => {
  await pool.query("UPDATE users SET auth_version=auth_version+1 WHERE id=$1", [req.user!.id]);
  res.json({ message: "Todas las sesiones de la cuenta se cerraron correctamente" });
});
export default router;
