import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  // schema: "prisma/schema.prisma",    // path to your schema
  schema : "postgresql",
  datasource: {
    url: env("DATABASE_URL"),        // loads URL from .env
  },
});
