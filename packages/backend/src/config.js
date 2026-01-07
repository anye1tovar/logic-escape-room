const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: process.env.PORT || 4000,
  databaseFile: process.env.DATABASE_FILE || "./data/bookings.sqlite",
  auth: {
    secret: process.env.AUTH_SECRET || "dev-secret-change-me",
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 8 * 60 * 60),
  },
};
