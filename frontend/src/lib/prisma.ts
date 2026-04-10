import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize the Prisma client.");
}

const parseCertificate = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return value.replace(/\\r\\n/g, "\n").replace(/\\n\s?/g, "\n").trim();
};

const caCert = parseCertificate(process.env.DATABASE_CA_CERT);
const allowInsecureTls =
  process.env.DATABASE_ALLOW_INSECURE_TLS === "true" || process.env.NODE_ENV !== "production";

const sslOptions =
  caCert || allowInsecureTls
    ? {
        rejectUnauthorized: !allowInsecureTls,
        ...(caCert ? { ca: caCert } : {}),
      }
    : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslOptions,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

export { prisma };
