import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/short-item/" : "/",
  server: {
    port: 3001,
    host: true,
  },
});
