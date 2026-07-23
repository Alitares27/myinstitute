import { Request, Response } from "express";
import { pool } from "../models/db";

export async function getMeetings(req: Request, res: Response) {
    try {
        const result = await pool.query(`
            SELECT
                m.*,
                u.name AS created_by_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', us.id,
                                'name', us.name,
                                'email', us.email,
                                'role', us.role,
                                'status', ma.status
                            )
                        )
                        FROM meeting_attendees ma
                        JOIN users us ON us.id = ma.user_id
                        WHERE ma.meeting_id = m.id
                    ),
                    '[]'::json
                ) AS attendees
            FROM meetings m
            LEFT JOIN users u ON u.id = m.created_by
            ORDER BY
                m.meeting_date DESC,
                m.start_time DESC
        `);

        res.json(result.rows);

    } catch (err: any) {
        console.error("Error en getMeetings:", err.message);
        res.status(500).json({
            message: "Error obteniendo consejos"
        });
    }
}

export async function getMeeting(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                m.*,
                u.name AS created_by_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', us.id,
                                'name', us.name,
                                'email', us.email,
                                'role', us.role,
                                'status', ma.status
                            )
                        )
                        FROM meeting_attendees ma
                        JOIN users us ON us.id = ma.user_id
                        WHERE ma.meeting_id = m.id
                    ),
                    '[]'::json
                ) AS attendees
            FROM meetings m
            LEFT JOIN users u ON u.id = m.created_by
            WHERE m.id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Consejo no encontrado"
            });
        }

        res.json(result.rows[0]);

    } catch (err: any) {
        console.error("Error en getMeeting:", err.message);
        res.status(500).json({
            message: "Error obteniendo consejo"
        });
    }
}

export async function createMeeting(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const {
            title,
            meeting_date,
            start_time,
            end_time,
            topics,
            notes,
            status,
            attendees
        } = req.body;

        const authReq = req as any;
        const created_by = authReq.user?.id;

        if (!created_by) {
            return res.status(401).json({ message: "Usuario no autenticado" });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "El título es obligatorio" });
        }

        if (!meeting_date) {
            return res.status(400).json({ message: "La fecha es obligatoria" });
        }

        if (!start_time) {
            return res.status(400).json({ message: "La hora de inicio es obligatoria" });
        }

        if (!topics || !topics.trim()) {
            return res.status(400).json({ message: "Los temas son obligatorios" });
        }

        await client.query("BEGIN");

        const meeting = await client.query(
            `
            INSERT INTO meetings
            (
                title,
                meeting_date,
                start_time,
                end_time,
                topics,
                notes,
                status,
                created_by
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            `,
            [
                title.trim(),
                meeting_date,
                start_time,
                end_time || null,
                topics,
                notes || null,
                status || "scheduled",
                created_by
            ]
        );

        const meetingId = meeting.rows[0].id;

        if (Array.isArray(attendees)) {
            for (const item of attendees) {
                const userId = typeof item === "number" ? item : item.id;

                await client.query(
                    `
                    INSERT INTO meeting_attendees
                    (
                        meeting_id,
                        user_id,
                        status
                    )
                    VALUES
                    ($1,$2,$3)
                    `,
                    [
                        meetingId,
                        userId,
                        item.status || "pending"
                    ]
                );
            }
        }

        await client.query("COMMIT");

        res.status(201).json(meeting.rows[0]);

    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error en createMeeting:", err.message);
        res.status(500).json({
            message: "Error creando consejo"
        });
    } finally {
        client.release();
    }
}

export async function updateMeeting(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const {
            title,
            meeting_date,
            start_time,
            end_time,
            topics,
            notes,
            status,
            attendees
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "El título es obligatorio" });
        }

        if (!meeting_date) {
            return res.status(400).json({ message: "La fecha es obligatoria" });
        }

        if (!start_time) {
            return res.status(400).json({ message: "La hora de inicio es obligatoria" });
        }

        if (!topics || !topics.trim()) {
            return res.status(400).json({ message: "Los temas son obligatorios" });
        }

        await client.query("BEGIN");

        await client.query(
            `
            UPDATE meetings
            SET
                title=$1,
                meeting_date=$2,
                start_time=$3,
                end_time=$4,
                topics=$5,
                notes=$6,
                status=$7
            WHERE id=$8
            `,
            [
                title,
                meeting_date,
                start_time,
                end_time || null,
                topics,
                notes || null,
                status || "scheduled",
                id
            ]
        );

        await client.query(
            `
            DELETE FROM meeting_attendees
            WHERE meeting_id=$1
            `,
            [id]
        );

        if (Array.isArray(attendees)) {
            for (const item of attendees) {
                const userId = typeof item === "number" ? item : item.id;

                await client.query(
                    `
                    INSERT INTO meeting_attendees
                    (
                        meeting_id,
                        user_id,
                        status
                    )
                    VALUES
                    ($1,$2,$3)
                    `,
                    [
                        id,
                        userId,
                        item.status || "pending"
                    ]
                );
            }
        }

        await client.query("COMMIT");

        res.json({
            message: "Consejo actualizado"
        });

    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error en updateMeeting:", err.message);
        res.status(500).json({
            message: "Error actualizando consejo"
        });
    } finally {
        client.release();
    }
}

export async function deleteMeeting(req: Request, res: Response) {
    try {
        await pool.query(
            `
            DELETE FROM meetings
            WHERE id=$1
            `,
            [req.params.id]
        );

        res.json({
            message: "Consejo eliminado"
        });

    } catch (err: any) {
        console.error("Error en deleteMeeting:", err.message);
        res.status(500).json({
            message: "Error eliminando consejo"
        });
    }
}