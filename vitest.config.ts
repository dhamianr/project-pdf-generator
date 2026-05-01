// vitest.config.ts
//
// Configuración de Vitest.
// envFiles le dice a Vitest qué archivos de variables de entorno cargar
// antes de correr los tests — en este caso .env.test en la raíz del proyecto.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    envFiles: [".env.test"],
  },
});
