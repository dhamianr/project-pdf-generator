import "dotenv/config";
import Fastify from "fastify";
import { getStatementData } from "./services/dbService.js";
import { generateStatementPDF } from "./services/pdfService.js";
import { type Lang } from "./utils/translations.js";

const fastify = Fastify({
  logger: true,
});

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
    const { userId, start, end, lang } = request.query;

    if (new Date(start) > new Date(end)) {
      return reply
        .status(400)
        .send({ error: "La fecha de inicio no puede ser posterior al fin." });
    }

    try {
      const { user, transactions } = await getStatementData(userId, start, end);

      generateStatementPDF(reply, user, transactions, start, end, lang);

      return reply;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "USUARIO_NO_ENCONTRADO") {
        return reply.status(404).send({ error: "Usuario no encontrado" });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: "Error interno del servidor" });
    }
  },
);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Servidor Fastify corriendo en http://localhost:3000 🚀");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
