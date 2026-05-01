// src/app.ts
//
// Este archivo CREA y CONFIGURA la app de Fastify, pero NO la arranca.
// Separarlo así permite que los tests importen buildApp() sin abrir
// ningún puerto real — fastify.inject() simulará los requests.

import Fastify from "fastify";
import { getStatementData } from "./services/dbService.js";
import { generateStatementPDF } from "./services/pdfService.js";
import { type Lang } from "./utils/translations.js";
import { logApiRequest } from "./services/logService.js";

interface IReporteQuery {
  userId: string;
  start: string;
  end: string;
  lang: Lang;
}

const reportSchema = {
  queryString: {
    type: "object",
    required: ["userId", "start", "end"],
    properties: {
      userId: { type: "string" },
      start: { type: "string", format: "date" },
      end: { type: "string", format: "date" },
      lang: { type: "string", enum: ["es", "en", "pt"], default: "es" },
    },
  },
};

// buildApp() devuelve la instancia de Fastify lista para usar.
// Los tests llaman esta función. server.ts también la llama y después hace listen().
export function buildApp() {
  const fastify = Fastify({ logger: false }); // logger: false → no ensucia la salida del test

  fastify.get<{ Querystring: IReporteQuery }>(
    "/api/reporte",
    {
      schema: { querystring: reportSchema.queryString },

      preHandler: async (request, reply) => {
        const clientKey = request.headers["x-api-key"];
        const serverKey = process.env.API_KEY;

        if (!clientKey || clientKey !== serverKey) {
          return reply.status(401).send({
            error: "Acceso denegado. Credenciales inválidas.",
          });
        }

        const isIpCheckEnabled = process.env.ENABLE_IP_WHITELIST === "true";
        if (isIpCheckEnabled) {
          const ipsPermitidas = (process.env.ALLOWED_IPS || "").split(",");
          if (!ipsPermitidas.includes(request.ip)) {
            return reply.status(403).send({ error: "IP no autorizada." });
          }
        }
      },
    },

    async (request, reply) => {
      const startTime = Date.now();
      const { userId, start, end, lang } = request.query;
      const ipAddress = request.ip ?? null;

      const sendAndLog = (statusCode: number, errorMessage: string | null) => {
        const durationMs = Date.now() - startTime;
        void logApiRequest({
          userId,
          startDate: start,
          endDate: end,
          lang,
          statusCode,
          errorMessage,
          ipAddress,
          durationMs,
        });
      };

      if (new Date(start) > new Date(end)) {
        sendAndLog(400, "La fecha de inicio no puede ser posterior al fin.");
        return reply
          .status(400)
          .send({ error: "La fecha de inicio no puede ser posterior al fin." });
      }

      try {
        const { user, transactions } = await getStatementData(
          userId,
          start,
          end,
        );
        sendAndLog(200, null);
        generateStatementPDF(reply, user, transactions, start, end, lang);
        return reply;
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message === "USUARIO_NO_ENCONTRADO"
        ) {
          sendAndLog(404, "Usuario no encontrado");
          return reply.status(404).send({ error: "Usuario no encontrado" });
        }
        const msg =
          error instanceof Error ? error.message : "Error desconocido";
        sendAndLog(500, msg);
        fastify.log.error(error);
        return reply.status(500).send({ error: "Error interno del servidor" });
      }
    },
  );

  return fastify;
}
