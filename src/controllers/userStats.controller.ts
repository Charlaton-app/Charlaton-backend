import { Request, Response } from "express";

/**
 * Dev‑friendly, low‑cost version of the user statistics endpoint.
 *
 * El objetivo ahora NO es calcular estadísticas reales (porque eso
 * dispara muchas lecturas de Firestore), sino devolver datos
 * ficticios/estáticos para que el dashboard siga funcionando
 * sin consumir cuota.
 *
 * Mantiene la misma forma de respuesta que antes para no romper
 * el frontend:
 *
 * {
 *   meetingsThisMonth: number;
 *   totalDuration: string;        // Ej: "0min"
 *   totalDurationMinutes: number; // Ej: 0
 *   activeContacts: number;
 * }
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Datos ficticios / por defecto.
    // Si quieres “simular” más actividad, puedes cambiar estos valores.
    const fakeStats = {
      meetingsThisMonth: 0,
      totalDuration: "0min",
      totalDurationMinutes: 0,
      activeContacts: 0,
    };

    res.json(fakeStats);
  } catch (error) {
    console.error("[USER-STATS] Error fetching user stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

