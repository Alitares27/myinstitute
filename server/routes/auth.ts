import { asyncRouter } from "../middleware/asyncRouter";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";
import { pool } from "../models/db";
const router = asyncRouter();
router.get("/auth/me", verifyToken, (req: AuthRequest, res) => {
  const { id, role, permissions, tokenVersion } = req.user!;
  res.json({ id, role, permissions, tokenVersion });
});
router.get("/security-events", verifyToken, isAdmin, async (_req, res) => {
  const result = await pool.query(`SELECT id, occurred_at, actor_id, target_id, action, outcome, module
    FROM security_events ORDER BY id DESC LIMIT 100`);
  res.json(result.rows);
});
router.post("/logout", verifyToken, async (req: AuthRequest, res) => {
  await pool.query("UPDATE users SET token_version=token_version+1 WHERE id=$1", [req.user!.id]);
  res.json({ message: "Todas las sesiones de la cuenta se cerraron correctamente" });
});
export default router;
