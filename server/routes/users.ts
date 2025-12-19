import express, { Response } from "express";
import { pool } from "../models/db";
import { registerUser, loginUser } from "../controllers/users";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, telefono, role FROM users WHERE id = $1",
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo usuario" });
  }
});

router.get("/", verifyToken, isAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, telefono, role FROM users ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, telefono, role } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           telefono = COALESCE($3, telefono),
           role = COALESCE($4, role)
       WHERE id = $5
       RETURNING id, name, email, telefono, role`,
      [name, email, telefono, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error actualizando usuario" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error eliminando usuario" });
  }
});

export default router;