import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: ".env.test" });

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.claude/**",
    ],
  },
});
