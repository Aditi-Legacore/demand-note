import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  engine: "classic",                 // use classic engine
  schema: "prisma/schema.prisma",    // path to your schema
  datasource: {
    url: env("DATABASE_URL"),        // loads URL from .env
  },
});
