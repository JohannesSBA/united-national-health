import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    env: {
      NEXT_PUBLIC_E2E: "1",
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
});
