const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: String(process.env.DATABASE_SSL || "").toLowerCase() === "true",
  auth: {
    secret: process.env.AUTH_SECRET || "dev-secret-change-me",
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 8 * 60 * 60),
  },
};
