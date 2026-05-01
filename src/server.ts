// src/server.ts
//
// Punto de entrada de la app en producción.
// Solo se encarga de arrancar el servidor en el puerto 3000.
// Toda la lógica de rutas vive en app.ts.

import "dotenv/config";
import { buildApp } from "./app.js";

const fastify = buildApp();

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
